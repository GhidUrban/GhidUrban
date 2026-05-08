import { resolveListing } from "@/lib/listing-plan";
import { haversineKm } from "@/lib/haversine-km";
import { supabase } from "@/lib/supabase/client";
import {
    fetchPlaceGoogleDataMap, fetchPlaceListingsMap, placeJoinKey,
} from "./place-repository";
import type { RecommendedPlaceRow } from "./types";

type RecommendationOptions = {
    radius_km: number;
    city_slug?: string;
    category_slug?: string;
    exclude_place_id?: string;
};

const RECOMMENDATIONS_FETCH_LIMIT = 400;

export async function getNearbyRecommendedPlacesFromSupabase(
    userLat: number,
    userLng: number,
    options: RecommendationOptions,
): Promise<RecommendedPlaceRow[]> {
    const radius = Math.max(options.radius_km, 0.1);
    const pad = 1.12;
    const dLat = (radius * pad) / 111;
    const cosLat = Math.cos((userLat * Math.PI) / 180);
    const dLng = Math.abs(cosLat) < 0.05 ? 180 : (radius * pad) / (111 * cosLat);

    let query = supabase
        .from("places")
        .select(
            "place_id, city_slug, category_slug, name, address, image, image_storage_path, rating, maps_url, latitude, longitude, google_match_status, google_photo_uri",
        )
        .eq("status", "available")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .gte("latitude", userLat - dLat)
        .lte("latitude", userLat + dLat)
        .gte("longitude", userLng - dLng)
        .lte("longitude", userLng + dLng)
        .limit(RECOMMENDATIONS_FETCH_LIMIT);

    const city = options.city_slug?.trim();
    if (city) query = query.eq("city_slug", city);
    const category = options.category_slug?.trim();
    if (category) query = query.eq("category_slug", category);
    const excludeId = options.exclude_place_id?.trim();
    if (excludeId) query = query.neq("place_id", excludeId);

    const { data, error } = await query;
    if (error) throw new Error("Failed to fetch recommendations");

    const coreRows = (data ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string; name: string;
        address: string | null; image: string | null; image_storage_path?: string | null;
        rating: number | null; maps_url: string | null; latitude: number | null; longitude: number | null;
        google_match_status?: string | null;
        google_photo_uri?: string | null;
    }>;
    const keys = coreRows.map((r) => ({ place_id: r.place_id, city_slug: r.city_slug, category_slug: r.category_slug }));
    const [gdMap, liMap] = await Promise.all([
        fetchPlaceGoogleDataMap(keys), fetchPlaceListingsMap(keys),
    ]);

    const out: RecommendedPlaceRow[] = [];
    for (const raw of coreRows) {
        const lat = Number(raw.latitude);
        const lng = Number(raw.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const distance_km = haversineKm(userLat, userLng, lat, lng);
        if (distance_km > radius) continue;
        const jk = placeJoinKey(raw);
        const gd = gdMap.get(jk);
        const li = liMap.get(jk);
        const {
            activeFeatured: active_featured,
            activePromoted: active_promoted,
            listingTierRank: listing_tier_rank,
        } = resolveListing({
            featured: Boolean(li?.featured),
            featured_until: li?.featured_until ?? null,
            plan_type: li?.plan_type ?? "free",
            plan_expires_at: li?.plan_expires_at ?? null,
        });
        out.push({
            place_id: raw.place_id, city_slug: raw.city_slug, category_slug: raw.category_slug,
            name: raw.name, address: raw.address,
            image: raw.image_storage_path ?? raw.image,
            rating: raw.rating,
            maps_url: raw.maps_url, distance_km, active_featured, active_promoted, listing_tier_rank,
            google_match_status: gd?.google_match_status ?? raw.google_match_status ?? null,
            google_photo_uri: gd?.google_photo_uri ?? raw.google_photo_uri ?? null,
        });
    }
    return out;
}
