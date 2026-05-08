import { GOOGLE_IMPORT_SUPPORTED_CATEGORIES } from "@/lib/google-import-categories";
import { supabase } from "@/lib/supabase/client";
import { getAllCitiesForAdminFromSupabase } from "./city-repository";
import { normalizeCanonicalGooglePlaceId, findGooglePlaceIdListingConflict } from "./google-match-repository";
import type {
    AdminGoogleMatchReviewRow,
    GoogleImportCoverageRow,
    GoogleMatchReviewListFilters,
} from "./types";

export async function getGoogleImportCoverageHintsFromSupabase(): Promise<GoogleImportCoverageRow[]> {
    const cities = await getAllCitiesForAdminFromSupabase();
    const citySlugs = new Set(cities.map((c) => c.slug));

    const { data: placeRows, error } = await supabase
        .from("places")
        .select("city_slug, category_slug")
        .in("category_slug", [...GOOGLE_IMPORT_SUPPORTED_CATEGORIES]);

    if (error) throw new Error("Failed to load google import coverage");

    const counts = new Map<string, number>();
    for (const raw of placeRows ?? []) {
        const row = raw as { city_slug: string | null; category_slug: string | null };
        const cs = row.city_slug?.trim() ?? "";
        const cat = row.category_slug?.trim() ?? "";
        if (!cs || !cat || !citySlugs.has(cs)) continue;
        const key = `${cs}\t${cat}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const out: GoogleImportCoverageRow[] = [];
    for (const city of cities) {
        for (const category_slug of GOOGLE_IMPORT_SUPPORTED_CATEGORIES) {
            out.push({
                city_slug: city.slug,
                city_name: city.name,
                category_slug,
                place_count: counts.get(`${city.slug}\t${category_slug}`) ?? 0,
            });
        }
    }
    out.sort((a, b) => {
        if (a.place_count !== b.place_count) return a.place_count - b.place_count;
        return `${a.city_slug}/${a.category_slug}`.localeCompare(`${b.city_slug}/${b.category_slug}`, "ro", { sensitivity: "base" });
    });
    return out;
}

export async function getPlacesForGoogleMatchReviewFromSupabase(
    filters?: GoogleMatchReviewListFilters,
): Promise<AdminGoogleMatchReviewRow[]> {
    const city = filters?.city_slug?.trim();
    const category = filters?.category_slug?.trim();
    const search = filters?.search?.trim();

    let q = supabase
        .from("place_google_data")
        .select("place_id, city_slug, category_slug, google_match_score, google_place_id, google_maps_uri, google_photo_uri")
        .eq("google_match_status", "review");

    if (city) q = q.eq("city_slug", city);
    if (category) q = q.eq("category_slug", category);

    const { data: googleRows, error: gError } = await q
        .order("city_slug", { ascending: true })
        .order("category_slug", { ascending: true });

    if (gError) throw new Error("Failed to fetch google match review places");

    const rows = googleRows ?? [];
    if (rows.length === 0) return [];

    const placeIds = rows.map((r: Record<string, unknown>) => r.place_id as string);
    let pq = supabase.from("places").select("place_id, city_slug, category_slug, name, address").in("place_id", placeIds);
    if (search) pq = pq.ilike("name", `%${search}%`);
    const { data: placeRows, error: pError } = await pq;
    if (pError) throw new Error("Failed to fetch place names for review");

    const placeMap = new Map<string, { name: string; address: string | null }>();
    for (const pr of placeRows ?? []) {
        const p = pr as { place_id: string; city_slug: string; category_slug: string; name: string; address: string | null };
        placeMap.set(`${p.place_id}|${p.city_slug}|${p.category_slug}`, { name: p.name, address: p.address });
    }

    const base: Omit<AdminGoogleMatchReviewRow, "has_google_conflict" | "conflict" | "conflict_check_failed">[] = [];
    for (const r of rows) {
        const raw = r as Record<string, unknown>;
        const key = `${raw.place_id}|${raw.city_slug}|${raw.category_slug}`;
        const pl = placeMap.get(key);
        if (!pl) continue;
        base.push({
            place_id: raw.place_id as string,
            city_slug: raw.city_slug as string,
            category_slug: raw.category_slug as string,
            name: pl.name,
            address: pl.address,
            google_match_score: raw.google_match_score as number | null,
            google_place_id: raw.google_place_id as string | null,
            google_maps_uri: raw.google_maps_uri as string | null,
            google_photo_uri: raw.google_photo_uri as string | null,
        });
    }

    base.sort((a, b) => {
        const c = a.city_slug.localeCompare(b.city_slug);
        if (c !== 0) return c;
        const ca = a.category_slug.localeCompare(b.category_slug);
        if (ca !== 0) return ca;
        return a.name.localeCompare(b.name);
    });

    return Promise.all(
        base.map(async (r) => {
            const gid = r.google_place_id?.trim();
            if (gid == null || gid === "") {
                return { ...r, has_google_conflict: false, conflict: null, conflict_check_failed: false };
            }
            try {
                const conflict = await findGooglePlaceIdListingConflict(r.google_place_id, r.place_id, r.city_slug, r.category_slug);
                return { ...r, has_google_conflict: conflict != null, conflict, conflict_check_failed: false };
            } catch {
                return { ...r, has_google_conflict: null, conflict: null, conflict_check_failed: true };
            }
        }),
    );
}
