/**
 * Copy place_google_data images from google_photo_uri → Cloudflare R2,
 * then update google_photo_uri to the public R2 URL.
 *
 * Safe: no deletes. DB updates only after successful upload.
 *
 * Usage:
 *   DRY_RUN=true LIMIT=5 npx tsx scripts/migrate-google-photos-to-r2.ts
 *   DRY_RUN=false LIMIT=5 npx tsx scripts/migrate-google-photos-to-r2.ts
 *   DRY_RUN=false npx tsx scripts/migrate-google-photos-to-r2.ts
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 *
 * DRY_RUN defaults to true if unset.
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
    buildPublicUrl,
    createR2Client,
    getR2Config,
    uploadToR2,
} from "../src/lib/r2/client";
import { buildR2ObjectKey } from "../src/lib/r2/object-key";

dotenv.config({ path: ".env.local" });

const DOWNLOAD_DELAY_MS = 400;
const FETCH_TIMEOUT_MS = 30_000;
const PAGE_SIZE = 200;

type PlaceGooglePhotoRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    google_photo_uri: string | null;
    google_photo_name: string | null;
};

type SkipReason = "empty_uri" | "already_r2" | "empty_photo_name";

type Stats = {
    scanned: number;
    eligible: number;
    skipped: Record<SkipReason, number>;
    migrated: number;
    failed: number;
    dryRunPlanned: number;
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

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function rowKey(row: PlaceGooglePhotoRow): string {
    return `${row.place_id}|${row.city_slug}|${row.category_slug}`;
}

function classifyRow(row: PlaceGooglePhotoRow, r2PublicUrl: string): SkipReason | null {
    const uri = row.google_photo_uri?.trim() ?? "";
    if (!uri) return "empty_uri";

    const publicBase = r2PublicUrl.replace(/\/+$/, "");
    if (uri === publicBase || uri.startsWith(`${publicBase}/`)) {
        return "already_r2";
    }

    const photoName = row.google_photo_name?.trim() ?? "";
    if (!photoName) return "empty_photo_name";

    return null;
}

async function downloadImage(
    url: string,
): Promise<
    | { ok: true; body: Buffer; contentType: string }
    | { ok: false; reason: string }
> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            redirect: "follow",
        });

        if (res.status !== 200) {
            return { ok: false, reason: `HTTP ${res.status}` };
        }

        const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
        if (!contentType.startsWith("image/")) {
            return { ok: false, reason: `Invalid content-type: ${contentType || "(missing)"}` };
        }

        const body = Buffer.from(await res.arrayBuffer());
        if (body.length === 0) {
            return { ok: false, reason: "Empty response body" };
        }

        return { ok: true, body, contentType };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: msg };
    } finally {
        clearTimeout(timeout);
    }
}

async function main() {
    const dryRun = parseBoolEnv("DRY_RUN", true);
    const limit = parseLimitEnv();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !serviceKey) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
        process.exit(1);
    }

    let r2Config: ReturnType<typeof getR2Config> | null = null;
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
        const publicUrl =
            process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "") ?? "https://media.ghidurban.ro";
        r2Config = {
            accountId: "",
            accessKeyId: "",
            secretAccessKey: "",
            bucketName: process.env.R2_BUCKET_NAME?.trim() || "ghidurban-media",
            publicUrl,
        };
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const stats: Stats = {
        scanned: 0,
        eligible: 0,
        skipped: {
            empty_uri: 0,
            already_r2: 0,
            empty_photo_name: 0,
        },
        migrated: 0,
        failed: 0,
        dryRunPlanned: 0,
    };

    console.log("=== GhidUrban: migrate google_photo_uri → R2 ===");
    console.log(`DRY_RUN=${dryRun}${limit != null ? ` LIMIT=${limit}` : ""}`);
    console.log(`R2_PUBLIC_URL=${r2Config.publicUrl}`);
    console.log("");

    let offset = 0;
    let processedEligible = 0;
    let stopPaging = false;

    while (!stopPaging) {
        const { data, error } = await supabase
            .from("place_google_data")
            .select("place_id, city_slug, category_slug, google_photo_uri, google_photo_name")
            .not("google_photo_uri", "is", null)
            .order("place_id", { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error("Supabase query failed:", error.message);
            process.exit(1);
        }

        const rows = (data ?? []) as PlaceGooglePhotoRow[];
        if (rows.length === 0) break;

        for (const row of rows) {
            stats.scanned += 1;

            const skipReason = classifyRow(row, r2Config.publicUrl);
            if (skipReason) {
                stats.skipped[skipReason] += 1;
                continue;
            }

            stats.eligible += 1;

            if (limit != null && processedEligible >= limit) {
                continue;
            }

            processedEligible += 1;

            const oldUrl = row.google_photo_uri!.trim();
            const photoName = row.google_photo_name!.trim();

            if (dryRun) {
                stats.dryRunPlanned += 1;
                console.log(`[DRY RUN] ${rowKey(row)}`);
                console.log(`  old: ${oldUrl}`);
                console.log(`  key base: ${photoName}`);
                console.log(`  would upload → ${r2Config.publicUrl}/<key-with-ext>`);
                console.log("");
                continue;
            }

            const downloaded = await downloadImage(oldUrl);
            if (!downloaded.ok) {
                stats.failed += 1;
                console.error(`[FAIL] ${rowKey(row)} — download: ${downloaded.reason}`);
                console.error(`  old: ${oldUrl}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            const objectKey = buildR2ObjectKey(photoName, downloaded.contentType);
            const newUrl = buildPublicUrl(r2Config.publicUrl, objectKey);

            try {
                await uploadToR2({
                    client: r2Client!,
                    config: r2Config,
                    key: objectKey,
                    body: downloaded.body,
                    contentType: downloaded.contentType,
                });
            } catch (e) {
                stats.failed += 1;
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`[FAIL] ${rowKey(row)} — upload: ${msg}`);
                console.error(`  old: ${oldUrl}`);
                console.error(`  key: ${objectKey}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            const { error: updateError } = await supabase
                .from("place_google_data")
                .update({ google_photo_uri: newUrl })
                .eq("place_id", row.place_id)
                .eq("city_slug", row.city_slug)
                .eq("category_slug", row.category_slug);

            if (updateError) {
                stats.failed += 1;
                console.error(`[FAIL] ${rowKey(row)} — DB update: ${updateError.message}`);
                console.error(`  uploaded key: ${objectKey}`);
                console.error(`  new URL (not saved): ${newUrl}`);
                await sleep(DOWNLOAD_DELAY_MS);
                continue;
            }

            stats.migrated += 1;
            console.log(`[OK] ${rowKey(row)}`);
            console.log(`  old: ${oldUrl}`);
            console.log(`  new: ${newUrl}`);
            console.log(`  key: ${objectKey}`);
            console.log("");

            await sleep(DOWNLOAD_DELAY_MS);
        }

        offset += rows.length;
        if (rows.length < PAGE_SIZE) break;
        if (limit != null && processedEligible >= limit) {
            stopPaging = true;
        }
    }

    console.log("=== Summary ===");
    console.log(`Scanned rows:             ${stats.scanned}`);
    console.log(`Eligible rows:            ${stats.eligible}`);
    console.log(`Skipped empty URI:        ${stats.skipped.empty_uri}`);
    console.log(`Skipped already on R2:    ${stats.skipped.already_r2}`);
    console.log(`Skipped no photo_name:    ${stats.skipped.empty_photo_name}`);
    if (dryRun) {
        console.log(`Dry-run planned:          ${stats.dryRunPlanned}`);
    } else {
        console.log(`Migrated:                 ${stats.migrated}`);
        console.log(`Failed:                   ${stats.failed}`);
    }
    if (limit != null && processedEligible >= limit) {
        console.log(`(LIMIT=${limit} — processed ${processedEligible} eligible rows)`);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
