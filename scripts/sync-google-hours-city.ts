import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

type PlaceGoogleRow = {
  place_id: string;
  city_slug: string;
  category_slug: string;
  google_place_id: string;
};

type OpeningHours = {
  openNow?: boolean;
  weekdayDescriptions?: string[];
  periods?: unknown[];
};

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  regularOpeningHours?: OpeningHours;
  currentOpeningHours?: OpeningHours;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

const REQUEST_DELAY_MS = 250;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_MAPS_API_KEY) {
  throw new Error("Missing required env vars.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Places API v1 expects path segment `places/{id}`; DB may store `places/ChIJ…` or `ChIJ…`. */
function placeDetailsUrl(googlePlaceId: string): string {
  let id = googlePlaceId.trim();
  if (id.startsWith("places/")) {
    id = id.slice("places/".length);
  }
  return `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;
}

function hoursTextFromBlock(h: OpeningHours | undefined): string | null {
  if (!h) return null;
  const lines = h.weekdayDescriptions;
  if (lines && lines.length > 0) {
    return lines.slice(0, 2).join(" · ");
  }
  if (typeof h.openNow === "boolean") {
    return h.openNow ? "Deschis acum" : "Închis acum";
  }
  return null;
}

/** Prefer current for UI text, else regular. */
function buildGoogleHoursText(
  current: OpeningHours | undefined,
  regular: OpeningHours | undefined,
): string | null {
  return hoursTextFromBlock(current) ?? hoursTextFromBlock(regular) ?? null;
}

/** Prefer currentOpeningHours for raw, else regularOpeningHours (same as fetch fallback). */
function pickHoursRaw(details: PlaceDetailsResponse): OpeningHours | null {
  return details.currentOpeningHours ?? details.regularOpeningHours ?? null;
}

async function fetchPlaceDetails(
  googlePlaceId: string,
): Promise<PlaceDetailsResponse> {
  const url = placeDetailsUrl(googlePlaceId);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask":
        "id,displayName,regularOpeningHours,currentOpeningHours",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Place Details failed: ${response.status} ${text}`);
  }

  return (await response.json()) as PlaceDetailsResponse;
}

function parseLimit(argv: string[]): number | null {
  const arg = argv.find((a) => a.startsWith("--limit="));
  if (!arg) return null;
  const n = Number.parseInt(arg.split("=")[1] ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function syncHoursForCity(citySlug: string, limit: number | null) {
  let query = supabase
    .from("place_google_data")
    .select("place_id,city_slug,category_slug,google_place_id")
    .eq("city_slug", citySlug)
    .eq("google_match_status", "matched")
    .not("google_place_id", "is", null)
    .neq("google_place_id", "")
    .is("google_hours_raw", null)
    .order("place_id", { ascending: true });

  if (limit != null) {
    query = query.limit(limit);
  }

  const { data: googleRows, error } = await query;

  if (error) throw error;
  if (!googleRows?.length) {
    console.log(
      `No places to process for ${citySlug} (matched + google_place_id set + google_hours_raw null).`,
    );
    return;
  }

  const placeIds = googleRows.map((r: Record<string, unknown>) => r.place_id as string);
  const { data: placeNames } = await supabase
    .from("places").select("place_id,name").in("place_id", placeIds);
  const nameMap = new Map<string, string>();
  for (const p of placeNames ?? []) {
    nameMap.set((p as { place_id: string }).place_id, (p as { name: string }).name);
  }

  console.log(
    `Found ${googleRows.length} place(s) for ${citySlug} (matched, has place id, no hours yet).`,
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of googleRows) {
    const r = row as { place_id: string; city_slug: string; category_slug: string; google_place_id: string };
    const placeName = nameMap.get(r.place_id) ?? r.place_id;
    const gid = r.google_place_id?.trim() ?? "";
    if (!gid) {
      console.log(`Skip ${placeName}: empty google_place_id`);
      skipped++;
      continue;
    }

    try {
      console.log(`Fetching hours: ${placeName} (${gid})`);

      const details = await fetchPlaceDetails(gid);

      const rawBlock = pickHoursRaw(details);
      if (!rawBlock) {
        console.log(`No opening hours from Google for ${placeName} — skip`);
        skipped++;
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const text =
        buildGoogleHoursText(
          details.currentOpeningHours,
          details.regularOpeningHours,
        ) ?? "Program disponibil";

      const { error: upErr } = await supabase
        .from("place_google_data")
        .update({
          google_hours_raw: rawBlock as unknown as Record<string, unknown>,
          google_hours_text: text,
          synced_at: new Date().toISOString(),
        })
        .eq("place_id", r.place_id)
        .eq("city_slug", r.city_slug)
        .eq("category_slug", r.category_slug);

      if (upErr) {
        throw upErr;
      }

      console.log(`Saved hours for ${placeName} | text="${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`);
      ok++;
    } catch (err) {
      console.error(`Failed for ${placeName}:`, err);
      failed++;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Done. updated=${ok} skipped=${skipped} failed=${failed}`);
}

const argv = process.argv.slice(2);
const limit = parseLimit(argv);
const citySlug =
  argv.find((a) => !a.startsWith("--")) ?? "baia-mare";

syncHoursForCity(citySlug, limit)
  .then(() => {
    console.log("Sync complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
