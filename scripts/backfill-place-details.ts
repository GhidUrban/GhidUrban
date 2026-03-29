/**
 * Backfill missing website, phone, maps_url: Overpass (OSM) first, then Google Places API (New).
 *
 * Usage:
 *   npx tsx scripts/backfill-place-details.ts
 *   npx tsx scripts/backfill-place-details.ts --category=cafenele --limit=20
 *   npx tsx scripts/backfill-place-details.ts --city=baia-mare --category=restaurante --write --limit=50
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_MAPS_API_KEY  (Places API New; optional — only OSM if missing)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1";

const REQUEST_DELAY_MS = 250;
/** Metri — bias pentru afaceri în zonă urbană */
const GOOGLE_TEXT_SEARCH_RADIUS_M = 5000;

const GOOGLE_TEXT_SEARCH_FIELD_MASK =
    "places.name,places.id,places.displayName,places.formattedAddress";

function loadEnvLocal(): void {
    const p = resolve(process.cwd(), ".env.local");
    if (!existsSync(p)) {
        return;
    }
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const eq = trimmed.indexOf("=");
        if (eq <= 0) {
            continue;
        }
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = val;
        }
    }
}

function parseArgs(): {
    dryRun: boolean;
    limit: number;
    citySlug: string | undefined;
    categorySlugs: string[];
} {
    const argv = process.argv.slice(2);
    const dryRun = !argv.includes("--write");
    const limitArg = argv.find((a) => a.startsWith("--limit="));
    let limit = 50;
    if (limitArg) {
        const n = Number.parseInt(limitArg.split("=")[1] ?? "", 10);
        if (Number.isFinite(n) && n > 0) {
            limit = n;
        }
    }

    let citySlug: string | undefined;
    const categoryRaw: string[] = [];
    for (const a of argv) {
        if (a.startsWith("--city=")) {
            const v = a.slice("--city=".length).trim();
            if (v) {
                citySlug = v;
            }
        }
        if (a.startsWith("--category=")) {
            const v = a.slice("--category=".length).trim();
            if (v) {
                categoryRaw.push(v);
            }
        }
    }
    const categorySlugs = [...new Set(categoryRaw)];

    return { dryRun, limit, citySlug, categorySlugs };
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

/** e.g. baia-mare → baia mare, cluj-napoca → cluj napoca */
function citySlugToReadableCity(citySlug: string): string {
    return citySlug.trim().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

type OsmElement = {
    type?: string;
    lat?: number;
    lon?: number;
    center?: { lat?: number; lon?: number };
    tags?: Record<string, string>;
};

type OsmHints = {
    website: string | null;
    phone: string | null;
};

function nameMatchScore(placeName: string, osmName: string): number {
    const a = placeName.trim().toLowerCase();
    const b = osmName.trim().toLowerCase();
    if (!a || !b) {
        return 0;
    }
    if (a === b) {
        return 100;
    }
    if (b.includes(a) || a.includes(b)) {
        return 75;
    }
    const aw = a.split(/\s+/)[0];
    const bw = b.split(/\s+/)[0];
    if (aw.length >= 3 && (b.includes(aw) || a.includes(bw))) {
        return 50;
    }
    return 0;
}

function extractOsmContact(tags: Record<string, string> | undefined): OsmHints {
    if (!tags) {
        return { website: null, phone: null };
    }
    const website =
        tags.website?.trim() ||
        tags["contact:website"]?.trim() ||
        tags["url"]?.trim() ||
        "";
    const phone = tags.phone?.trim() || tags["contact:phone"]?.trim() || "";
    return {
        website: website || null,
        phone: phone || null,
    };
}

function normalizeWebsite(raw: string | null): string | null {
    if (!raw?.trim()) {
        return null;
    }
    let s = raw.trim();
    if (!/^https?:\/\//i.test(s)) {
        s = `https://${s}`;
    }
    return s;
}

function normalizePhone(raw: string | null): string | null {
    if (!raw?.trim()) {
        return null;
    }
    const s = raw.trim().split(/[;/]/)[0]?.trim() ?? "";
    return s || null;
}

async function fetchOsmHints(
    placeName: string,
    lat: number,
    lon: number,
): Promise<OsmHints | null> {
    const query = `
[out:json][timeout:25];
(
  node(around:2200,${lat},${lon});
  way(around:2200,${lat},${lon});
);
out center 45;
`;
    const res = await fetch(OVERPASS_URL, {
        method: "POST",
        body: query,
        headers: { "Content-Type": "text/plain" },
    });
    if (!res.ok) {
        return null;
    }
    const json = (await res.json()) as { elements?: OsmElement[] };
    const elements = json.elements ?? [];
    let best: { score: number; tags?: Record<string, string> } = { score: 0 };

    for (const el of elements) {
        const n = el.tags?.name?.trim();
        if (!n) {
            continue;
        }
        const score = nameMatchScore(placeName, n);
        if (score > best.score) {
            best = { score, tags: el.tags };
        }
    }

    if (best.score < 40 || !best.tags) {
        return null;
    }

    return extractOsmContact(best.tags);
}

type GoogleSearchTextResponse = {
    places?: Array<{ name?: string; id?: string }>;
    error?: { code?: number; message?: string; status?: string };
};

function buildGoogleTextSearchBody(
    textQuery: string,
    locationCenter: { lat: number; lon: number } | null,
): Record<string, unknown> {
    const body: Record<string, unknown> = {
        textQuery,
        languageCode: "ro",
        regionCode: "RO",
    };
    if (locationCenter) {
        body.locationBias = {
            circle: {
                center: {
                    latitude: locationCenter.lat,
                    longitude: locationCenter.lon,
                },
                radius: GOOGLE_TEXT_SEARCH_RADIUS_M,
            },
        };
    }
    return body;
}

function compactTextSearchFailLog(
    textQuery: string,
    readableCity: string,
    locationBiasUsed: boolean,
): string {
    return JSON.stringify({
        textQuery,
        city: readableCity,
        locationBias: locationBiasUsed,
    });
}

/** Text Search (New): first place resource name, or null if none / error. */
async function googleTextSearchFirstResourceName(
    textQuery: string,
    apiKey: string,
    logPlaceId: string,
    locationCenter: { lat: number; lon: number } | null,
    readableCity: string,
): Promise<string | null> {
    const searchUrl = `${GOOGLE_PLACES_BASE}/places:searchText`;
    const bodyJson = buildGoogleTextSearchBody(textQuery, locationCenter);
    const hasBias = locationCenter != null;
    const searchRes = await fetch(searchUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": GOOGLE_TEXT_SEARCH_FIELD_MASK,
        },
        body: JSON.stringify(bodyJson),
    });

    const searchRaw = await searchRes.text();
    if (!searchRes.ok) {
        console.error(
            `[Google] Text Search HTTP ${searchRes.status} (${logPlaceId}):`,
            searchRaw.slice(0, 800),
        );
        console.error(
            `[Google] Text Search failed body (${logPlaceId}):`,
            compactTextSearchFailLog(textQuery, readableCity, hasBias),
        );
        return null;
    }

    let searchJson: GoogleSearchTextResponse;
    try {
        searchJson = JSON.parse(searchRaw) as GoogleSearchTextResponse;
    } catch {
        console.error(
            `[Google] Text Search invalid JSON (${logPlaceId}):`,
            searchRaw.slice(0, 400),
        );
        console.error(
            `[Google] Text Search failed body (${logPlaceId}):`,
            compactTextSearchFailLog(textQuery, readableCity, hasBias),
        );
        return null;
    }

    if (searchJson.error) {
        console.error(
            `[Google] Text Search error (${logPlaceId}):`,
            JSON.stringify(searchJson.error),
        );
        console.error(
            `[Google] Text Search failed body (${logPlaceId}):`,
            compactTextSearchFailLog(textQuery, readableCity, hasBias),
        );
        return null;
    }

    const first = searchJson.places?.[0];
    const resourceName = first?.name?.trim();
    return resourceName || null;
}

type GooglePlaceDetailsResponse = {
    websiteUri?: string;
    internationalPhoneNumber?: string;
    googleMapsUri?: string;
    error?: { code?: number; message?: string; status?: string };
};

async function fetchGooglePlaceDetails(
    name: string,
    address: string | null,
    citySlug: string,
    apiKey: string,
    logPlaceId: string,
    /** Din rând, cities.latitude/longitude sau fallback legacy */
    locationCenter: { lat: number; lon: number } | null,
    /** Dacă false, nu cerem googleMapsUri (mai puțin billing). */
    needMapsUrl: boolean,
    categorySlug: string,
): Promise<{ website: string | null; phone: string | null; maps_url: string | null } | null> {
    const readableCity = citySlugToReadableCity(citySlug);
    const namePart = name.trim();
    const catPart = categorySlug.trim();
    const addrPart = address?.trim() ?? "";

    const primaryParts = [namePart];
    if (catPart) {
        primaryParts.push(catPart);
    }
    if (addrPart) {
        primaryParts.push(addrPart);
    }
    primaryParts.push(readableCity, "Romania");
    const primaryQuery = primaryParts.join(" ").replace(/\s+/g, " ").trim();

    const fallbackParts = [namePart];
    if (catPart) {
        fallbackParts.push(catPart);
    }
    fallbackParts.push(readableCity, "Romania");
    const fallbackQuery = fallbackParts.join(" ").replace(/\s+/g, " ").trim();

    let lastQuery = primaryQuery;
    let resourceName = await googleTextSearchFirstResourceName(
        primaryQuery,
        apiKey,
        logPlaceId,
        locationCenter,
        readableCity,
    );
    if (!resourceName && primaryQuery !== fallbackQuery) {
        console.log(
            `[Google] fallback search for ${logPlaceId} -> ${fallbackQuery}`,
        );
        await sleep(REQUEST_DELAY_MS);
        lastQuery = fallbackQuery;
        resourceName = await googleTextSearchFirstResourceName(
            fallbackQuery,
            apiKey,
            logPlaceId,
            locationCenter,
            readableCity,
        );
    }

    if (!resourceName) {
        console.log(
            `[Google] Text Search: no places (${logPlaceId})`,
            compactTextSearchFailLog(
                lastQuery,
                readableCity,
                locationCenter != null,
            ),
        );
        return null;
    }

    const detailsFields = needMapsUrl
        ? "websiteUri,internationalPhoneNumber,googleMapsUri"
        : "websiteUri,internationalPhoneNumber";

    const detailsUrl = `${GOOGLE_PLACES_BASE}/${resourceName}`;
    const detRes = await fetch(detailsUrl, {
        headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": detailsFields,
        },
    });

    const detRaw = await detRes.text();
    if (!detRes.ok) {
        console.error(
            `[Google] Place Details HTTP ${detRes.status} (${logPlaceId}):`,
            detRaw.slice(0, 800),
        );
        return null;
    }

    let detJson: GooglePlaceDetailsResponse;
    try {
        detJson = JSON.parse(detRaw) as GooglePlaceDetailsResponse;
    } catch {
        console.error(
            `[Google] Place Details invalid JSON (${logPlaceId}):`,
            detRaw.slice(0, 400),
        );
        return null;
    }

    if (detJson.error) {
        console.error(
            `[Google] Place Details error (${logPlaceId}):`,
            JSON.stringify(detJson.error),
        );
        return null;
    }

    const website = normalizeWebsite(detJson.websiteUri ?? null);
    const phone = normalizePhone(detJson.internationalPhoneNumber ?? null);
    const maps_url = needMapsUrl
        ? detJson.googleMapsUri?.trim() || null
        : null;
    if (
        !website &&
        !phone &&
        (needMapsUrl ? !maps_url : true)
    ) {
        console.log(
            `[Google] Place Details: no websiteUri / phone / maps URL (${logPlaceId})`,
        );
    }

    return { website, phone, maps_url };
}

type PlaceRow = {
    id?: string | number | null;
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    website: string | null;
    phone: string | null;
    maps_url: string | null;
};

async function loadCityCenterBySlug(
    sb: SupabaseClient,
): Promise<Map<string, { lat: number; lon: number }>> {
    const m = new Map<string, { lat: number; lon: number }>();
    const { data, error } = await sb.from("cities").select("slug, latitude, longitude");
    if (error) {
        console.warn("[warn] cities coords:", error.message);
    }
    for (const raw of data ?? []) {
        const r = raw as { slug: string; latitude: number | null; longitude: number | null };
        const la = r.latitude != null ? Number(r.latitude) : NaN;
        const lo = r.longitude != null ? Number(r.longitude) : NaN;
        if (Number.isFinite(la) && Number.isFinite(lo)) {
            m.set(r.slug, { lat: la, lon: lo });
        }
    }
    return m;
}

function resolveCoords(
    row: PlaceRow,
    cityCenters: Map<string, { lat: number; lon: number }>,
): { lat: number; lon: number } | null {
    const la = row.latitude != null ? Number(row.latitude) : NaN;
    const lo = row.longitude != null ? Number(row.longitude) : NaN;
    if (Number.isFinite(la) && Number.isFinite(lo)) {
        return { lat: la, lon: lo };
    }
    const fromCity = cityCenters.get(row.city_slug);
    if (fromCity) {
        return fromCity;
    }
    console.warn(`[city coords] missing DB coordinates for ${row.city_slug} (backfill)`);
    return null;
}

async function main(): Promise<void> {
    loadEnvLocal();
    const { dryRun, limit, citySlug, categorySlugs } = parseArgs();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || "";

    if (!supabaseUrl || !serviceKey) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
        process.exit(1);
    }
    if (!googleKey) {
        console.warn("Warning: GOOGLE_MAPS_API_KEY missing — only OSM will be used for new data.");
    }

    console.log("--- Active filters ---");
    console.log("city:", citySlug ?? "(none)");
    console.log(
        "category:",
        categorySlugs.length > 0 ? categorySlugs.join(", ") : "(none)",
    );
    console.log("limit:", limit);
    console.log("mode:", dryRun ? "dry-run" : "write");
    console.log("----------------------\n");

    const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey);
    const cityCenters = await loadCityCenterBySlug(supabase);

    let placesQuery = supabase
        .from("places")
        .select(
            "id, place_id, city_slug, category_slug, name, address, latitude, longitude, website, phone, maps_url",
        )
        .or("website.is.null,phone.is.null,maps_url.is.null");

    if (citySlug) {
        placesQuery = placesQuery.eq("city_slug", citySlug);
    }
    if (categorySlugs.length === 1) {
        placesQuery = placesQuery.eq("category_slug", categorySlugs[0]!);
    } else if (categorySlugs.length > 1) {
        placesQuery = placesQuery.in("category_slug", categorySlugs);
    }

    const { data: rows, error } = await placesQuery
        .order("city_slug", { ascending: true })
        .order("name", { ascending: true })
        .limit(limit);

    if (error) {
        console.error("[error] Supabase load failed:", error.message);
        if (error.message.includes("id")) {
            console.error("Hint: if column id does not exist, remove id from select in this script.");
        }
        process.exit(1);
    }

    const places = (rows ?? []) as PlaceRow[];

    let checked = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of places) {
        checked += 1;
        const needWebsite = row.website == null || String(row.website).trim() === "";
        const needPhone = row.phone == null || String(row.phone).trim() === "";
        const needMaps = row.maps_url == null || String(row.maps_url).trim() === "";

        if (!needWebsite && !needPhone && !needMaps) {
            skipped += 1;
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        const updatePayload: {
            website?: string;
            phone?: string;
            maps_url?: string;
        } = {};

        let website: string | null = null;
        let phone: string | null = null;
        let maps_url: string | null = null;

        const coords = resolveCoords(row, cityCenters);
        if (coords) {
            try {
                const osm = await fetchOsmHints(row.name, coords.lat, coords.lon);
                await sleep(REQUEST_DELAY_MS);
                if (osm) {
                    if (needWebsite && osm.website) {
                        website = normalizeWebsite(osm.website);
                    }
                    if (needPhone && osm.phone) {
                        phone = normalizePhone(osm.phone);
                    }
                }
            } catch (e) {
                console.error(`[error] OSM ${row.place_id}:`, e);
            }
        }

        const stillNeed =
            (needWebsite && !website) ||
            (needPhone && !phone) ||
            (needMaps && !maps_url);

        if (stillNeed && googleKey) {
            try {
                const g = await fetchGooglePlaceDetails(
                    row.name,
                    row.address,
                    row.city_slug,
                    googleKey,
                    row.place_id,
                    coords,
                    needMaps,
                    row.category_slug,
                );
                await sleep(REQUEST_DELAY_MS);
                if (g) {
                    if (needWebsite && !website && g.website) {
                        website = g.website;
                    }
                    if (needPhone && !phone && g.phone) {
                        phone = g.phone;
                    }
                    if (needMaps && !maps_url && g.maps_url) {
                        maps_url = g.maps_url;
                    }
                }
            } catch (e) {
                console.error(`[error] Google ${row.place_id}:`, e);
            }
        }

        if (needWebsite && website) {
            updatePayload.website = website;
        }
        if (needPhone && phone) {
            updatePayload.phone = phone;
        }
        if (needMaps && maps_url) {
            updatePayload.maps_url = maps_url;
        }

        if (Object.keys(updatePayload).length === 0) {
            skipped += 1;
            console.log(`[skip] ${row.place_id} — nothing found`);
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        if (dryRun) {
            updated += 1;
            console.log(
                `[ok] ${row.place_id} (dry-run) → ${JSON.stringify(updatePayload)}`,
            );
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        const { error: upErr } = await supabase
            .from("places")
            .update(updatePayload)
            .eq("place_id", row.place_id)
            .eq("city_slug", row.city_slug)
            .eq("category_slug", row.category_slug);

        if (upErr) {
            failed += 1;
            console.error(`[error] ${row.place_id} update:`, upErr.message);
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        updated += 1;
        console.log(`[ok] ${row.place_id} → ${JSON.stringify(updatePayload)}`);
        await sleep(REQUEST_DELAY_MS);
    }

    console.log("\n--- Summary ---");
    console.log(`Total checked: ${checked}`);
    console.log(`Updated:       ${updated}${dryRun ? " (dry-run)" : ""}`);
    console.log(`Skipped:       ${skipped}`);
    console.log(`Failed:        ${failed}`);
}

main().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
});
