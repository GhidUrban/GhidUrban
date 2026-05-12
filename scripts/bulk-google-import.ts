/**
 * Bulk import Google Places into Supabase (≥ preview target per run).
 *
 * Usage:
 *   npx tsx scripts/bulk-google-import.ts --city=bucuresti --category=restaurante --dry-run
 *   npx tsx scripts/bulk-google-import.ts --city=cluj-napoca --all-categories
 *   npx tsx scripts/bulk-google-import.ts --city=iasi --no-photos
 *
 * Default: --target=60 per category; after each insert uploads up to 3 photos to Storage when available.
 *
 * Env: GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
    GOOGLE_IMPORT_SUPPORTED_CATEGORIES,
    type GoogleImportSupportedCategory,
} from "../src/lib/google-import-categories";
import {
    addGooglePlaceIdVariantsToSet,
    runGoogleImportPreview,
    type GoogleImportPreviewRow,
} from "../src/lib/google-import";
import { PLACE_IMAGE_PLACEHOLDER } from "../src/lib/place-image";
import { placeIdSlugFromName } from "../src/lib/slug";
import { uploadGooglePhotosForPlace } from "../src/lib/google-place-photos-storage";

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

function parseIntArg(name: string, fallback: number): number {
    const v = argVal(name);
    if (v == null) return fallback;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
}

function hasFlag(name: string): boolean {
    return process.argv.includes(name);
}

function normalizeGid(raw: string | null | undefined): string {
    const t = raw?.trim() ?? "";
    if (!t) return "";
    return t.startsWith("places/") ? t : `places/${t}`;
}

function escapeIlikePattern(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function checkpointKey(ext: string): string {
    return normalizeGid(ext) || ext.trim();
}

function checkpointHas(set: Set<string>, ext: string): boolean {
    const k = checkpointKey(ext);
    if (set.has(k)) return true;
    const raw = ext.trim();
    if (raw && set.has(raw)) return true;
    return false;
}

type Checkpoint = {
    external_ids_committed: string[];
};

function loadCheckpoint(city: string, cat: string): Set<string> {
    const dir = path.join(process.cwd(), "scripts", ".checkpoints");
    const f = path.join(dir, `import-${city}-${cat}.json`);
    if (!fs.existsSync(f)) return new Set();
    try {
        const j = JSON.parse(fs.readFileSync(f, "utf8")) as Checkpoint;
        return new Set((j.external_ids_committed ?? []).map((x) => checkpointKey(String(x))));
    } catch {
        return new Set();
    }
}

function saveCheckpoint(city: string, cat: string, set: Set<string>): void {
    const dir = path.join(process.cwd(), "scripts", ".checkpoints");
    fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, `import-${city}-${cat}.json`);
    fs.writeFileSync(
        f,
        JSON.stringify({ external_ids_committed: Array.from(set) }, null, 2),
        "utf8",
    );
}

async function placeNameExists(
    sb: SupabaseClient,
    name: string,
    city: string,
    cat: string,
): Promise<boolean> {
    const n = name?.trim();
    if (!n) return false;
    const { data } = await sb
        .from("places")
        .select("place_id")
        .eq("city_slug", city)
        .eq("category_slug", cat)
        .ilike("name", escapeIlikePattern(n))
        .limit(1);
    return (data?.length ?? 0) > 0;
}

async function placeIdExists(sb: SupabaseClient, pid: string, city: string, cat: string): Promise<boolean> {
    const { data } = await sb
        .from("places")
        .select("place_id")
        .eq("place_id", pid)
        .eq("city_slug", city)
        .eq("category_slug", cat)
        .limit(1);
    return (data?.length ?? 0) > 0;
}

async function externalIdExists(sb: SupabaseClient, ext: string, city: string, cat: string): Promise<boolean> {
    const g = normalizeGid(ext);
    const variants = Array.from(new Set([ext.trim(), g].filter((v) => v.length > 0)));
    for (const v of variants) {
        const { data } = await sb
            .from("place_listings")
            .select("place_id")
            .eq("city_slug", city)
            .eq("category_slug", cat)
            .eq("external_place_id", v)
            .limit(1);
        if ((data?.length ?? 0) > 0) return true;
    }
    return false;
}

async function insertRow(sb: SupabaseClient, row: GoogleImportPreviewRow, place_id: string): Promise<void> {
    const gid = normalizeGid(row.external_place_id);
    const { error: e1 } = await sb.from("places").insert({
        place_id,
        city_slug: row.city_slug,
        category_slug: row.category_slug,
        name: row.name,
        description: "",
        address: row.address,
        schedule: row.schedule ?? "",
        image: PLACE_IMAGE_PLACEHOLDER,
        rating: row.rating ?? 0,
        phone: row.phone,
        website: row.website,
        maps_url: row.maps_url,
        latitude: row.latitude,
        longitude: row.longitude,
        status: "available",
    });
    if (e1) throw e1;

    const { error: e2 } = await sb.from("place_listings").upsert(
        {
            place_id,
            city_slug: row.city_slug,
            category_slug: row.category_slug,
            plan_type: "free",
            plan_expires_at: null,
            featured: false,
            featured_until: null,
            external_source: "google",
            external_place_id: row.external_place_id,
        },
        { onConflict: "place_id,city_slug,category_slug" },
    );
    if (e2) throw e2;

    const { error: e3 } = await sb.from("place_google_data").upsert(
        {
            place_id,
            city_slug: row.city_slug,
            category_slug: row.category_slug,
            google_place_id: gid || null,
            google_match_status: "review",
            google_match_score: row.completenessScore,
            google_maps_uri: row.maps_url,
            google_photo_uri: row.image,
            google_photo_name: null,
            synced_at: new Date().toISOString(),
        },
        { onConflict: "place_id,city_slug,category_slug" },
    );
    if (e3) throw e3;
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

async function runBulkForCategory(params: {
    sb: SupabaseClient;
    city: string;
    la: number;
    lo: number;
    category_slug: GoogleImportSupportedCategory;
    target: number;
    dry: boolean;
    syncPhotos: boolean;
    maxPhotos: number;
    photoDelayMs: number;
}): Promise<void> {
    const { sb, city, la, lo, category_slug, target, dry, syncPhotos, maxPhotos, photoDelayMs } = params;

    const { data: placeRows } = await sb
        .from("places")
        .select("place_id, name, address, latitude, longitude")
        .eq("city_slug", city)
        .eq("category_slug", category_slug);

    const { data: listRows } = await sb
        .from("place_listings")
        .select("place_id, external_place_id")
        .eq("city_slug", city)
        .eq("category_slug", category_slug);

    const extByPid = new Map<string, string | null>();
    for (const lr of listRows ?? []) {
        const r = lr as { place_id: string; external_place_id: string | null };
        extByPid.set(r.place_id, r.external_place_id ?? null);
    }

    const existing = (
        (placeRows ?? []) as {
            place_id: string;
            name: string | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
        }[]
    ).map((p) => ({
        external_place_id: extByPid.get(p.place_id) ?? null,
        name: p.name,
        address: p.address ?? null,
        latitude: p.latitude,
        longitude: p.longitude,
    }));

    const importedIds = new Set<string>();
    for (const r of existing) {
        const id = r.external_place_id?.trim();
        if (id) {
            addGooglePlaceIdVariantsToSet(importedIds, normalizeGid(id) || id);
        }
    }

    const { data: matchedGoogleRows } = await sb
        .from("place_google_data")
        .select("google_place_id")
        .eq("city_slug", city)
        .eq("category_slug", category_slug)
        .eq("google_match_status", "matched");

    for (const row of matchedGoogleRows ?? []) {
        const gid = (row as { google_place_id: string | null }).google_place_id?.trim();
        if (gid) {
            addGooglePlaceIdVariantsToSet(importedIds, gid);
        }
    }

    const checkpoint = loadCheckpoint(city, category_slug);
    // Place Details = 1 call per shortlist row; scale with target (was min 60 → expensive for --target=1).
    const previewTopN = Math.min(200, Math.max(target * 5, 24));
    const rawTarget = Math.min(200, Math.max(previewTopN * 2, 50, target * 4));

    console.log(
        JSON.stringify({
            phase: "preview",
            city,
            category_slug,
            target,
            previewTopN,
            rawCandidateTarget: rawTarget,
            dry_run: dry,
        }),
    );

    const { rows, meta } = await runGoogleImportPreview({
        apiKey: googleKey,
        city_slug: city,
        category_slug,
        cityCenter: { lat: la, lon: lo },
        existing,
        importedIds,
        previewTopN,
        rawCandidateTarget: rawTarget,
    });

    console.log("meta:", JSON.stringify(meta));

    let inserted = 0;
    let skipped = 0;
    const usedSlugs = new Set<string>();

    for (const row of rows) {
        if (inserted >= target) {
            break;
        }
        if (row.already_imported || row.likely_duplicate) {
            skipped++;
            continue;
        }
        const ext = row.external_place_id?.trim();
        if (!ext || checkpointHas(checkpoint, ext)) {
            skipped++;
            continue;
        }
        if (await externalIdExists(sb, ext, city, category_slug)) {
            skipped++;
            checkpoint.add(checkpointKey(ext));
            continue;
        }
        if (await placeNameExists(sb, row.name, city, category_slug)) {
            skipped++;
            continue;
        }

        const baseSlug = placeIdSlugFromName(row.name);
        if (!baseSlug) {
            skipped++;
            continue;
        }
        let place_id = baseSlug;
        let n = 2;
        while (usedSlugs.has(place_id) || (await placeIdExists(sb, place_id, city, category_slug))) {
            place_id = `${baseSlug}-${n}`;
            n++;
        }
        usedSlugs.add(place_id);

        if (dry) {
            console.log("[dry-run] would insert", place_id, row.name);
            inserted++;
            continue;
        }

        try {
            await insertRow(sb, { ...row, city_slug: city, category_slug }, place_id);
            checkpoint.add(checkpointKey(ext));
            inserted++;
            console.log("inserted", place_id, row.name);
            if (syncPhotos && maxPhotos > 0) {
                const photoRes = await uploadGooglePhotosForPlace(sb, {
                    apiKey: googleKey,
                    city_slug: city,
                    category_slug,
                    place_id,
                    external_place_id: ext,
                    maxPhotos,
                    photoDelayMs,
                });
                if (photoRes.count > 0) console.log("photos ok", photoRes.count, place_id);
            }
        } catch (e) {
            console.error("insert failed", place_id, e);
            skipped++;
        }
    }

    if (!dry) {
        saveCheckpoint(city, category_slug, checkpoint);
        const dir = path.join(process.cwd(), "scripts", ".checkpoints");
        fs.mkdirSync(dir, { recursive: true });
        const logPath = path.join(dir, "bulk-import-cost.jsonl");
        const logLine = {
            at: new Date().toISOString(),
            city,
            category_slug,
            meta,
            inserted,
            skipped,
            preview_rows: rows.length,
        };
        fs.appendFileSync(logPath, `${JSON.stringify(logLine)}\n`, "utf8");
    }

    console.log(
        JSON.stringify({
            phase: "done",
            preview_rows: rows.length,
            inserted,
            skipped,
            checkpoint_size: checkpoint.size,
        }),
    );
}

async function main() {
    const city = argVal("--city")?.trim();
    const categoryRaw = argVal("--category")?.trim();
    const allCategories = hasFlag("--all-categories");
    const target = Math.min(200, Math.max(1, parseIntArg("--target", 60)));
    const dry = hasFlag("--dry-run");
    const pauseMs = Math.max(0, parseIntArg("--between-categories-ms", 2500));
    const syncPhotos = !hasFlag("--no-photos");
    const maxPhotos = Math.min(3, Math.max(0, parseIntArg("--max-photos", 3)));
    const photoDelayMs = Math.max(0, parseIntArg("--photo-delay-ms", 180));

    if (!city) {
        console.error("Required: --city=slug");
        process.exit(1);
    }

    let categories: GoogleImportSupportedCategory[];
    if (allCategories) {
        categories = [...GOOGLE_IMPORT_SUPPORTED_CATEGORIES];
    } else {
        if (!categoryRaw) {
            console.error("Use --category=slug or --all-categories");
            process.exit(1);
        }
        if (!GOOGLE_IMPORT_SUPPORTED_CATEGORIES.includes(categoryRaw as GoogleImportSupportedCategory)) {
            console.error("Invalid category. Use:", GOOGLE_IMPORT_SUPPORTED_CATEGORIES.join(", "));
            process.exit(1);
        }
        categories = [categoryRaw as GoogleImportSupportedCategory];
    }

    const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: cityRow, error: cErr } = await sb
        .from("cities")
        .select("latitude, longitude")
        .eq("slug", city)
        .maybeSingle();
    if (cErr || !cityRow) {
        console.error("City not found:", city);
        process.exit(1);
    }
    const la = Number((cityRow as { latitude: number | null }).latitude);
    const lo = Number((cityRow as { longitude: number | null }).longitude);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
        console.error("City missing coordinates:", city);
        process.exit(1);
    }

    console.log(
        JSON.stringify({
            phase: "start",
            city,
            categories: categories.length,
            category_slugs: categories,
            target_per_category: target,
            dry_run: dry,
            sync_photos: syncPhotos && !dry && maxPhotos > 0,
            max_photos: syncPhotos ? maxPhotos : 0,
        }),
    );

    for (let ci = 0; ci < categories.length; ci++) {
        const category_slug = categories[ci]!;
        if (ci > 0 && pauseMs > 0) {
            console.log(`pause ${pauseMs}ms before ${category_slug}`);
            await sleep(pauseMs);
        }
        await runBulkForCategory({
            sb,
            city,
            la,
            lo,
            category_slug,
            target,
            dry,
            syncPhotos,
            maxPhotos,
            photoDelayMs,
        });
    }

    console.log(JSON.stringify({ phase: "all_done", city, categories_run: categories.length }));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
