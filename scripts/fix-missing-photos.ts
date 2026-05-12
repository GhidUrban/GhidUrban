/**
 * Fix missing photos: auto-match with Google Places + download photos
 * for places that have no image_storage_path in Supabase Storage.
 *
 * Usage:
 *   npx tsx scripts/fix-missing-photos.ts
 *   npx tsx scripts/fix-missing-photos.ts --city=alba-iulia
 *   npx tsx scripts/fix-missing-photos.ts --max-photos=3
 *   npx tsx scripts/fix-missing-photos.ts --dry-run
 *
 * Env: GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { uploadGooglePhotosForPlace } from "../src/lib/google-place-photos-storage";
import {
    textSearchPlacesForCity,
    pickBestSearchCandidateForCity,
} from "../src/lib/google-maps-place-autofill";
import { RO_MAJOR_CITIES } from "../src/lib/ro-major-cities";

dotenv.config({ path: ".env.local" });

function envOrExit(name: string, v: string | undefined): string {
    const t = v?.trim();
    if (!t) {
        console.error(`Missing ${name}`);
        process.exit(1);
    }
    return t;
}

const url = envOrExit("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceKey = envOrExit("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
const googleKey = envOrExit("GOOGLE_MAPS_API_KEY", process.env.GOOGLE_MAPS_API_KEY);

function argVal(name: string): string | null {
    const a = process.argv.find((x) => x.startsWith(`${name}=`));
    if (!a) return null;
    return a.split("=").slice(1).join("=").trim() || null;
}

const dryRun = process.argv.includes("--dry-run");
const cityFilter = argVal("--city");
const maxPhotos = Math.min(Number(argVal("--max-photos") ?? "1"), 3) || 1;

function cityCenter(slug: string): { lat: number; lon: number } | null {
    const c = RO_MAJOR_CITIES.find((r) => r.slug === slug);
    if (!c) return null;
    return { lat: c.latitude, lon: c.longitude };
}

async function main() {
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

    console.log("Fetching places with missing image_storage_path...");
    let placesQuery = sb
        .from("places")
        .select("place_id, city_slug, category_slug, name")
        .eq("status", "available")
        .is("image_storage_path", null);
    if (cityFilter) {
        placesQuery = placesQuery.eq("city_slug", cityFilter);
    }
    const { data: placesData, error: placesErr } = await placesQuery;
    if (placesErr) {
        console.error("Error fetching places:", placesErr.message);
        process.exit(1);
    }
    const places = (placesData ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string; name: string;
    }>;
    console.log(`Found ${places.length} places without image_storage_path.`);

    if (places.length === 0) {
        console.log("Nothing to fix.");
        return;
    }

    console.log("Fetching Google match data...");
    let googleQuery = sb
        .from("place_google_data")
        .select("place_id, city_slug, category_slug, external_place_id")
        .not("external_place_id", "is", null);
    if (cityFilter) {
        googleQuery = googleQuery.eq("city_slug", cityFilter);
    }
    const { data: googleData } = await googleQuery;
    const googleMap = new Map<string, string>();
    for (const row of (googleData ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string; external_place_id: string;
    }>) {
        googleMap.set(`${row.place_id}\0${row.city_slug}\0${row.category_slug}`, row.external_place_id);
    }
    console.log(`Google matches found: ${googleMap.size}\n`);

    let fixed = 0;
    let failed = 0;
    let skipped = 0;
    let autoMatched = 0;

    for (let i = 0; i < places.length; i++) {
        const p = places[i]!;
        const key = `${p.place_id}\0${p.city_slug}\0${p.category_slug}`;
        const label = `[${i + 1}/${places.length}] ${p.city_slug}/${p.category_slug}/${p.place_id}`;
        let extId = googleMap.get(key);

        if (!extId) {
            const center = cityCenter(p.city_slug);
            if (!center) {
                skipped++;
                console.log(`${label} SKIP (city center unknown for ${p.city_slug})`);
                continue;
            }

            if (dryRun) {
                console.log(`${label} DRY-RUN would auto-match "${p.name}"`);
                autoMatched++;
                fixed++;
                continue;
            }

            try {
                const query = `${p.name} ${p.city_slug.replace(/-/g, " ")}`;
                const candidates = await textSearchPlacesForCity(googleKey, query, center);
                const picked = pickBestSearchCandidateForCity(candidates, p.city_slug, center);
                if (!picked) {
                    skipped++;
                    console.log(`${label} SKIP (no Google match for "${p.name}")`);
                    continue;
                }
                extId = picked.resource.replace(/^places\//, "");

                await sb.from("place_google_data").upsert({
                    place_id: p.place_id,
                    city_slug: p.city_slug,
                    category_slug: p.category_slug,
                    external_place_id: extId,
                    google_match_status: "matched",
                }, { onConflict: "place_id,city_slug,category_slug" });

                autoMatched++;
                console.log(`${label} AUTO-MATCHED "${p.name}" → ${extId}`);
            } catch (e) {
                skipped++;
                console.log(`${label} SKIP (search error: ${e instanceof Error ? e.message : e})`);
                continue;
            }
        }

        if (dryRun) {
            console.log(`${label} DRY-RUN would download photo (${extId})`);
            fixed++;
            continue;
        }

        try {
            const res = await uploadGooglePhotosForPlace(sb, {
                apiKey: googleKey,
                city_slug: p.city_slug,
                category_slug: p.category_slug,
                place_id: p.place_id,
                external_place_id: extId,
                maxPhotos,
                photoDelayMs: 200,
            });
            if (res.count > 0) {
                fixed++;
                console.log(`${label} OK (${res.count} photos)`);
            } else {
                failed++;
                console.log(`${label} FAILED (0 photos uploaded)`);
            }
        } catch (e) {
            failed++;
            console.log(`${label} ERROR: ${e instanceof Error ? e.message : e}`);
        }
    }

    console.log("\n--- Summary ---");
    console.log(`Total:        ${places.length}`);
    console.log(`Fixed:        ${fixed}`);
    console.log(`Auto-matched: ${autoMatched}`);
    console.log(`Failed:       ${failed}`);
    console.log(`Skipped:      ${skipped} (no match found)`);
    if (dryRun) console.log("(DRY RUN — no actual changes made)");
}

main().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
});
