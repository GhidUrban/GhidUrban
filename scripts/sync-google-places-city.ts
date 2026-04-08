import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

type PlaceRow = {
  id: string;
  name: string;
  address: string | null;
  city_slug: string;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
};

type GooglePhoto = {
  name?: string;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  photos?: GooglePhoto[];
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_MAPS_API_KEY) {
  throw new Error("Missing required env vars.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function slugToCityName(citySlug: string): string {
  const map: Record<string, string> = {
    "baia-mare": "Baia Mare",
  };
  return map[citySlug] ?? citySlug.replace(/-/g, " ");
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlapScore(a: string, b: string): number {
  const aTokens = new Set(normalizeText(a).split(" ").filter(Boolean));
  const bTokens = new Set(normalizeText(b).split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let common = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) common++;
  }

  return common / Math.max(aTokens.size, bTokens.size);
}

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreCandidate(dbPlace: PlaceRow, candidate: GooglePlace): number {
  let score = 0;

  const googleName = candidate.displayName?.text ?? "";
  const googleAddress = candidate.formattedAddress ?? "";

  const nameScore = tokenOverlapScore(dbPlace.name, googleName);
  score += nameScore * 70;

  if (dbPlace.address) {
    const addressScore = tokenOverlapScore(dbPlace.address, googleAddress);
    score += addressScore * 20;
  }

  if (
    dbPlace.latitude != null &&
    dbPlace.longitude != null &&
    candidate.location?.latitude != null &&
    candidate.location?.longitude != null
  ) {
    const km = distanceKm(
      dbPlace.latitude,
      dbPlace.longitude,
      candidate.location.latitude,
      candidate.location.longitude,
    );

    if (km <= 0.15) score += 15;
    else if (km <= 0.5) score += 10;
    else if (km <= 1) score += 5;
    else if (km > 5) score -= 20;
  }

  return score;
}

async function searchGooglePlace(
  dbPlace: PlaceRow,
): Promise<GooglePlace | null> {
  const cityName = slugToCityName(dbPlace.city_slug);
  const query = [dbPlace.name, dbPlace.address, cityName, "Romania"]
    .filter(Boolean)
    .join(", ");

  const body: Record<string, unknown> = {
    textQuery: query,
    pageSize: 5,
    languageCode: "ro",
    regionCode: "RO",
  };

  if (dbPlace.latitude != null && dbPlace.longitude != null) {
    body.locationBias = {
      circle: {
        center: {
          latitude: dbPlace.latitude,
          longitude: dbPlace.longitude,
        },
        radius: 500.0,
      },
    };
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.photos",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Text Search failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as { places?: GooglePlace[] };
  const candidates = json.places ?? [];
  if (candidates.length === 0) return null;

  let best: GooglePlace | null = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const score = scoreCandidate(dbPlace, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best) return null;

  (best as GooglePlace & { _matchScore?: number })._matchScore = bestScore;
  return best;
}

async function resolvePhotoUri(photoName: string): Promise<string | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=900&skipHttpRedirect=true`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Photo fetch failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as { photoUri?: string };
  return json.photoUri ?? null;
}

async function syncCity(citySlug: string) {
  const { data: places, error } = await supabase
    .from("places")
    .select("id,name,address,city_slug,latitude,longitude,image")
    .eq("city_slug", citySlug)
    .order("name", { ascending: true });

  if (error) throw error;
  if (!places?.length) {
    console.log(`No places found for city: ${citySlug}`);
    return;
  }

  for (const place of places as PlaceRow[]) {
    try {
      console.log(`Searching Google for: ${place.name}`);

      const best = await searchGooglePlace(place);

      if (!best) {
        await supabase
          .from("places")
          .update({
            google_match_status: "review",
            google_match_score: 0,
            google_last_synced_at: new Date().toISOString(),
          })
          .eq("id", place.id);

        console.log(`No candidate found for ${place.name}`);
        continue;
      }

      const matchScore =
        (best as GooglePlace & { _matchScore?: number })._matchScore ?? 0;
      const photoName = best.photos?.[0]?.name ?? null;
      const photoUri = photoName ? await resolvePhotoUri(photoName) : null;

      // High confidence only -> matched; everything else -> review. Never set rejected here.
      const status = matchScore >= 75 ? "matched" : "review";
      await supabase
        .from("places")
        .update({
          google_place_id: best.id ?? null,
          google_maps_uri: best.googleMapsUri ?? null,
          google_photo_name: photoName,
          google_photo_uri: photoUri,
          google_match_score: matchScore,
          google_match_status: status,
          google_last_synced_at: new Date().toISOString(),
        })
        .eq("id", place.id);

      console.log(
        `Saved ${place.name} -> ${best.displayName?.text ?? "unknown"} | score=${matchScore.toFixed(1)} | status=${status}`,
      );
    } catch (err) {
      console.error(`Failed for ${place.name}:`, err);
    }
  }
}

const citySlug = process.argv[2] ?? "baia-mare";

syncCity(citySlug)
  .then(() => {
    console.log("Sync complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
