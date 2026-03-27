/**
 * Backfill latitude / longitude using Google Maps Geocoding API.
 *
 * Spec: primary query = name + address + city_slug + Romania; fallback = name + city_slug + Romania.
 *
 * Usage:
 *   npx tsx scripts/backfill-place-coordinates-google.ts
 *   npx tsx scripts/backfill-place-coordinates-google.ts --write
 *   npx tsx scripts/backfill-place-coordinates-google.ts --write --limit=50
 *
 * Env (.env.local or shell):
 *   GOOGLE_MAPS_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const REQUEST_DELAY_MS = 200;

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

function parseArgs(): { dryRun: boolean; limit: number } {
    const argv = process.argv.slice(2);
    const dryRun = !argv.includes("--write");
    const limitArg = argv.find((a) => a.startsWith("--limit="));
    let limit = 10;
    if (limitArg) {
        const n = Number.parseInt(limitArg.split("=")[1] ?? "", 10);
        if (Number.isFinite(n) && n > 0) {
            limit = n;
        }
    }
    return { dryRun, limit };
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

/** Primary: name + address + city_slug + Romania (fără adresă → același string ca fallback). */
function buildPrimaryQuery(name: string, address: string | null, citySlug: string): string {
    const n = name?.trim() ?? "";
    const a = address?.trim() ?? "";
    const c = citySlug.trim();
    if (a) {
        return `${n}, ${a}, ${c}, Romania`;
    }
    return `${n}, ${c}, Romania`;
}

/** Fallback: name + city_slug + Romania */
function buildFallbackQuery(name: string, citySlug: string): string {
    const n = name?.trim() ?? "";
    return `${n}, ${citySlug.trim()}, Romania`;
}

type GoogleGeocodeResponse = {
    status?: string;
    error_message?: string;
    results?: Array<{
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
    }>;
};

type GeocodeOk = { lat: number; lng: number; formatted_address: string };

async function geocodeGoogle(address: string, apiKey: string): Promise<
    | { kind: "ok"; value: GeocodeOk }
    | { kind: "no_results" }
    | { kind: "denied"; message: string }
> {
    const url = new URL(GOOGLE_GEOCODE_URL);
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
    });

    if (!res.ok) {
        return { kind: "denied", message: `HTTP ${res.status}` };
    }

    const json = (await res.json()) as GoogleGeocodeResponse;
    const status = json.status ?? "";

    if (status === "ZERO_RESULTS") {
        return { kind: "no_results" };
    }

    if (status !== "OK" || !json.results?.length) {
        return {
            kind: "denied",
            message: json.error_message ?? (status || "unknown_status"),
        };
    }

    const first = json.results[0];
    const formatted = (first.formatted_address ?? "").trim();
    const lat = first.geometry?.location?.lat;
    const lng = first.geometry?.location?.lng;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { kind: "no_results" };
    }

    const lower = formatted.toLowerCase();
    if (!lower.includes("romania")) {
        return { kind: "no_results" };
    }

    return {
        kind: "ok",
        value: { lat: lat as number, lng: lng as number, formatted_address: formatted },
    };
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
};

function rowLabel(row: PlaceRow): string {
    if (row.id != null && row.id !== "") {
        return `id=${row.id} place_id=${row.place_id}`;
    }
    return `place_id=${row.place_id}`;
}

async function main(): Promise<void> {
    loadEnvLocal();
    const { dryRun, limit } = parseArgs();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
        process.exit(1);
    }
    if (!googleKey) {
        console.error("Missing GOOGLE_MAPS_API_KEY.");
        process.exit(1);
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey);

    const { data: places, error: placesErr } = await supabase
        .from("places")
        .select("id, place_id, city_slug, category_slug, name, address, latitude, longitude")
        .or("latitude.is.null,longitude.is.null")
        .order("city_slug", { ascending: true })
        .order("name", { ascending: true })
        .limit(limit);

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
    console.log(`Limit: ${limit} row(s)\n`);

    for (const row of rows) {
        checked += 1;

        if (row.latitude != null && row.longitude != null) {
            skipped += 1;
            console.log(`[skip] ${rowLabel(row)} — already has both coordinates`);
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        const primaryQ = buildPrimaryQuery(row.name, row.address, row.city_slug);
        const hasAddress = Boolean(row.address?.trim());

        let result = await geocodeGoogle(primaryQ, googleKey);

        if (result.kind === "denied") {
            failed += 1;
            console.error(`[fail] ${rowLabel(row)} — Google: ${result.message}`);
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        if (result.kind === "no_results" && hasAddress) {
            const fallbackQ = buildFallbackQuery(row.name, row.city_slug);
            console.log(
                `[fallback] ${rowLabel(row)} "${row.name}" — ${fallbackQ.length > 100 ? `${fallbackQ.slice(0, 100)}…` : fallbackQ}`,
            );
            result = await geocodeGoogle(fallbackQ, googleKey);
        }

        if (result.kind === "denied") {
            failed += 1;
            console.error(`[fail] ${rowLabel(row)} — Google (fallback): ${result.message}`);
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        if (result.kind === "no_results") {
            skipped += 1;
            console.log(
                `[skip] ${rowLabel(row)} "${row.name}" — no geocode result${hasAddress ? " (primary + fallback)" : ""}`,
            );
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        const best = result.value;
        const updatePayload: { latitude?: number; longitude?: number } = {};
        if (row.latitude == null) {
            updatePayload.latitude = best.lat;
        }
        if (row.longitude == null) {
            updatePayload.longitude = best.lng;
        }

        if (Object.keys(updatePayload).length === 0) {
            skipped += 1;
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        if (dryRun) {
            updated += 1;
            console.log(
                `[dry-run] ${rowLabel(row)} "${row.name}" → lat=${updatePayload.latitude ?? row.latitude} lng=${updatePayload.longitude ?? row.longitude} (${best.formatted_address.slice(0, 100)}…)`,
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
            console.error(`[fail] ${rowLabel(row)} — Supabase update:`, upErr.message);
            await sleep(REQUEST_DELAY_MS);
            continue;
        }

        updated += 1;
        console.log(`[ok] ${rowLabel(row)} "${row.name}" → ${JSON.stringify(updatePayload)}`);
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
