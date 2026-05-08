import type { Place } from "@/data/places";
import { normalizeListingPlanType, resolveListing } from "@/lib/listing-plan";
import { supabase } from "@/lib/supabase/client";
import type {
    AdminSupabasePlaceDetails,
    AdminSupabasePlaceRow,
    CreatePlaceOutcome,
    GooglePlaceListingScope,
    PlaceGoogleDataRow,
    PlaceKeyRow,
    PlaceListingRow,
    PlaceSearchIndexRow,
    PlaceVisibilityStatus,
    PopularPlaceRow,
    SupabasePlace,
    SupabasePlaceMutationInput,
} from "./types";
import { upsertPlaceGoogleData } from "./place-google-repository";
import { upsertPlaceListing } from "./place-listing-repository";

/** Stable join key for (place_id, city_slug, category_slug). Slugs use [a-z0-9-] only. */
export function placeJoinKey(r: { place_id: string; city_slug: string; category_slug: string }): string {
    return `${r.place_id}|||${r.city_slug}|||${r.category_slug}`;
}

export async function fetchPlaceGoogleDataMap(
    keys: { place_id: string; city_slug: string; category_slug: string }[],
): Promise<Map<string, PlaceGoogleDataRow>> {
    const out = new Map<string, PlaceGoogleDataRow>();
    if (keys.length === 0) return out;
    const byGroup = new Map<string, Set<string>>();
    for (const k of keys) {
        const g = `${k.city_slug}|||${k.category_slug}`;
        if (!byGroup.has(g)) byGroup.set(g, new Set());
        byGroup.get(g)!.add(k.place_id);
    }
    for (const [g, idSet] of byGroup) {
        const idx = g.indexOf("|||");
        const citySlug = g.slice(0, idx);
        const categorySlug = g.slice(idx + 3);
        const placeIds = Array.from(idSet);
        const { data, error } = await supabase
            .from("place_google_data")
            .select("*")
            .eq("city_slug", citySlug)
            .eq("category_slug", categorySlug)
            .in("place_id", placeIds);
        if (error) throw new Error("Failed to fetch place_google_data");
        for (const row of data ?? []) {
            const r = row as PlaceGoogleDataRow;
            out.set(placeJoinKey(r), r);
        }
    }
    return out;
}

export async function fetchPlaceListingsMap(
    keys: { place_id: string; city_slug: string; category_slug: string }[],
): Promise<Map<string, PlaceListingRow>> {
    const out = new Map<string, PlaceListingRow>();
    if (keys.length === 0) return out;
    const byGroup = new Map<string, Set<string>>();
    for (const k of keys) {
        const g = `${k.city_slug}|||${k.category_slug}`;
        if (!byGroup.has(g)) byGroup.set(g, new Set());
        byGroup.get(g)!.add(k.place_id);
    }
    for (const [g, idSet] of byGroup) {
        const idx = g.indexOf("|||");
        const citySlug = g.slice(0, idx);
        const categorySlug = g.slice(idx + 3);
        const placeIds = Array.from(idSet);
        const { data, error } = await supabase
            .from("place_listings")
            .select("*")
            .eq("city_slug", citySlug)
            .eq("category_slug", categorySlug)
            .in("place_id", placeIds);
        if (error) throw new Error("Failed to fetch place_listings");
        for (const row of data ?? []) {
            const r = row as PlaceListingRow;
            out.set(placeJoinKey(r), r);
        }
    }
    return out;
}

export function normalizeCanonicalGooglePlaceId(
    raw: string | null | undefined,
): string | null {
    const t = raw?.trim();
    if (!t) return null;
    if (t.startsWith("places/")) return t;
    return `places/${t}`;
}

export function extractGooglePlaceIdFromMapsUrl(
    raw: string | null | undefined,
): string | null {
    if (raw == null) return null;
    const u = String(raw).trim();
    if (!u) return null;
    try {
        const parsed = new URL(u);
        const fromParams = parsed.searchParams.get("query_place_id") ?? parsed.searchParams.get("place_id");
        if (fromParams?.trim()) return fromParams.trim();
    } catch { /* fall through */ }
    const paramMatch = u.match(/[?&](?:query_place_id|place_id)=([^&]+)/i);
    if (paramMatch?.[1]) {
        try {
            const dec = decodeURIComponent(paramMatch[1].replace(/\+/g, " "));
            if (dec.trim()) return dec.trim();
        } catch {
            const t = paramMatch[1].trim();
            if (t) return t;
        }
    }
    const fq = u.match(/place[/_]id[=:]\s*([A-Za-z0-9_-]+)/i);
    if (fq?.[1]?.trim()) return fq[1].trim();
    const resource = u.match(/places\/(ChIJ[A-Za-z0-9_-]{10,})/);
    if (resource?.[1]) return `places/${resource[1]}`;
    const chij = u.match(/(ChIJ[A-Za-z0-9_-]{10,})/);
    if (chij?.[1]) return chij[1];
    return null;
}

export async function getPlaceKeyByGoogleOrExternal(
    raw: string | null | undefined,
    scope: GooglePlaceListingScope,
): Promise<PlaceKeyRow | null> {
    const city = scope.city_slug?.trim();
    const cat = scope.category_slug?.trim();
    if (!city || !cat) return null;
    const c = normalizeCanonicalGooglePlaceId(raw ?? undefined);
    if (!c) return null;
    const variants = [c];
    if (c.startsWith("places/")) {
        const tail = c.slice("places/".length).trim();
        if (tail && !variants.includes(tail)) variants.push(tail);
    }
    for (const v of variants) {
        const { data, error } = await supabase
            .from("place_google_data").select("place_id,city_slug,category_slug")
            .eq("google_place_id", v).eq("city_slug", city).eq("category_slug", cat).limit(1);
        if (error) throw new Error("Failed to check google_place_id");
        const row = data?.[0] as PlaceKeyRow | undefined;
        if (row) return row;
    }
    for (const v of variants) {
        const { data, error } = await supabase
            .from("place_listings").select("place_id,city_slug,category_slug")
            .eq("external_place_id", v).eq("city_slug", city).eq("category_slug", cat).limit(1);
        if (error) throw new Error("Failed to check external_place_id");
        const row = data?.[0] as PlaceKeyRow | undefined;
        if (row) return row;
    }
    return null;
}

export function supabasePlaceToPlace(p: SupabasePlace): Place {
    const gd = p.place_google_data ?? null;
    const li = p.place_listings ?? null;
    const featured = Boolean(li?.featured);
    const featured_until = li?.featured_until ?? null;
    const plan_type = li?.plan_type ?? "free";
    const plan_expires_at = li?.plan_expires_at ?? null;
    const { activeFeatured, activePromoted, listingTierRank } = resolveListing({
        featured, featured_until, plan_type, plan_expires_at,
    });
    return {
        id: p.place_id, name: p.name,
        description: p.description ?? "", address: p.address ?? "",
        schedule: p.schedule ?? "", image: p.image_storage_path ?? p.image ?? "",
        rating: p.rating ?? 0, phone: p.phone ?? "",
        website: p.website ?? "", mapsUrl: p.maps_url ?? "",
        featured, featured_until, activeFeatured, activePromoted, listingTierRank,
        latitude: p.latitude, longitude: p.longitude,
        google_match_status: gd?.google_match_status ?? null,
        google_photo_uri: gd?.google_photo_uri ?? null,
        google_hours_raw: gd?.google_hours_raw ?? null,
    };
}

export async function getPlacesByCategory(city: string, category: string): Promise<Place[]> {
    const rows = await getPlacesByCategoryFromSupabase(city, category);
    return rows.map(supabasePlaceToPlace);
}

export async function getPlaceById(city: string, category: string, placeId: string): Promise<Place | undefined> {
    const row = await getPlaceByIdFromSupabase(city, category, placeId);
    return row ? supabasePlaceToPlace(row) : undefined;
}

export async function getPlacesByCategoryFromSupabase(
    citySlug: string,
    categorySlug: string,
): Promise<SupabasePlace[]> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, description, address, schedule, image, image_storage_path, rating, phone, website, maps_url, latitude, longitude")
        .eq("city_slug", citySlug).eq("category_slug", categorySlug)
        .eq("status", "available").order("name", { ascending: true });
    if (error) throw new Error("Failed to fetch places");
    const rows = (data ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string; name: string;
        description: string | null; address: string | null; schedule: string | null;
        image: string | null; image_storage_path?: string | null; rating: number | null;
        phone: string | null; website: string | null; maps_url: string | null;
        latitude: number | null; longitude: number | null;
    }>;
    const keys = rows.map((r) => ({ place_id: r.place_id, city_slug: r.city_slug, category_slug: r.category_slug }));
    const [gdMap, liMap] = await Promise.all([
        fetchPlaceGoogleDataMap(keys), fetchPlaceListingsMap(keys),
    ]);
    return rows.map((r) => ({
        ...r,
        place_google_data: gdMap.get(placeJoinKey(r)) ?? null,
        place_listings: liMap.get(placeJoinKey(r)) ?? null,
    })) as unknown as SupabasePlace[];
}

export async function getPlacesSearchIndexRowsFromSupabase(
    citySlug: string,
    categorySlug: string,
): Promise<PlaceSearchIndexRow[]> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, latitude, longitude, address, image, image_storage_path, rating")
        .eq("city_slug", citySlug.trim()).eq("category_slug", categorySlug.trim())
        .eq("status", "available").order("name", { ascending: true });
    if (error) throw new Error("Failed to fetch places for search index");
    const rows = (data ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string; name: string;
        latitude: number | null; longitude: number | null; address: string | null;
        image: string | null; image_storage_path?: string | null; rating: number | null;
    }>;
    const keys = rows.map((r) => ({ place_id: r.place_id, city_slug: r.city_slug, category_slug: r.category_slug }));
    const [gdMap, liMap] = await Promise.all([
        fetchPlaceGoogleDataMap(keys), fetchPlaceListingsMap(keys),
    ]);
    return rows.map((r) => {
        const k = placeJoinKey(r);
        const gd = gdMap.get(k);
        const li = liMap.get(k);
        return {
            place_id: r.place_id,
            name: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
            address: r.address,
            image: r.image_storage_path ?? r.image,
            rating: r.rating,
            featured: li?.featured ?? null,
            featured_until: li?.featured_until ?? null,
            plan_type: li?.plan_type ?? null,
            plan_expires_at: li?.plan_expires_at ?? null,
            google_match_status: gd?.google_match_status ?? null,
            google_photo_uri: gd?.google_photo_uri ?? null,
        };
    });
}

export async function getPlaceByIdFromSupabase(
    citySlug: string,
    categorySlug: string,
    placeId: string,
): Promise<SupabasePlace | null> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, description, address, schedule, image, image_storage_path, rating, phone, website, maps_url, latitude, longitude")
        .eq("city_slug", citySlug).eq("category_slug", categorySlug)
        .eq("place_id", placeId).eq("status", "available").single();
    if (error) return null;
    const row = data as {
        place_id: string; city_slug: string; category_slug: string; name: string;
        description: string | null; address: string | null; schedule: string | null;
        image: string | null; image_storage_path?: string | null; rating: number | null;
        phone: string | null; website: string | null; maps_url: string | null;
        latitude: number | null; longitude: number | null;
    };
    const key = { place_id: row.place_id, city_slug: row.city_slug, category_slug: row.category_slug };
    const [gdMap, liMap] = await Promise.all([
        fetchPlaceGoogleDataMap([key]), fetchPlaceListingsMap([key]),
    ]);
    return {
        ...row,
        place_google_data: gdMap.get(placeJoinKey(key)) ?? null,
        place_listings: liMap.get(placeJoinKey(key)) ?? null,
    } as unknown as SupabasePlace;
}

export async function getPopularPlacesFromSupabase(
    categorySlugs: string[],
    limit: number,
): Promise<PopularPlaceRow[]> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, image, image_storage_path, rating")
        .eq("status", "available")
        .in("category_slug", categorySlugs)
        .not("rating", "is", null)
        .not("latitude", "is", null)
        .order("rating", { ascending: false })
        .limit(limit);
    if (error) throw new Error("Failed to fetch popular places");
    const rows = (data ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string; name: string;
        image: string | null; image_storage_path?: string | null; rating: number;
    }>;
    const keys = rows.map((r) => ({ place_id: r.place_id, city_slug: r.city_slug, category_slug: r.category_slug }));
    const gdMap = await fetchPlaceGoogleDataMap(keys);
    return rows.map((r) => {
        const gd = gdMap.get(placeJoinKey(r));
        return {
            place_id: r.place_id,
            city_slug: r.city_slug,
            category_slug: r.category_slug,
            name: r.name,
            image: r.image_storage_path ?? r.image,
            rating: r.rating,
            google_match_status: gd?.google_match_status ?? null,
            google_photo_uri: gd?.google_photo_uri ?? null,
        };
    });
}

export async function getAllPlacesForAdminFromSupabase(): Promise<AdminSupabasePlaceRow[]> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, address, rating, status")
        .order("city_slug", { ascending: true })
        .order("category_slug", { ascending: true })
        .order("name", { ascending: true });
    if (error) throw new Error("Failed to fetch admin places");
    const rows = (data ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string;
        name: string; address: string | null; rating: number | null; status: string;
    }>;
    const keys = rows.map((r) => ({ place_id: r.place_id, city_slug: r.city_slug, category_slug: r.category_slug }));
    const liMap = await fetchPlaceListingsMap(keys);
    return rows.map((r) => {
        const li = liMap.get(placeJoinKey(r));
        return {
            place_id: r.place_id,
            city_slug: r.city_slug,
            category_slug: r.category_slug,
            name: r.name,
            address: r.address,
            rating: r.rating,
            status: r.status,
            featured: li?.featured ?? false,
            featured_until: li?.featured_until ?? null,
        };
    });
}

export async function getAdminPlaceByIdFromSupabase(
    placeId: string,
): Promise<AdminSupabasePlaceDetails | null> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, description, address, schedule, image, image_storage_path, rating, phone, website, maps_url, status")
        .eq("place_id", placeId).single();
    if (error) return null;
    const row = data as {
        place_id: string; city_slug: string; category_slug: string; name: string;
        description: string | null; address: string | null; schedule: string | null;
        image: string | null; image_storage_path?: string | null; rating: number | null;
        phone: string | null; website: string | null; maps_url: string | null; status: string;
    };
    const key = { place_id: row.place_id, city_slug: row.city_slug, category_slug: row.category_slug };
    const liMap = await fetchPlaceListingsMap([key]);
    const li = liMap.get(placeJoinKey(key));
    return {
        place_id: row.place_id,
        city_slug: row.city_slug,
        category_slug: row.category_slug,
        name: row.name,
        description: row.description,
        address: row.address,
        schedule: row.schedule,
        image: row.image_storage_path ?? row.image,
        rating: row.rating,
        phone: row.phone,
        website: row.website,
        maps_url: row.maps_url,
        status: row.status,
        featured: li?.featured ?? false,
        featured_until: li?.featured_until ?? null,
        plan_type: li?.plan_type ?? "free",
        plan_expires_at: li?.plan_expires_at ?? null,
    };
}

export function normalizePlaceNameForDedupe(name: string): string {
    return String(name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizePlaceAddressForDedupe(raw: string | null | undefined): string {
    let s = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    s = s.replace(/,\s*romania\s*$/i, "").trim();
    return s;
}

function namesSimilarOneContainsOther(a: string, b: string): boolean {
    const na = normalizePlaceNameForDedupe(a);
    const nb = normalizePlaceNameForDedupe(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length <= nb.length ? nb : na;
    if (shorter.length < 4) return false;
    return longer.includes(shorter);
}

export async function placeDuplicateByNormalizedAddressInCategory(
    address: string, city_slug: string, category_slug: string,
): Promise<boolean> {
    const target = normalizePlaceAddressForDedupe(address);
    if (!target) return false;
    const c = city_slug?.trim();
    const cat = category_slug?.trim();
    if (!c || !cat) return false;
    const { data, error } = await supabase
        .from("places").select("address").eq("city_slug", c).eq("category_slug", cat);
    if (error) throw new Error("Failed to check duplicate address");
    for (const row of data ?? []) {
        if (normalizePlaceAddressForDedupe((row as { address: string | null }).address) === target) return true;
    }
    return false;
}

export async function placeDuplicateBySimilarNameAndAddressInCategory(
    name: string, address: string, city_slug: string, category_slug: string,
): Promise<boolean> {
    const targetAddr = normalizePlaceAddressForDedupe(address);
    if (!targetAddr) return false;
    const c = city_slug?.trim();
    const cat = category_slug?.trim();
    if (!c || !cat) return false;
    const { data, error } = await supabase
        .from("places").select("name, address").eq("city_slug", c).eq("category_slug", cat);
    if (error) throw new Error("Failed to check duplicate name and address");
    for (const row of data ?? []) {
        const r = row as { name: string | null; address: string | null };
        if (normalizePlaceAddressForDedupe(r.address) !== targetAddr) continue;
        if (namesSimilarOneContainsOther(name, r.name ?? "")) return true;
    }
    return false;
}

function escapeIlikePattern(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function placeExistsByNameCityCategory(
    name: string, city_slug: string, category_slug: string,
): Promise<boolean> {
    const n = name?.trim();
    if (!n) return false;
    const { data, error } = await supabase
        .from("places").select("place_id")
        .eq("city_slug", city_slug).eq("category_slug", category_slug)
        .ilike("name", escapeIlikePattern(n)).limit(1);
    if (error) throw new Error("Failed to check duplicate name");
    return (data?.length ?? 0) > 0;
}

export async function placeIdExistsInCategory(
    place_id: string, city_slug: string, category_slug: string,
): Promise<boolean> {
    const { data, error } = await supabase
        .from("places").select("place_id")
        .eq("place_id", place_id).eq("city_slug", city_slug).eq("category_slug", category_slug).limit(1);
    if (error) throw new Error("Failed to check place id");
    return (data?.length ?? 0) > 0;
}

export async function createPlaceInSupabase(
    place: SupabasePlaceMutationInput,
): Promise<CreatePlaceOutcome> {
    const googleKey = normalizeCanonicalGooglePlaceId(place.google_place_id ?? place.external_place_id ?? undefined);
    if (googleKey) {
        const existing = await getPlaceKeyByGoogleOrExternal(
            place.google_place_id ?? place.external_place_id ?? googleKey,
            { city_slug: place.city_slug, category_slug: place.category_slug },
        );
        if (existing) {
            await updatePlaceInSupabase({ ...place, place_id: existing.place_id, google_place_id: googleKey });
            return { result: "merged", place_id: existing.place_id };
        }
    }
    const coreRow = {
        place_id: place.place_id,
        city_slug: place.city_slug,
        category_slug: place.category_slug,
        name: place.name,
        description: place.description,
        address: place.address,
        schedule: place.schedule,
        image: place.image,
        rating: place.rating,
        phone: place.phone,
        website: place.website,
        maps_url: place.maps_url,
        latitude: place.latitude ?? null,
        longitude: place.longitude ?? null,
        status: place.status ?? "available",
    };
    const { error } = await supabase.from("places").insert([coreRow]);
    if (error) throw new Error("Failed to create place");

    await upsertPlaceListing({
        place_id: place.place_id,
        city_slug: place.city_slug,
        category_slug: place.category_slug,
        plan_type: normalizeListingPlanType(place.plan_type),
        plan_expires_at: place.plan_expires_at == null || place.plan_expires_at === "" ? null : place.plan_expires_at,
        featured: typeof place.featured === "boolean" ? place.featured : false,
        featured_until: place.featured_until == null || place.featured_until === "" ? null : place.featured_until,
        external_source: place.external_source ?? null,
        external_place_id: place.external_place_id ?? null,
    });

    if (googleKey) {
        await upsertPlaceGoogleData({
            place_id: place.place_id,
            city_slug: place.city_slug,
            category_slug: place.category_slug,
            google_place_id: googleKey,
        });
    }

    return { result: "inserted", place_id: place.place_id };
}

export async function updatePlaceInSupabase(place: SupabasePlaceMutationInput): Promise<void> {
    const corePayload: Record<string, unknown> = {
        name: place.name, description: place.description,
        address: place.address, schedule: place.schedule,
        image: place.image, rating: place.rating,
        phone: place.phone, website: place.website, maps_url: place.maps_url,
    };
    if (place.status != null) corePayload.status = place.status;
    if (place.latitude !== undefined) corePayload.latitude = place.latitude;
    if (place.longitude !== undefined) corePayload.longitude = place.longitude;

    const { error } = await supabase
        .from("places").update(corePayload)
        .eq("place_id", place.place_id).eq("city_slug", place.city_slug).eq("category_slug", place.category_slug);
    if (error) throw new Error("Failed to update place");

    const listingPayload: Record<string, unknown> = {
        place_id: place.place_id, city_slug: place.city_slug, category_slug: place.category_slug,
    };
    let hasListingUpdate = false;
    if (typeof place.featured === "boolean") { listingPayload.featured = place.featured; hasListingUpdate = true; }
    if (place.featured_until !== undefined) {
        listingPayload.featured_until = place.featured_until == null || place.featured_until === "" ? null : place.featured_until;
        hasListingUpdate = true;
    }
    if (place.plan_type != null) { listingPayload.plan_type = normalizeListingPlanType(place.plan_type); hasListingUpdate = true; }
    if (place.plan_expires_at !== undefined) {
        listingPayload.plan_expires_at = place.plan_expires_at == null || place.plan_expires_at === "" ? null : place.plan_expires_at;
        hasListingUpdate = true;
    }
    if (place.external_place_id !== undefined) {
        listingPayload.external_place_id = place.external_place_id == null || place.external_place_id === "" ? null : place.external_place_id;
        hasListingUpdate = true;
    }
    if (place.external_source !== undefined) { listingPayload.external_source = place.external_source; hasListingUpdate = true; }
    if (hasListingUpdate) {
        await upsertPlaceListing(listingPayload as { place_id: string; city_slug: string; category_slug: string });
    }

    if (place.google_place_id !== undefined) {
        const gid = normalizeCanonicalGooglePlaceId(place.google_place_id) ?? place.google_place_id;
        await upsertPlaceGoogleData({
            place_id: place.place_id, city_slug: place.city_slug, category_slug: place.category_slug,
            google_place_id: gid,
        });
    }
}

export async function updatePlaceStatusInSupabase(
    placeId: string, citySlug: string, categorySlug: string, status: PlaceVisibilityStatus,
): Promise<void> {
    const { error } = await supabase
        .from("places").update({ status })
        .eq("place_id", placeId).eq("city_slug", citySlug).eq("category_slug", categorySlug);
    if (error) throw new Error("Failed to update place status");
}

export async function updatePlaceFeaturedInSupabase(
    placeId: string, citySlug: string, categorySlug: string, featured: boolean,
): Promise<void> {
    await upsertPlaceListing({
        place_id: placeId, city_slug: citySlug, category_slug: categorySlug, featured,
    });
}

export async function deletePlaceFromSupabase(
    placeId: string, citySlug: string, categorySlug: string,
): Promise<void> {
    const { error } = await supabase
        .from("places").delete()
        .eq("place_id", placeId).eq("city_slug", citySlug).eq("category_slug", categorySlug);
    if (error) throw new Error("Failed to delete place");
}
