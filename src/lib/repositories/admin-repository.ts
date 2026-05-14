import { GOOGLE_IMPORT_SUPPORTED_CATEGORIES } from "@/lib/google-import-categories";
import { normalizeForSearch } from "@/lib/global-place-search";
import { supabase } from "@/lib/supabase/client";
import { getAllCitiesForAdminFromSupabase } from "./city-repository";
import { normalizeCanonicalGooglePlaceId } from "./google-match-repository";
import type {
    AdminGoogleMatchReviewRow,
    GoogleImportCoverageRow,
    GoogleMatchReviewListFilters,
    GooglePlaceIdListingConflict,
} from "./types";

function scopeKey(cs: string, cat: string): string {
    return `${cs}\t${cat}`;
}

function placeNameMatchesReviewSearch(placeName: string, rawSearch: string): boolean {
    const normTokens = normalizeForSearch(rawSearch)
        .split(/\s+/)
        .filter(Boolean);
    if (normTokens.length === 0) {
        return true;
    }
    const haystack = normalizeForSearch(placeName);
    return normTokens.every((t) => haystack.includes(t));
}

/** O singură trecere Supabase / pereche oraș+categorie — fără zeci de cereri paralele. */
async function loadGooglePlaceIdPeerMap(
    scopes: { city_slug: string; category_slug: string }[],
): Promise<{ peerMap: Map<string, string[]>; failedScopes: Set<string> }> {
    const peerMap = new Map<string, string[]>();
    const failedScopes = new Set<string>();
    for (const { city_slug: cs, category_slug: cat } of scopes) {
        const sk = scopeKey(cs, cat);
        const { data, error } = await supabase
            .from("place_google_data")
            .select("place_id, google_place_id")
            .eq("city_slug", cs)
            .eq("category_slug", cat)
            .not("google_place_id", "is", null);
        if (error) {
            console.error("[google-match-review] peer load failed", sk, error.message);
            failedScopes.add(sk);
            continue;
        }
        for (const row of (data ?? []) as { place_id: string; google_place_id: string | null }[]) {
            const mk = normalizeCanonicalGooglePlaceId(row.google_place_id ?? undefined);
            if (!mk) continue;
            const gkey = `${sk}\t${mk}`;
            const list = peerMap.get(gkey) ?? [];
            if (!list.includes(row.place_id)) list.push(row.place_id);
            peerMap.set(gkey, list);
        }
    }
    return { peerMap, failedScopes };
}

async function loadConflictPlaceNames(
    keys: { place_id: string; city_slug: string; category_slug: string }[],
): Promise<Map<string, { name: string; address: string | null }>> {
    const out = new Map<string, { name: string; address: string | null }>();
    if (keys.length === 0) return out;
    const byScope = new Map<string, string[]>();
    for (const e of keys) {
        const sk = scopeKey(e.city_slug, e.category_slug);
        const arr = byScope.get(sk) ?? [];
        if (!arr.includes(e.place_id)) arr.push(e.place_id);
        byScope.set(sk, arr);
    }
    for (const [sk, placeIds] of byScope) {
        const [cs, cat] = sk.split("\t");
        const { data, error } = await supabase
            .from("places")
            .select("place_id, city_slug, category_slug, name, address")
            .eq("city_slug", cs)
            .eq("category_slug", cat)
            .in("place_id", placeIds);
        if (error) {
            console.error("[google-match-review] conflict name load failed", sk, error.message);
            continue;
        }
        for (const row of (data ?? []) as {
            place_id: string;
            city_slug: string;
            category_slug: string;
            name: string | null;
            address: string | null;
        }[]) {
            const k = `${row.place_id}|${row.city_slug}|${row.category_slug}`;
            out.set(k, { name: row.name?.trim() || row.place_id, address: row.address ?? null });
        }
    }
    return out;
}

export async function getGoogleImportCoverageHintsFromSupabase(): Promise<GoogleImportCoverageRow[]> {
    const cities = await getAllCitiesForAdminFromSupabase();
    const citySlugs = new Set(cities.map((c) => c.slug));

    const PAGE = 1000;
    const counts: Record<string, number> = {};
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from("places")
            .select("city_slug, category_slug")
            .in("category_slug", [...GOOGLE_IMPORT_SUPPORTED_CATEGORIES])
            .range(from, from + PAGE - 1);
        if (error) throw new Error("Failed to load google import coverage");
        for (const r of data ?? []) {
            const row = r as { city_slug: string | null; category_slug: string | null };
            const cs = row.city_slug?.trim() ?? "";
            const cat = row.category_slug?.trim() ?? "";
            if (!cs || !cat || !citySlugs.has(cs)) continue;
            const key = `${cs}\t${cat}`;
            counts[key] = (counts[key] ?? 0) + 1;
        }
        if (!data || data.length < PAGE) break;
        from += PAGE;
    }

    const out: GoogleImportCoverageRow[] = [];
    for (const city of cities) {
        for (const category_slug of GOOGLE_IMPORT_SUPPORTED_CATEGORIES) {
            const k = `${city.slug}\t${category_slug}`;
            out.push({
                city_slug: city.slug,
                city_name: city.name,
                category_slug,
                place_count: counts[k] ?? 0,
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
    const missingStorageOnly = filters?.missing_storage_image === true;

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
    const pq = supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, address, image_storage_path")
        .in("place_id", placeIds);
    const { data: placeRows, error: pError } = await pq;
    if (pError) throw new Error("Failed to fetch place names for review");

    const placeMap = new Map<string, { name: string; address: string | null; image_storage_path: string | null }>();
    for (const pr of placeRows ?? []) {
        const p = pr as { place_id: string; city_slug: string; category_slug: string; name: string; address: string | null; image_storage_path: string | null };
        placeMap.set(`${p.place_id}|${p.city_slug}|${p.category_slug}`, {
            name: p.name,
            address: p.address,
            image_storage_path: p.image_storage_path ?? null,
        });
    }

    const base: Omit<AdminGoogleMatchReviewRow, "has_google_conflict" | "conflict" | "conflict_check_failed">[] = [];
    for (const r of rows) {
        const raw = r as Record<string, unknown>;
        const key = `${raw.place_id}|${raw.city_slug}|${raw.category_slug}`;
        const pl = placeMap.get(key);
        if (!pl) continue;
        if (search && !placeNameMatchesReviewSearch(pl.name, search)) {
            continue;
        }
        const image_storage_path = pl.image_storage_path;
        if (missingStorageOnly && image_storage_path?.trim()) {
            continue;
        }
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
            image_storage_path,
        });
    }

    base.sort((a, b) => {
        const sa = a.google_match_score ?? -1;
        const sb = b.google_match_score ?? -1;
        if (sb !== sa) return sb - sa;
        const c = a.city_slug.localeCompare(b.city_slug);
        if (c !== 0) return c;
        const ca = a.category_slug.localeCompare(b.category_slug);
        if (ca !== 0) return ca;
        return a.name.localeCompare(b.name);
    });

    const scopeSet = new Map<string, { city_slug: string; category_slug: string }>();
    for (const b of base) {
        const sk = scopeKey(b.city_slug, b.category_slug);
        if (!scopeSet.has(sk)) scopeSet.set(sk, { city_slug: b.city_slug, category_slug: b.category_slug });
    }
    const { peerMap, failedScopes } = await loadGooglePlaceIdPeerMap([...scopeSet.values()]);

    const conflictOthers: { place_id: string; city_slug: string; category_slug: string }[] = [];
    for (const r of base) {
        if (failedScopes.has(scopeKey(r.city_slug, r.category_slug))) continue;
        const mk = normalizeCanonicalGooglePlaceId(r.google_place_id ?? undefined);
        if (!mk) continue;
        const gkey = `${scopeKey(r.city_slug, r.category_slug)}\t${mk}`;
        const peers = peerMap.get(gkey) ?? [];
        const otherId = peers.find((p) => p !== r.place_id);
        if (otherId) {
            conflictOthers.push({ place_id: otherId, city_slug: r.city_slug, category_slug: r.category_slug });
        }
    }
    const conflictMeta = await loadConflictPlaceNames(conflictOthers);

    return base.map((r): AdminGoogleMatchReviewRow => {
        if (failedScopes.has(scopeKey(r.city_slug, r.category_slug))) {
            return { ...r, has_google_conflict: null, conflict: null, conflict_check_failed: true };
        }
        const gid = r.google_place_id?.trim();
        if (!gid) {
            return { ...r, has_google_conflict: false, conflict: null, conflict_check_failed: false };
        }
        const mk = normalizeCanonicalGooglePlaceId(gid);
        if (!mk) {
            return { ...r, has_google_conflict: false, conflict: null, conflict_check_failed: false };
        }
        const gkey = `${scopeKey(r.city_slug, r.category_slug)}\t${mk}`;
        const peers = peerMap.get(gkey) ?? [];
        if (peers.length <= 1) {
            return { ...r, has_google_conflict: false, conflict: null, conflict_check_failed: false };
        }
        const otherId = peers.find((p) => p !== r.place_id);
        if (!otherId) {
            return { ...r, has_google_conflict: false, conflict: null, conflict_check_failed: false };
        }
        const meta = conflictMeta.get(`${otherId}|${r.city_slug}|${r.category_slug}`);
        const conflict: GooglePlaceIdListingConflict = {
            conflicting_place_id: otherId,
            conflicting_name: meta?.name ?? otherId,
            conflicting_city_slug: r.city_slug,
            conflicting_category_slug: r.category_slug,
            conflicting_address: meta?.address ?? null,
        };
        return { ...r, has_google_conflict: true, conflict, conflict_check_failed: false };
    });
}
