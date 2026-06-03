/**
 * Batch download Google Place photos → Cloudflare R2 (via uploadGooglePhotosForPlace).
 *
 * Usage:
 *   npx tsx scripts/google-photos-to-r2.ts --city=bucuresti --limit=30
 *   npx tsx scripts/google-photos-to-r2.ts --max-photos=3 --force  (optional: 3 photos)
 *   npx tsx scripts/google-photos-to-r2.ts --google-status=both
 *   (alias: npm run photos:google-to-storage)
 *
 * Env (.env.local): GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { uploadGooglePhotosForPlace } from "../src/lib/google-place-photos-storage";
import { isR2PublicUrl } from "../src/lib/r2/upload-place-photo-to-r2";

dotenv.config({ path: ".env.local" });

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function envOrExit(name: string): string {
    const v = process.env[name]?.trim();
    if (!v) {
        console.error(`Missing ${name}`);
        process.exit(1);
    }
    return v;
}

if (!GOOGLE_KEY || !url || !serviceKey) {
    console.error("Need GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

envOrExit("R2_ACCOUNT_ID");
envOrExit("R2_ACCESS_KEY_ID");
envOrExit("R2_SECRET_ACCESS_KEY");
envOrExit("R2_BUCKET_NAME");
envOrExit("R2_PUBLIC_URL");

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function argVal(name: string): string | null {
    const a = process.argv.find((x) => x.startsWith(`${name}=`));
    if (!a) return null;
    return a.split("=").slice(1).join("=").trim() || null;
}

function parseIntArg(name: string, fallback: number): number {
    const v = argVal(name);
    if (v == null) return fallback;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
}

function hasFlag(name: string): boolean {
    return process.argv.includes(name);
}

type WorkRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    google_place_id: string | null;
    image_storage_path: string | null;
};

async function main() {
    const cityFilter = argVal("--city");
    const limit = parseIntArg("--limit", 200);
    const maxPhotos = Math.min(3, Math.max(1, parseIntArg("--max-photos", 1)));
    const force = hasFlag("--force");
    const delayMs = parseIntArg("--delay", 180);
    const statusArg = (argVal("--google-status") ?? "matched").trim().toLowerCase();
    const statusFilter =
        statusArg === "review"
            ? (["review"] as const)
            : statusArg === "both"
              ? (["matched", "review"] as const)
              : (["matched"] as const);

    let q = supabase
        .from("place_google_data")
        .select("place_id, city_slug, category_slug, google_place_id")
        .not("google_place_id", "is", null);
    if (statusFilter.length === 1) {
        q = q.eq("google_match_status", statusFilter[0]);
    } else {
        q = q.in("google_match_status", [...statusFilter]);
    }

    if (cityFilter) q = q.eq("city_slug", cityFilter);

    const { data: gdRows, error } = await q.limit(limit * 2);
    if (error) throw error;

    const keys = (gdRows ?? []) as Omit<WorkRow, "image_storage_path">[];
    if (keys.length === 0) {
        console.log("No place_google_data rows for this filter.");
        return;
    }

    const placeIds = keys.map((k) => k.place_id);
    const { data: placeRows } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, image_storage_path")
        .in("place_id", placeIds);

    const pathMap = new Map<string, string | null>();
    for (const p of placeRows ?? []) {
        const r = p as { place_id: string; city_slug: string; category_slug: string; image_storage_path: string | null };
        pathMap.set(`${r.place_id}|${r.city_slug}|${r.category_slug}`, r.image_storage_path ?? null);
    }

    const work: WorkRow[] = keys
        .map((k) => ({
            ...k,
            image_storage_path: pathMap.get(`${k.place_id}|${k.city_slug}|${k.category_slug}`) ?? null,
        }))
        .filter((r) => {
            if (force) return true;
            const path = r.image_storage_path?.trim();
            if (!path) return true;
            return !isR2PublicUrl(path);
        })
        .slice(0, limit);

    console.log(`Processing ${work.length} place(s), up to ${maxPhotos} photo(s) each → R2.`);

    let ok = 0;
    let skipped = 0;
    const statsPath = path.join(process.cwd(), "scripts", ".google-photo-import-stats.json");

    for (const row of work) {
        try {
            const gid = row.google_place_id?.trim();
            if (!gid) {
                skipped++;
                continue;
            }

            const res = await uploadGooglePhotosForPlace(supabase, {
                apiKey: GOOGLE_KEY!,
                city_slug: row.city_slug,
                category_slug: row.category_slug,
                place_id: row.place_id,
                external_place_id: gid,
                maxPhotos,
                photoDelayMs: delayMs,
                force,
            });

            if (res.count > 0) {
                ok++;
                console.log("OK", row.city_slug, row.category_slug, row.place_id, res.count, "images");
            } else {
                skipped++;
                console.warn("SKIP", row.city_slug, row.category_slug, row.place_id);
            }

            const stats = { ok, skipped, details_calls: ok, last_at: new Date().toISOString() };
            try {
                fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), "utf8");
            } catch {
                /* ignore */
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn("Row error, skipping", row.city_slug, row.category_slug, row.place_id, msg);
            skipped++;
        }
    }

    console.log(`\nDone. Uploaded: ${ok}. Skipped: ${skipped}.`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
