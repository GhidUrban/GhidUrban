/**
 * Copy existing Supabase Storage images (bucket "places") → Cloudflare R2,
 * then replace DB URLs with R2 public URLs.
 *
 * Safe: no deletes from Supabase Storage. DB updates only after successful upload.
 *
 * Usage:
 *   DRY_RUN=true SOURCE=places LIMIT=10 npx tsx scripts/migrate-supabase-storage-images-to-r2.ts
 *   DRY_RUN=false SOURCE=places LIMIT=10 npx tsx scripts/migrate-supabase-storage-images-to-r2.ts
 *   DRY_RUN=true SOURCE=place_photos LIMIT=10 npx tsx scripts/migrate-supabase-storage-images-to-r2.ts
 *   DRY_RUN=false SOURCE=place_photos LIMIT=10 npx tsx scripts/migrate-supabase-storage-images-to-r2.ts
 *   DRY_RUN=true SOURCE=places_image LIMIT=3 npx tsx scripts/migrate-supabase-storage-images-to-r2.ts
 *   DRY_RUN=false SOURCE=places_image LIMIT=3 npx tsx scripts/migrate-supabase-storage-images-to-r2.ts
 *   DRY_RUN=false SOURCE=all npx tsx scripts/migrate-supabase-storage-images-to-r2.ts
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 *
 * DRY_RUN defaults to true if unset.
 * SOURCE defaults to all (places, then place_photos).
 */

import dotenv from "dotenv";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
    buildPublicUrl,
    createR2Client,
    getR2Config,
    type R2Config,
    uploadToR2,
} from "../src/lib/r2/client";

dotenv.config({ path: ".env.local" });

const R2_KEY_PREFIX = "supabase-places";
const STORAGE_PUBLIC_MARKER = "/storage/v1/object/public/places/";
const DOWNLOAD_DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 30_000;
const PAGE_SIZE = 200;

type SourceKind = "places" | "place_photos" | "places_image";

type SkipReason = "empty_url" | "already_r2" | "non_supabase_url";

type Stats = {
    scanned: number;
    eligible: number;
    skipped: Record<SkipReason, number>;
    migrated: number;
    failed: number;
    dryRunPlanned: number;
};

type PlacesRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    image_storage_path: string | null;
};

type PlacesImageRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    image: string | null;
};

type PlacePhotosRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    sort_order: number;
    storage_path: string | null;
};

function parseBoolEnv(name: string, defaultValue: boolean): boolean {
    const raw = process.env[name]?.trim().toLowerCase();
    if (!raw) return defaultValue;
    if (raw === "true" || raw === "1" || raw === "yes") return true;
    if (raw === "false" || raw === "0" || raw === "no") return false;
    console.warn(`Unknown ${name}=${raw}, using default ${defaultValue}`);
    return defaultValue;
}

function parseLimitEnv(): number | null {
    const raw = process.env.LIMIT?.trim();
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) {
        console.error(`Invalid LIMIT=${raw} — must be a positive integer`);
        process.exit(1);
    }
    return n;
}

function parseSourceEnv(): SourceKind[] {
    const raw = (process.env.SOURCE?.trim().toLowerCase() || "all") as string;
    if (raw === "all") return ["places", "place_photos"];
    if (raw === "places") return ["places"];
    if (raw === "place_photos") return ["place_photos"];
    if (raw === "places_image") return ["places_image"];
    console.error(`Invalid SOURCE=${raw} — use places, place_photos, places_image, or all`);
    process.exit(1);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function contentTypeFromPath(objectPath: string): string {
    const lower = objectPath.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".avif")) return "image/avif";
    return "image/jpeg";
}

function normalizeObjectPath(path: string): string {
    let p = path.trim();
    try {
        p = decodeURIComponent(p);
    } catch {
        /* keep raw path */
    }
    return p.replace(/^\/+/, "");
}

function extractSupabasePlacesObjectPath(url: string): string | null {
    const idx = url.indexOf(STORAGE_PUBLIC_MARKER);
    if (idx < 0) return null;
    const rest = url.slice(idx + STORAGE_PUBLIC_MARKER.length).split("?")[0]?.split("#")[0]?.trim();
    if (!rest) return null;
    return normalizeObjectPath(rest);
}

function buildR2Key(objectPath: string): string {
    const clean = objectPath.replace(/^\/+/, "");
    return `${R2_KEY_PREFIX}/${clean}`;
}

function classifyUrl(
    urlRaw: string | null | undefined,
    r2PublicUrl: string,
): { skip: SkipReason } | { ok: true; url: string; objectPath: string; r2Key: string; newUrl: string } {
    const url = urlRaw?.trim() ?? "";
    if (!url) {
        return { skip: "empty_url" };
    }

    const publicBase = r2PublicUrl.replace(/\/+$/, "");
    if (url === publicBase || url.startsWith(`${publicBase}/`)) {
        return { skip: "already_r2" };
    }

    const objectPath = extractSupabasePlacesObjectPath(url);
    if (!objectPath) {
        return { skip: "non_supabase_url" };
    }

    const r2Key = buildR2Key(objectPath);
    const newUrl = buildPublicUrl(publicBase, r2Key);
    return { ok: true, url, objectPath, r2Key, newUrl };
}

/** Strict download for places.image — must be HTTP 200, image/*, non-empty body. */
async function downloadImageStrict(
    url: string,
): Promise<
    | { ok: true; body: Buffer; contentType: string }
    | { ok: false; reason: string }
> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
        if (res.status !== 200) {
            return { ok: false, reason: `HTTP ${res.status}` };
        }

        const headerCt = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
        if (!headerCt.startsWith("image/")) {
            return { ok: false, reason: `content-type must be image/* (got ${headerCt || "empty"})` };
        }

        const body = Buffer.from(await res.arrayBuffer());
        if (body.length === 0) {
            return { ok: false, reason: "Empty response body" };
        }

        return { ok: true, body, contentType: headerCt };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: msg };
    } finally {
        clearTimeout(timeout);
    }
}

async function verifyR2ObjectInBucket(
    client: S3Client,
    config: R2Config,
    key: string,
): Promise<{ ok: true; contentLength: number } | { ok: false; reason: string }> {
    try {
        const head = await client.send(
            new HeadObjectCommand({
                Bucket: config.bucketName,
                Key: key,
            }),
        );
        const len = head.ContentLength ?? 0;
        if (len < 1) {
            return { ok: false, reason: "R2 object has zero ContentLength" };
        }
        return { ok: true, contentLength: len };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: `R2 HeadObject: ${msg}` };
    }
}

async function verifyPublicImageUrlWithRetry(
    url: string,
    attempts = 5,
    delayMs = 2000,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    let lastReason = "unknown";
    for (let i = 0; i < attempts; i++) {
        const result = await verifyPublicImageUrl(url);
        if (result.ok) return result;
        lastReason = result.reason;
        if (i < attempts - 1) await sleep(delayMs);
    }
    return { ok: false, reason: `${lastReason} (after ${attempts} attempts)` };
}

async function verifyPublicImageUrl(
    url: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
        if (res.status !== 200) {
            return { ok: false, reason: `public URL HEAD ${res.status}` };
        }
        const headerCt = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
        if (!headerCt.startsWith("image/")) {
            return { ok: false, reason: `public URL content-type ${headerCt || "empty"}` };
        }
        return { ok: true };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: msg };
    } finally {
        clearTimeout(timeout);
    }
}

async function downloadFile(
    url: string,
): Promise<
    | { ok: true; body: Buffer; contentType: string }
    | { ok: false; reason: string }
> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
        if (res.status !== 200) {
            return { ok: false, reason: `HTTP ${res.status}` };
        }

        const headerCt = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
        const body = Buffer.from(await res.arrayBuffer());
        if (body.length === 0) {
            return { ok: false, reason: "Empty response body" };
        }

        const contentType =
            headerCt && (headerCt.startsWith("image/") || headerCt === "application/octet-stream")
                ? headerCt === "application/octet-stream"
                    ? contentTypeFromPath(url)
                    : headerCt
                : contentTypeFromPath(url);

        return { ok: true, body, contentType };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: msg };
    } finally {
        clearTimeout(timeout);
    }
}

function emptyStats(): Stats {
    return {
        scanned: 0,
        eligible: 0,
        skipped: { empty_url: 0, already_r2: 0, non_supabase_url: 0 },
        migrated: 0,
        failed: 0,
        dryRunPlanned: 0,
    };
}

function logSkip(stats: Stats, reason: SkipReason): void {
    stats.skipped[reason] += 1;
}

async function processPlacesSource(
    supabase: SupabaseClient,
    opts: {
        dryRun: boolean;
        r2PublicUrl: string;
        r2Client: ReturnType<typeof createR2Client> | null;
        r2Config: ReturnType<typeof getR2Config>;
        limitRemaining: () => number | null;
        consumeLimit: () => void;
    },
): Promise<Stats> {
    const stats = emptyStats();
    let offset = 0;

    while (true) {
        const remaining = opts.limitRemaining();
        if (remaining !== null && remaining <= 0) break;

        const { data, error } = await supabase
            .from("places")
            .select("place_id, city_slug, category_slug, image_storage_path")
            .not("image_storage_path", "is", null)
            .order("place_id", { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error("[places] query failed:", error.message);
            process.exit(1);
        }

        const rows = (data ?? []) as PlacesRow[];
        if (rows.length === 0) break;

        for (const row of rows) {
            stats.scanned += 1;

            const classified = classifyUrl(row.image_storage_path, opts.r2PublicUrl);
            if ("skip" in classified) {
                logSkip(stats, classified.skip);
                continue;
            }

            stats.eligible += 1;

            const remainingNow = opts.limitRemaining();
            if (remainingNow !== null && remainingNow <= 0) continue;

            opts.consumeLimit();

            const label = `places|${row.place_id}|${row.city_slug}|${row.category_slug}`;

            if (opts.dryRun) {
                stats.dryRunPlanned += 1;
                console.log(`[DRY RUN] ${label}`);
                console.log(`  old: ${classified.url}`);
                console.log(`  new: ${classified.newUrl}`);
                console.log(`  key: ${classified.r2Key}`);
                console.log("");
                continue;
            }

            const downloaded = await downloadFile(classified.url);
            if (!downloaded.ok) {
                stats.failed += 1;
                console.error(`[FAIL] ${label} — download: ${downloaded.reason}`);
                console.error(`  old: ${classified.url}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            try {
                await uploadToR2({
                    client: opts.r2Client!,
                    config: opts.r2Config,
                    key: classified.r2Key,
                    body: downloaded.body,
                    contentType: downloaded.contentType,
                });
            } catch (e) {
                stats.failed += 1;
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`[FAIL] ${label} — upload: ${msg}`);
                console.error(`  old: ${classified.url}`);
                console.error(`  key: ${classified.r2Key}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            const { error: updateError } = await supabase
                .from("places")
                .update({ image_storage_path: classified.newUrl })
                .eq("place_id", row.place_id)
                .eq("city_slug", row.city_slug)
                .eq("category_slug", row.category_slug);

            if (updateError) {
                stats.failed += 1;
                console.error(`[FAIL] ${label} — DB update: ${updateError.message}`);
                console.error(`  uploaded key: ${classified.r2Key}`);
                console.error(`  new URL (not saved): ${classified.newUrl}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            stats.migrated += 1;
            console.log(`[OK] ${label}`);
            console.log(`  old: ${classified.url}`);
            console.log(`  new: ${classified.newUrl}`);
            console.log(`  key: ${classified.r2Key}`);
            console.log("");

            await sleep(DOWNLOAD_DELAY_MS);
        }

        offset += rows.length;
        if (rows.length < PAGE_SIZE) break;
    }

    return stats;
}

async function processPlacesImageSource(
    supabase: SupabaseClient,
    opts: {
        dryRun: boolean;
        r2PublicUrl: string;
        r2Client: ReturnType<typeof createR2Client> | null;
        r2Config: ReturnType<typeof getR2Config>;
        limitRemaining: () => number | null;
        consumeLimit: () => void;
    },
): Promise<Stats> {
    const stats = emptyStats();
    let offset = 0;

    while (true) {
        const remaining = opts.limitRemaining();
        if (remaining !== null && remaining <= 0) break;

        const { data, error } = await supabase
            .from("places")
            .select("place_id, city_slug, category_slug, name, image")
            .not("image", "is", null)
            .ilike("image", `%${STORAGE_PUBLIC_MARKER}%`)
            .order("place_id", { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error("[places_image] query failed:", error.message);
            process.exit(1);
        }

        const rows = (data ?? []) as PlacesImageRow[];
        if (rows.length === 0) break;

        for (const row of rows) {
            stats.scanned += 1;

            const classified = classifyUrl(row.image, opts.r2PublicUrl);
            if ("skip" in classified) {
                logSkip(stats, classified.skip);
                continue;
            }

            stats.eligible += 1;

            const remainingNow = opts.limitRemaining();
            if (remainingNow !== null && remainingNow <= 0) continue;

            opts.consumeLimit();

            const label = `places_image|${row.name}|${row.city_slug}|${row.category_slug}`;

            console.log(`[places_image] ${label}`);
            console.log(`  old URL: ${classified.url}`);
            console.log(`  object path: ${classified.objectPath}`);
            console.log(`  R2 key: ${classified.r2Key}`);
            console.log(`  new URL: ${classified.newUrl}`);

            if (opts.dryRun) {
                stats.dryRunPlanned += 1;
                console.log("  (dry run — no download, upload, or DB change)");
                console.log("");
                continue;
            }

            const downloaded = await downloadImageStrict(classified.url);
            if (!downloaded.ok) {
                stats.failed += 1;
                console.error(`  download FAIL: ${downloaded.reason}`);
                console.log("");
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }
            console.log(
                `  download OK (${downloaded.body.length} bytes, ${downloaded.contentType})`,
            );

            try {
                await uploadToR2({
                    client: opts.r2Client!,
                    config: opts.r2Config,
                    key: classified.r2Key,
                    body: downloaded.body,
                    contentType: downloaded.contentType,
                });
            } catch (e) {
                stats.failed += 1;
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`  upload FAIL: ${msg}`);
                console.log("");
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }
            console.log("  upload OK");

            const bucketVerify = await verifyR2ObjectInBucket(
                opts.r2Client!,
                opts.r2Config,
                classified.r2Key,
            );
            if (!bucketVerify.ok) {
                stats.failed += 1;
                console.error(`  R2 verify FAIL: ${bucketVerify.reason}`);
                console.log("");
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }
            console.log(`  R2 verify OK (${bucketVerify.contentLength} bytes in bucket)`);

            const publicVerify = await verifyPublicImageUrlWithRetry(classified.newUrl);
            if (!publicVerify.ok) {
                stats.failed += 1;
                console.error(`  public URL verify FAIL: ${publicVerify.reason}`);
                console.error("  DB not updated — fix R2_PUBLIC_URL / custom domain, then retry.");
                console.log("");
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }
            console.log("  public URL verify OK");

            const { error: updateError } = await supabase
                .from("places")
                .update({ image: classified.newUrl })
                .eq("place_id", row.place_id)
                .eq("city_slug", row.city_slug)
                .eq("category_slug", row.category_slug);

            if (updateError) {
                stats.failed += 1;
                console.error(`  DB update FAIL: ${updateError.message}`);
                console.error(`  (object is in R2 at key ${classified.r2Key})`);
                console.log("");
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            stats.migrated += 1;
            console.log("  DB update OK");
            console.log("");

            await sleep(DOWNLOAD_DELAY_MS);
        }

        offset += rows.length;
        if (rows.length < PAGE_SIZE) break;
    }

    return stats;
}

async function processPlacePhotosSource(
    supabase: SupabaseClient,
    opts: {
        dryRun: boolean;
        r2PublicUrl: string;
        r2Client: ReturnType<typeof createR2Client> | null;
        r2Config: ReturnType<typeof getR2Config>;
        limitRemaining: () => number | null;
        consumeLimit: () => void;
    },
): Promise<Stats> {
    const stats = emptyStats();
    let offset = 0;

    while (true) {
        const remaining = opts.limitRemaining();
        if (remaining !== null && remaining <= 0) break;

        const { data, error } = await supabase
            .from("place_photos")
            .select("place_id, city_slug, category_slug, sort_order, storage_path")
            .not("storage_path", "is", null)
            .order("place_id", { ascending: true })
            .order("sort_order", { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error("[place_photos] query failed:", error.message);
            process.exit(1);
        }

        const rows = (data ?? []) as PlacePhotosRow[];
        if (rows.length === 0) break;

        for (const row of rows) {
            stats.scanned += 1;

            const classified = classifyUrl(row.storage_path, opts.r2PublicUrl);
            if ("skip" in classified) {
                logSkip(stats, classified.skip);
                continue;
            }

            stats.eligible += 1;

            const remainingNow = opts.limitRemaining();
            if (remainingNow !== null && remainingNow <= 0) continue;

            opts.consumeLimit();

            const label = `place_photos|${row.place_id}|${row.city_slug}|${row.category_slug}|sort=${row.sort_order}`;

            if (opts.dryRun) {
                stats.dryRunPlanned += 1;
                console.log(`[DRY RUN] ${label}`);
                console.log(`  old: ${classified.url}`);
                console.log(`  new: ${classified.newUrl}`);
                console.log(`  key: ${classified.r2Key}`);
                console.log("");
                continue;
            }

            const downloaded = await downloadFile(classified.url);
            if (!downloaded.ok) {
                stats.failed += 1;
                console.error(`[FAIL] ${label} — download: ${downloaded.reason}`);
                console.error(`  old: ${classified.url}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            try {
                await uploadToR2({
                    client: opts.r2Client!,
                    config: opts.r2Config,
                    key: classified.r2Key,
                    body: downloaded.body,
                    contentType: downloaded.contentType,
                });
            } catch (e) {
                stats.failed += 1;
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`[FAIL] ${label} — upload: ${msg}`);
                console.error(`  old: ${classified.url}`);
                console.error(`  key: ${classified.r2Key}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            const { error: updateError } = await supabase
                .from("place_photos")
                .update({ storage_path: classified.newUrl })
                .eq("place_id", row.place_id)
                .eq("city_slug", row.city_slug)
                .eq("category_slug", row.category_slug)
                .eq("sort_order", row.sort_order);

            if (updateError) {
                stats.failed += 1;
                console.error(`[FAIL] ${label} — DB update: ${updateError.message}`);
                console.error(`  uploaded key: ${classified.r2Key}`);
                console.error(`  new URL (not saved): ${classified.newUrl}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            stats.migrated += 1;
            console.log(`[OK] ${label}`);
            console.log(`  old: ${classified.url}`);
            console.log(`  new: ${classified.newUrl}`);
            console.log(`  key: ${classified.r2Key}`);
            console.log("");

            await sleep(DOWNLOAD_DELAY_MS);
        }

        offset += rows.length;
        if (rows.length < PAGE_SIZE) break;
    }

    return stats;
}

function mergeStats(into: Stats, from: Stats): void {
    into.scanned += from.scanned;
    into.eligible += from.eligible;
    into.migrated += from.migrated;
    into.failed += from.failed;
    into.dryRunPlanned += from.dryRunPlanned;
    for (const k of Object.keys(from.skipped) as SkipReason[]) {
        into.skipped[k] += from.skipped[k];
    }
}

function printStats(label: string, stats: Stats, dryRun: boolean): void {
    console.log(`--- ${label} ---`);
    console.log(`Scanned:                  ${stats.scanned}`);
    console.log(`Eligible:                 ${stats.eligible}`);
    console.log(`Skipped empty URL:        ${stats.skipped.empty_url}`);
    console.log(`Skipped already R2:       ${stats.skipped.already_r2}`);
    console.log(`Skipped non-Supabase URL: ${stats.skipped.non_supabase_url}`);
    if (dryRun) {
        console.log(`Dry-run planned:          ${stats.dryRunPlanned}`);
    } else {
        console.log(`Migrated:                 ${stats.migrated}`);
        console.log(`Failed:                   ${stats.failed}`);
    }
    console.log("");
}

async function main() {
    const dryRun = parseBoolEnv("DRY_RUN", true);
    const limit = parseLimitEnv();
    const sources = parseSourceEnv();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !serviceKey) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
        process.exit(1);
    }

    let r2Config: ReturnType<typeof getR2Config>;
    let r2Client: ReturnType<typeof createR2Client> | null = null;

    if (!dryRun) {
        try {
            r2Config = getR2Config();
            r2Client = createR2Client(r2Config);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`R2 config error: ${msg}`);
            process.exit(1);
        }
    } else {
        r2Config = {
            accountId: "",
            accessKeyId: "",
            secretAccessKey: "",
            bucketName: process.env.R2_BUCKET_NAME?.trim() || "ghidurban-media",
            publicUrl:
                process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "") ?? "https://media.ghidurban.ro",
        };
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    let limitLeft = limit;
    const processOpts = {
        dryRun,
        r2PublicUrl: r2Config.publicUrl,
        r2Client,
        r2Config,
        limitRemaining: () => limitLeft,
        consumeLimit: () => {
            if (limitLeft !== null) limitLeft -= 1;
        },
    };

    const total = emptyStats();

    console.log("=== GhidUrban: migrate Supabase Storage → R2 ===");
    console.log(`DRY_RUN=${dryRun} SOURCE=${process.env.SOURCE?.trim() || "all"}${limit != null ? ` LIMIT=${limit}` : ""}`);
    console.log(`R2_PUBLIC_URL=${r2Config.publicUrl}`);
    console.log(`R2 key prefix: ${R2_KEY_PREFIX}/`);
    console.log("");

    if (sources.includes("places")) {
        const placesStats = await processPlacesSource(supabase, processOpts);
        printStats("places.image_storage_path", placesStats, dryRun);
        mergeStats(total, placesStats);
    }

    if (sources.includes("place_photos")) {
        const photosStats = await processPlacePhotosSource(supabase, processOpts);
        printStats("place_photos.storage_path", photosStats, dryRun);
        mergeStats(total, photosStats);
    }

    if (sources.includes("places_image")) {
        const imageStats = await processPlacesImageSource(supabase, processOpts);
        printStats("places.image", imageStats, dryRun);
        mergeStats(total, imageStats);
    }

    console.log("=== Total summary ===");
    printStats("all sources", total, dryRun);
    if (limit != null) {
        const processed = dryRun ? total.dryRunPlanned : total.migrated + total.failed;
        console.log(`(LIMIT=${limit} — processed up to ${processed} eligible rows across selected sources)`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
