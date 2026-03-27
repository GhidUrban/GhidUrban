/**
 * Manual backfill: latitude / longitude for places missing coordinates (Nominatim).
 *
 * Usage:
 *   npx tsx scripts/backfill-place-coordinates.ts
 *   npx tsx scripts/backfill-place-coordinates.ts --write
 *   npx tsx scripts/backfill-place-coordinates.ts --write --limit=10
 *
 * Env (from .env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (recommended for updates; anon key may fail if RLS blocks)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (fallback)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { slugToTitle } from "../src/lib/slug";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const REQUEST_DELAY_MS = 1100;
const USER_AGENT = "GhidUrban/1.0 (coordinate backfill; contact: local dev)";

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

function parseArgs(): { dryRun: boolean; limit: number | undefined } {
    const argv = process.argv.slice(2);
    const dryRun = !argv.includes("--write");
    const limitArg = argv.find((a) => a.startsWith("--limit="));
    let limit: number | undefined;
    if (limitArg) {
        const n = Number.parseInt(limitArg.split("=")[1] ?? "", 10);
        if (Number.isFinite(n) && n > 0) {
            limit = n;
        }
    }
    return { dryRun, limit };
}

function isInRomaniaBounds(lat: number, lng: number): boolean {
    return lat >= 43.4 && lat <= 48.35 && lng >= 19.8 && lng <= 30.3;
}

type NominatimHit = {
    lat?: string;
    lon?: string;
    display_name?: string;
};

function buildSearchQuery(name: string, address: string | null, cityLabel: string): string {
    const n = name?.trim() ?? "";
    const a = address?.trim() ?? "";
    if (a) {
        return `${n}, ${a}, ${cityLabel}, Romania`;
    }
    return `${n}, ${cityLabel}, Romania`;
}

/** Fallback when name + address + city yields no valid hit: name + city only. */
function buildFallbackSearchQuery(name: string, cityLabel: string): string {
    const n = name?.trim() ?? "";
    return `${n}, ${cityLabel}, Romania`;
}

function pickBestHit(
    hits: NominatimHit[],
    cityLabel: string,
): { lat: number; lng: number; display_name: string } | null {
    const cityLower = cityLabel.toLowerCase();
    const cityTokens = cityLower
        .split(/[\s,-]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 3);

    for (const h of hits) {
        const lat = h.lat != null ? Number(h.lat) : NaN;
        const lng = h.lon != null ? Number(h.lon) : NaN;
        const dn = (h.display_name ?? "").trim();
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            continue;
        }
        if (!isInRomaniaBounds(lat, lng)) {
            continue;
        }
        const dnLower = dn.toLowerCase();
        if (!dnLower.includes("romania") && !dnLower.includes("românia")) {
            continue;
        }
        if (
            cityTokens.length > 0 &&
            !cityTokens.some((token) => dnLower.includes(token))
        ) {
            continue;
        }

        return { lat, lng, display_name: dn };
    }

    return null;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

type PlaceRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
};

async function fetchNominatim(q: string): Promise<NominatimHit[]> {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "ro");
    url.searchParams.set("q", q);

    const res = await fetch(url.toString(), {
        headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
        },
    });

    if (!res.ok) {
        console.error(`Nominatim HTTP ${res.status} for query: ${q.slice(0, 80)}…`);
        return [];
    }

    const json = (await res.json()) as unknown;
    return Array.isArray(json) ? (json as NominatimHit[]) : [];
}

async function main(): Promise<void> {
    loadEnvLocal();
    const { dryRun, limit } = parseArgs();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const key = serviceKey ?? anonKey;

    if (!supabaseUrl || !key) {
        console.error(
            "Missing NEXT_PUBLIC_SUPABASE_URL and a key (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
        );
        process.exit(1);
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, key);

    const { data: cityRows, error: cityErr } = await supabase.from("cities").select("slug, name");
    if (cityErr) {
        console.error("Failed to load cities:", cityErr.message);
        process.exit(1);
    }

    const cityNameBySlug = new Map<string, string>();
    for (const c of cityRows ?? []) {
        if (c.slug && c.name) {
            cityNameBySlug.set(c.slug, c.name);
        }
    }

    let q = supabase
        .from("places")
        .select(
            "place_id, city_slug, category_slug, name, address, latitude, longitude",
        )
        .or("latitude.is.null,longitude.is.null")
        .order("city_slug", { ascending: true })
        .order("name", { ascending: true });

    if (limit != null) {
        q = q.limit(limit);
    }

    const { data: places, error: placesErr } = await q;

    if (placesErr) {
        console.error("Failed to load places:", placesErr.message);
        process.exit(1);
    }

    const rows = (places ?? []) as PlaceRow[];

    let checked = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    console.log(
        dryRun
            ? "DRY RUN (no DB writes). Pass --write to apply updates.\n"
            : "WRITE MODE — applying updates to Supabase.\n",
    );
    if (limit != null) {
        console.log(`Limit: ${limit} row(s)\n`);
    }

    for (const row of rows) {
        checked += 1;

        if (row.latitude != null && row.longitude != null) {
            skipped += 1;
            console.log(`[skip] ${row.place_id} — already has both coordinates`);
            continue;
        }

        const cityLabel =
            cityNameBySlug.get(row.city_slug) ?? slugToTitle(row.city_slug);
        const primaryQ = buildSearchQuery(row.name, row.address, cityLabel);
        const hasAddress = Boolean(row.address?.trim());

        let hits: NominatimHit[];
        try {
            hits = await fetchNominatim(primaryQ);
        } catch (e) {
            failed += 1;
            console.error(`[fail] ${row.place_id} — Nominatim request error:`, e);
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        await sleep(REQUEST_DELAY_MS);

        let best = pickBestHit(hits, cityLabel);

        if (!best && hasAddress) {
            const fallbackQ = buildFallbackSearchQuery(row.name, cityLabel);
            const fallbackPreview =
                fallbackQ.length > 100 ? `${fallbackQ.slice(0, 100)}…` : fallbackQ;
            console.log(
                `[fallback] ${row.place_id} "${row.name}" — retry without address: ${fallbackPreview}`,
            );
            try {
                hits = await fetchNominatim(fallbackQ);
            } catch (e) {
                failed += 1;
                console.error(`[fail] ${row.place_id} — Nominatim request error (fallback):`, e);
                await sleep(REQUEST_DELAY_MS);
                continue;
            }
            await sleep(REQUEST_DELAY_MS);
            best = pickBestHit(hits, cityLabel);
        }

        if (!best) {
            skipped += 1;
            console.log(
                `[skip] ${row.place_id} "${row.name}" — no confident Nominatim match${hasAddress ? " after primary and fallback" : ""} (query: ${primaryQ.slice(0, 100)}…)`,
            );
            continue;
        }

        const updatePayload: { latitude?: number; longitude?: number } = {};
        if (row.latitude == null) {
            updatePayload.latitude = best.lat;
        }
        if (row.longitude == null) {
            updatePayload.longitude = best.lng;
        }

        if (Object.keys(updatePayload).length === 0) {
            skipped += 1;
            continue;
        }

        if (dryRun) {
            updated += 1;
            console.log(
                `[dry-run] ${row.place_id} "${row.name}" → lat=${updatePayload.latitude ?? row.latitude} lng=${updatePayload.longitude ?? row.longitude} (${best.display_name.slice(0, 120)}…)`,
            );
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
            console.error(`[fail] ${row.place_id} — Supabase update:`, upErr.message);
            continue;
        }

        updated += 1;
        console.log(
            `[ok] ${row.place_id} "${row.name}" → ${JSON.stringify(updatePayload)}`,
        );
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
