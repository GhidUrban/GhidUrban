import { NextRequest, NextResponse } from "next/server";
import {
    IMPORT_CATEGORY_OSM_FILTERS,
    overpassLinesForFilter,
} from "@/lib/import-categories";
import { resolveCityCenterCoordinates } from "@/lib/place-repository";
import { supabase } from "@/lib/supabase/client";

const ALLOWED_LIMITS = [20, 50, 100] as const;
/** Metri față de centrul orașului (OSM). */
const SEARCH_RADIUS_M = 12000;

function parseResultLimit(raw: unknown): number {
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : Number.parseInt(String(raw ?? ""), 10);
  if (ALLOWED_LIMITS.includes(n as (typeof ALLOWED_LIMITS)[number])) {
    return n;
  }
  return 50;
}

function latitudeLongitudeFromOverpassElement(el: {
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
}): { latitude: number | null; longitude: number | null } {
  if (el.type === "node") {
    const la = el.lat != null ? Number(el.lat) : NaN;
    const lo = el.lon != null ? Number(el.lon) : NaN;
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      return { latitude: la, longitude: lo };
    }
    return { latitude: null, longitude: null };
  }
  const c = el.center;
  if (c != null && c.lat != null && c.lon != null) {
    const la = Number(c.lat);
    const lo = Number(c.lon);
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      return { latitude: la, longitude: lo };
    }
  }
  return { latitude: null, longitude: null };
}

function computeCompletenessScore(row: {
  address: string;
  phone: string;
  website: string;
  schedule: string;
  maps_url: string;
}): number {
  let s = 0;
  if (row.address?.trim()) s += 3;
  if (row.phone?.trim()) s += 2;
  if (row.website?.trim()) s += 2;
  if (row.schedule?.trim()) s += 2;
  if (row.maps_url?.trim()) s += 1;
  return s;
}

/** Doar Overpass/OSM — fără apel Places/Google ca fallback. */
export async function POST(req: NextRequest) {
  console.log("[import] source = osm");
  try {
    const body = await req.json();
    const { city_slug, category_slug } = body;
    const result_limit = parseResultLimit(body.result_limit);

    // Mai mulți candidați din OSM înainte de sortare (out center taie la sursă).
    const fetchCap = Math.min(Math.max(result_limit * 8, 300), 900);

    console.log("Import search incoming city_slug:", city_slug);
    console.log("Import search incoming category_slug:", category_slug);
    console.log(
      "Import search result_limit:",
      result_limit,
      "fetchCap:",
      fetchCap,
      "radius_m:",
      SEARCH_RADIUS_M
    );

    if (!city_slug || !category_slug) {
      return NextResponse.json(
        { success: false, message: "Missing city or category" },
        { status: 400 }
      );
    }

    if (category_slug === "evenimente") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Categoria „evenimente” nu este suportată de importul OSM — datele nu sunt suficient de fiabile pentru această categorie.",
          data: null,
        },
        { status: 400 }
      );
    }

    const city = await resolveCityCenterCoordinates(city_slug);
    const osmFilters = IMPORT_CATEGORY_OSM_FILTERS[category_slug];

    if (!city || !osmFilters?.length) {
      return NextResponse.json(
        {
          success: false,
          message: city
            ? "Invalid category"
            : "Oraș invalid sau fără coordonate (setează latitude/longitude în admin).",
        },
        { status: 400 }
      );
    }

    const queryParts: string[] = [];
    for (const filter of osmFilters) {
      const lines = overpassLinesForFilter(
        filter,
        SEARCH_RADIUS_M,
        city.lat,
        city.lon
      );
      queryParts.push(...lines);
    }

    const query = `
      [out:json];
      (
${queryParts.join("\n")}
      );
      out center ${fetchCap};
    `;

    console.log("Import search Overpass query:", query.trim());

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    console.log("Import search Overpass response.status:", response.status);
    console.log("Import search Overpass response.ok:", response.ok);

    const raw = await response.text();
    console.log("Import search Overpass raw (first 500 chars):", raw.slice(0, 500));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Overpass request failed",
          status: response.status,
          data: raw.slice(0, 500),
        },
        { status: 502 }
      );
    }

    let data: { elements?: unknown };
    try {
      data = JSON.parse(raw) as { elements?: unknown };
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Overpass response",
          data: raw.slice(0, 500),
        },
        { status: 502 }
      );
    }

    if (!Array.isArray(data.elements)) {
      return NextResponse.json(
        {
          success: false,
          message: "Overpass returned no elements",
          data,
        },
        { status: 502 }
      );
    }

    const normalizedRaw = data.elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => {
        const tags = el.tags;

        const { latitude, longitude } = latitudeLongitudeFromOverpassElement(el);

        const row = {
          name: tags.name || "",
          address: `${tags["addr:street"] || ""} ${tags["addr:housenumber"] || ""}`.trim(),
          phone: tags.phone || "",
          website: tags.website || "",
          schedule: tags.opening_hours || "",
          maps_url:
            latitude != null && longitude != null
              ? `https://www.google.com/maps?q=${latitude},${longitude}`
              : "",
          image: "/images/place-placeholder.jpg",
          external_source: "osm",
          external_place_id: `${el.type}/${el.id}`,
          latitude,
          longitude,
        };

        const completenessScore = computeCompletenessScore(row);
        return { ...row, completenessScore };
      });

    const dedupByExternalId = new Map<string, (typeof normalizedRaw)[number]>();
    for (const row of normalizedRaw) {
      const ext = row.external_place_id?.trim();
      if (!ext) {
        continue;
      }
      if (!dedupByExternalId.has(ext)) {
        dedupByExternalId.set(ext, row);
      }
    }
    const normalized = Array.from(dedupByExternalId.values());

    normalized.sort((a, b) => {
      if (b.completenessScore !== a.completenessScore) {
        return b.completenessScore - a.completenessScore;
      }
      return (a.name || "").localeCompare(b.name || "", "ro", {
        sensitivity: "base",
      });
    });

    const results = normalized.slice(0, result_limit);

    const extIds = [
      ...new Set(
        results.map((r) => r.external_place_id?.trim()).filter(Boolean)
      ),
    ] as string[];

    let extImported = new Set<string>();
    if (extIds.length > 0) {
      const { data: extRows, error: extError } = await supabase
        .from("place_listings")
        .select("external_place_id")
        .in("external_place_id", extIds);

      if (extError) {
        console.error("Import search Supabase external_place_id:", extError);
      } else {
        extImported = new Set(
          (extRows ?? [])
            .map((row: { external_place_id: string | null }) => row.external_place_id)
            .filter((id): id is string => Boolean(id))
        );
      }
    }

    const { data: nameRows, error: nameError } = await supabase
      .from("places")
      .select("name")
      .eq("city_slug", city_slug)
      .eq("category_slug", category_slug);

    const nameLowerSet = new Set<string>();
    if (nameError) {
      console.error("Import search Supabase names:", nameError);
    } else {
      for (const row of nameRows ?? []) {
        const n = (row as { name: string | null }).name?.trim().toLowerCase();
        if (n) {
          nameLowerSet.add(n);
        }
      }
    }

    const enriched = results.map((r) => {
      const ext = r.external_place_id?.trim();
      const byExternal = Boolean(ext && extImported.has(ext));
      const byName = Boolean(
        r.name?.trim() && nameLowerSet.has(r.name.trim().toLowerCase())
      );
      return {
        ...r,
        already_imported: byExternal || byName,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("Import search route error:", error);
    return NextResponse.json(
      { success: false, message: "Import search failed" },
      { status: 500 }
    );
  }
}
