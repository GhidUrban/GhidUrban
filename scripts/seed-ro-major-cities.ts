/**
 * Idempotent seed: major RO cities + standard categories (matches Google import slugs).
 *
 * Usage: npx tsx scripts/seed-ro-major-cities.ts
 * Requires: .env.local — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { RO_MAJOR_CITIES, SEED_STANDARD_CATEGORIES } from "../src/lib/ro-major-cities";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

/** DB fără UNIQUE pe slug nu poate folosi upsert(onConflict: slug) — insert sau update manual. */
async function putCity(row: {
    slug: string;
    name: string;
    image: string | null;
    latitude: number;
    longitude: number;
    is_active: boolean;
    sort_order: number;
}): Promise<void> {
    const { data: existing, error: selErr } = await supabase
        .from("cities")
        .select("slug")
        .eq("slug", row.slug)
        .maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
        const { error } = await supabase
            .from("cities")
            .update({
                name: row.name,
                latitude: row.latitude,
                longitude: row.longitude,
                is_active: row.is_active,
                sort_order: row.sort_order,
            })
            .eq("slug", row.slug);
        if (error) throw error;
        return;
    }
    const { error } = await supabase.from("cities").insert(row);
    if (error) throw error;
}

async function insertMissingCategories(citySlug: string): Promise<number> {
    const { data: existing, error: e1 } = await supabase
        .from("categories")
        .select("category_slug")
        .eq("city_slug", citySlug);
    if (e1) throw e1;
    const have = new Set((existing ?? []).map((r: { category_slug: string }) => r.category_slug));
    const rows = SEED_STANDARD_CATEGORIES.filter((d) => !have.has(d.category_slug)).map((d, i) => ({
        city_slug: citySlug,
        category_slug: d.category_slug,
        category_name: d.category_name,
        is_active: true,
        sort_order: SEED_STANDARD_CATEGORIES.findIndex((x) => x.category_slug === d.category_slug) + 1 || i + 1,
    }));
    if (rows.length === 0) return 0;
    const { error: e2 } = await supabase.from("categories").insert(rows);
    if (e2) throw e2;
    return rows.length;
}

async function main() {
    let citiesUpserted = 0;
    let catsInserted = 0;

    for (let i = 0; i < RO_MAJOR_CITIES.length; i++) {
        const c = RO_MAJOR_CITIES[i]!;
        try {
            await putCity({
                slug: c.slug,
                name: c.name,
                image: null,
                latitude: c.latitude,
                longitude: c.longitude,
                is_active: true,
                sort_order: i + 1,
            });
        } catch (upErr: unknown) {
            const msg = upErr instanceof Error ? upErr.message : String(upErr);
            console.error(`City ${c.slug}:`, msg);
            continue;
        }
        citiesUpserted++;
        const n = await insertMissingCategories(c.slug);
        catsInserted += n;
        console.log(`${c.slug}: ok, +${n} categories`);
    }

    console.log(`\nDone. Cities touched: ${citiesUpserted}/${RO_MAJOR_CITIES.length}. New category rows: ${catsInserted}.`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
