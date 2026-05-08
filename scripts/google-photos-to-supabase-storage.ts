/**
 * Download Google Place photos (server-side) → Supabase Storage → places.image_storage_path + place_photos (up to 3).
 *
 * Usage:
 *   npx tsx scripts/google-photos-to-supabase-storage.ts --city=bucuresti --limit=30
 *   npx tsx scripts/google-photos-to-supabase-storage.ts --max-photos=3 --force
 *   npx tsx scripts/google-photos-to-supabase-storage.ts --google-status=both
 *
 * Env: .env.local — GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: SUPABASE_PLACE_IMAGES_BUCKET (default places)
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.SUPABASE_PLACE_IMAGES_BUCKET?.trim() || "places";

const PLACES_BASE = "https://places.googleapis.com/v1";

if (!GOOGLE_KEY || !url || !serviceKey) {
    console.error("Need GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

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

function placeResourceName(googlePlaceId: string): string {
    const t = googlePlaceId.trim();
    if (t.startsWith("places/")) return t;
    return `places/${t}`;
}

async function fetchPhotoNamesFromDetails(resourceName: string, max: number): Promise<string[]> {
    const res = await fetch(`${PLACES_BASE}/${resourceName}`, {
        headers: {
            "X-Goog-Api-Key": GOOGLE_KEY!,
            "X-Goog-FieldMask": "photos",
        },
    });
    if (!res.ok) {
        const txt = await res.text();
        console.warn("Details failed", res.status, txt.slice(0, 200));
        return [];
    }
    const json = (await res.json()) as { photos?: { name?: string }[] };
    const names = (json.photos ?? [])
        .map((p) => p.name?.trim())
        .filter((n): n is string => Boolean(n))
        .slice(0, max);
    return names;
}

async function fetchPhotoBytes(photoName: string): Promise<Buffer | null> {
    const u = `${PLACES_BASE}/${photoName}/media?maxHeightPx=1200`;
    const res = await fetch(u, { headers: { "X-Goog-Api-Key": GOOGLE_KEY! }, redirect: "follow" });
    if (!res.ok) {
        console.warn("Media failed", photoName.slice(0, 40), res.status);
        return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
}

type Row = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    google_place_id: string | null;
    google_photo_name: string | null;
    image_storage_path: string | null;
};

async function main() {
    const cityFilter = argVal("--city");
    const limit = parseIntArg("--limit", 200);
    const maxPhotos = Math.min(3, Math.max(1, parseIntArg("--max-photos", 3)));
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
        .select("place_id, city_slug, category_slug, google_place_id, google_photo_name")
        .not("google_place_id", "is", null);
    if (statusFilter.length === 1) {
        q = q.eq("google_match_status", statusFilter[0]);
    } else {
        q = q.in("google_match_status", [...statusFilter]);
    }

    if (cityFilter) q = q.eq("city_slug", cityFilter);

    const { data: gdRows, error } = await q.limit(limit * 2);
    if (error) throw error;

    const keys = (gdRows ?? []) as Omit<Row, "image_storage_path">[];
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

    const work: Row[] = keys
        .map((k) => ({
            ...k,
            image_storage_path: pathMap.get(`${k.place_id}|${k.city_slug}|${k.category_slug}`) ?? null,
        }))
        .filter((r) => force || !r.image_storage_path?.trim())
        .slice(0, limit);

    console.log(`Processing ${work.length} place(s), up to ${maxPhotos} photo(s) each.`);

    let ok = 0;
    let skipped = 0;
    const statsPath = path.join(process.cwd(), "scripts", ".google-photo-import-stats.json");

    for (const row of work) {
        const gid = row.google_place_id?.trim();
        if (!gid) {
            skipped++;
            continue;
        }

        let photoNames: string[] = [];
        if (row.google_photo_name?.trim()) {
            photoNames.push(row.google_photo_name.trim());
        }
        if (photoNames.length < maxPhotos) {
            const extra = await fetchPhotoNamesFromDetails(placeResourceName(gid), maxPhotos);
            const set = new Set(photoNames);
            for (const n of extra) {
                if (set.size >= maxPhotos) break;
                if (!set.has(n)) {
                    set.add(n);
                    photoNames.push(n);
                }
            }
        }
        photoNames = photoNames.slice(0, maxPhotos);
        if (photoNames.length === 0) {
            skipped++;
            continue;
        }

        const publicUrls: string[] = [];
        for (let i = 0; i < photoNames.length; i++) {
            const bytes = await fetchPhotoBytes(photoNames[i]!);
            if (!bytes) continue;
            const objectPath = `${row.city_slug}/${row.category_slug}/${row.place_id}_${i}.jpg`;
            const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
                contentType: "image/jpeg",
                upsert: true,
            });
            if (upErr) {
                console.warn("Upload failed", objectPath, upErr.message);
                continue;
            }
            const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
            publicUrls.push(pub.publicUrl);
            await new Promise((r) => setTimeout(r, delayMs));
        }

        if (publicUrls.length === 0) {
            skipped++;
            continue;
        }

        const cover = publicUrls[0]!;
        await supabase.from("places").update({ image_storage_path: cover }).match({
            place_id: row.place_id,
            city_slug: row.city_slug,
            category_slug: row.category_slug,
        });

        await supabase
            .from("place_photos")
            .delete()
            .eq("place_id", row.place_id)
            .eq("city_slug", row.city_slug)
            .eq("category_slug", row.category_slug);

        const photoInserts = publicUrls.map((storage_path, sort_order) => ({
            place_id: row.place_id,
            city_slug: row.city_slug,
            category_slug: row.category_slug,
            sort_order,
            storage_path,
        }));
        const { error: pErr } = await supabase.from("place_photos").insert(photoInserts);
        if (pErr?.code === "42P01" || pErr?.message?.includes("place_photos")) {
            console.warn("place_photos table missing? Run migration 20260508120007. Cover URL saved on places only.");
        } else if (pErr) {
            console.warn("place_photos insert:", pErr.message);
        }

        await supabase
            .from("place_google_data")
            .update({ google_photo_name: photoNames[0] ?? null })
            .match({ place_id: row.place_id, city_slug: row.city_slug, category_slug: row.category_slug });

        ok++;
        console.log("OK", row.city_slug, row.category_slug, row.place_id, publicUrls.length, "images");

        const stats = { ok, skipped, details_calls: ok, last_at: new Date().toISOString() };
        try {
            fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), "utf8");
        } catch {
            /* ignore */
        }
    }

    console.log(`\nDone. Uploaded: ${ok}. Skipped: ${skipped}.`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
