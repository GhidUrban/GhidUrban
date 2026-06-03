/**
 * Remove Supabase Storage objects in bucket "places" that are no longer
 * referenced in the database (after R2 migration).
 *
 * Does NOT touch R2. Does NOT delete the bucket. Does NOT change the DB.
 *
 * Usage (from ghidurban/):
 *   DRY_RUN=true npx tsx scripts/cleanup-unused-supabase-storage-places.ts
 *   DRY_RUN=true LIMIT=50 npx tsx scripts/cleanup-unused-supabase-storage-places.ts
 *   DRY_RUN=false LIMIT=50 npx tsx scripts/cleanup-unused-supabase-storage-places.ts
 *   DRY_RUN=false LIMIT=500 npx tsx scripts/cleanup-unused-supabase-storage-places.ts
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: SUPABASE_PLACE_IMAGES_BUCKET (default "places")
 *
 * DRY_RUN defaults to true if unset.
 */

import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const STORAGE_PUBLIC_MARKER = "/storage/v1/object/public/places/";
const DB_PAGE_SIZE = 500;
const LIST_PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 50;

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

function normalizeObjectPath(path: string): string {
    return path.replace(/^\/+/, "").trim();
}

function extractSupabasePlacesObjectPath(url: string): string | null {
    const idx = url.indexOf(STORAGE_PUBLIC_MARKER);
    if (idx < 0) return null;
    const rest = url.slice(idx + STORAGE_PUBLIC_MARKER.length).split("?")[0]?.split("#")[0]?.trim();
    if (!rest) return null;
    try {
        return normalizeObjectPath(decodeURIComponent(rest));
    } catch {
        return normalizeObjectPath(rest);
    }
}

function addReferencedFromUrl(referenced: Set<string>, value: string | null | undefined): void {
    const url = value?.trim() ?? "";
    if (!url || !url.includes(STORAGE_PUBLIC_MARKER)) return;
    const objectPath = extractSupabasePlacesObjectPath(url);
    if (objectPath) referenced.add(objectPath);
}

async function loadReferencedPaths(supabase: SupabaseClient): Promise<Set<string>> {
    const referenced = new Set<string>();

    let offset = 0;
    while (true) {
        const { data, error } = await supabase
            .from("places")
            .select("image_storage_path, image")
            .order("place_id", { ascending: true })
            .range(offset, offset + DB_PAGE_SIZE - 1);

        if (error) {
            console.error("[DB] places query failed:", error.message);
            process.exit(1);
        }

        const rows = data ?? [];
        if (rows.length === 0) break;

        for (const row of rows) {
            const r = row as { image_storage_path: string | null; image: string | null };
            addReferencedFromUrl(referenced, r.image_storage_path);
            addReferencedFromUrl(referenced, r.image);
        }

        if (rows.length < DB_PAGE_SIZE) break;
        offset += DB_PAGE_SIZE;
    }

    offset = 0;
    while (true) {
        const { data, error } = await supabase
            .from("place_photos")
            .select("storage_path")
            .order("place_id", { ascending: true })
            .range(offset, offset + DB_PAGE_SIZE - 1);

        if (error) {
            console.error("[DB] place_photos query failed:", error.message);
            process.exit(1);
        }

        const rows = data ?? [];
        if (rows.length === 0) break;

        for (const row of rows) {
            const r = row as { storage_path: string | null };
            addReferencedFromUrl(referenced, r.storage_path);
        }

        if (rows.length < DB_PAGE_SIZE) break;
        offset += DB_PAGE_SIZE;
    }

    return referenced;
}

async function listAllStoragePaths(
    supabase: SupabaseClient,
    bucket: string,
    folder = "",
): Promise<{ paths: string[]; listErrors: number }> {
    const paths: string[] = [];
    let listErrors = 0;
    let offset = 0;

    while (true) {
        const { data, error } = await supabase.storage.from(bucket).list(folder, {
            limit: LIST_PAGE_SIZE,
            offset,
            sortBy: { column: "name", order: "asc" },
        });

        if (error) {
            listErrors += 1;
            const label = folder || "(root)";
            console.error(`[LIST FAIL] ${label}: ${error.message}`);
            return { paths, listErrors };
        }

        const items = data ?? [];
        if (items.length === 0) break;

        for (const item of items) {
            const childPath = folder ? `${folder}/${item.name}` : item.name;
            const objectPath = normalizeObjectPath(childPath);

            // Folders have id === null in Supabase Storage list API
            if (item.id === null) {
                const nested = await listAllStoragePaths(supabase, bucket, objectPath);
                paths.push(...nested.paths);
                listErrors += nested.listErrors;
            } else {
                paths.push(objectPath);
            }
        }

        if (items.length < LIST_PAGE_SIZE) break;
        offset += LIST_PAGE_SIZE;
    }

    return { paths, listErrors };
}

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
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

    const bucket = process.env.SUPABASE_PLACE_IMAGES_BUCKET?.trim() || "places";

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log("=== GhidUrban: cleanup unused Supabase Storage (places bucket) ===");
    console.log(`DRY_RUN=${dryRun}${limit != null ? ` LIMIT=${limit}` : ""}`);
    console.log(`Bucket: ${bucket}`);
    console.log(`Referenced marker: ${STORAGE_PUBLIC_MARKER}`);
    console.log("");

    if (!dryRun) {
        console.warn("WARNING: DRY_RUN=false — objects will be permanently deleted from Supabase Storage.");
        console.warn("R2 and the database are not modified. Deleted files cannot be restored from this script.");
        console.log("");
    }

    console.log("Loading referenced paths from database...");
    const referenced = await loadReferencedPaths(supabase);
    console.log(`Referenced in DB (Supabase public URLs): ${referenced.size}`);
    console.log("");

    console.log("Listing all objects in storage bucket (recursive)...");
    const { paths: storagePaths, listErrors } = await listAllStoragePaths(supabase, bucket);
    const storageSet = new Set(storagePaths.map(normalizeObjectPath));

    const candidates = [...storageSet].filter((p) => !referenced.has(p)).sort();
    const toProcess =
        limit != null ? candidates.slice(0, limit) : candidates;

    console.log("");
    console.log("--- Summary ---");
    console.log(`Total storage objects:     ${storageSet.size}`);
    console.log(`Referenced in DB:          ${referenced.size}`);
    console.log(`Candidates for deletion:   ${candidates.length}`);
    if (limit != null) {
        console.log(`Will process (LIMIT):    ${toProcess.length}`);
    }
    console.log(`List errors (folders):     ${listErrors}`);
    console.log("");

    if (candidates.length > 0) {
        console.log("First 20 deletion candidates:");
        for (const p of candidates.slice(0, 20)) {
            console.log(`  ${p}`);
        }
        if (candidates.length > 20) {
            console.log(`  ... and ${candidates.length - 20} more`);
        }
        console.log("");
    }

    let deleted = 0;
    let failed = 0;

    if (dryRun) {
        console.log("[DRY RUN] No files deleted.");
        if (limit != null) {
            console.log(`Would delete up to ${toProcess.length} object(s) if DRY_RUN=false.`);
        }
    } else {
        const batches = chunk(toProcess, DELETE_BATCH_SIZE);
        console.log(`Deleting ${toProcess.length} object(s) in batches of ${DELETE_BATCH_SIZE}...`);
        console.log("");

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const { error } = await supabase.storage.from(bucket).remove(batch);

            if (error) {
                failed += batch.length;
                console.error(`[DELETE FAIL] batch ${i + 1}/${batches.length}: ${error.message}`);
                for (const p of batch) {
                    console.error(`  ${p}`);
                }
                continue;
            }

            deleted += batch.length;
            console.log(`[DELETE OK] batch ${i + 1}/${batches.length}: ${batch.length} file(s)`);
        }
    }

    console.log("");
    console.log("=== Final summary ===");
    console.log(`Total storage objects:     ${storageSet.size}`);
    console.log(`Referenced in DB:          ${referenced.size}`);
    console.log(`Candidates for deletion:   ${candidates.length}`);
    console.log(`Deleted:                   ${deleted}`);
    console.log(`Failed:                    ${failed}`);
    console.log(`List errors:               ${listErrors}`);

    if (dryRun && candidates.length > 0) {
        console.log("");
        console.log("Next step: review candidates, then run a small real delete:");
        console.log("  DRY_RUN=false LIMIT=50 npx tsx scripts/cleanup-unused-supabase-storage-places.ts");
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
