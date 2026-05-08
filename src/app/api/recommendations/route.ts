import {
    getNearbyRecommendedPlacesFromSupabase,
    type RecommendedPlaceRow,
} from "@/lib/place-repository";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, error?: string) {
    return NextResponse.json(
        {
            success: false,
            message,
            data: null,
            ...(error ? { error } : {}),
        },
        { status },
    );
}

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 50;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

function sortByDistanceAsc(places: RecommendedPlaceRow[]) {
    places.sort((a, b) => {
        const da = Number.isFinite(a.distance_km) ? a.distance_km : 999;
        const db = Number.isFinite(b.distance_km) ? b.distance_km : 999;
        if (da !== db) {
            return da - db;
        }
        const ta = Number.isFinite(a.listing_tier_rank) ? a.listing_tier_rank! : 0;
        const tb = Number.isFinite(b.listing_tier_rank) ? b.listing_tier_rank! : 0;
        return tb - ta;
    });
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const latRaw = searchParams.get("lat");
        const lngRaw = searchParams.get("lng");
        const lat = latRaw === null || latRaw === "" ? NaN : Number(latRaw);
        const lng = lngRaw === null || lngRaw === "" ? NaN : Number(lngRaw);

        const category_slug = searchParams.get("category_slug")?.trim() ?? "";
        let radius_km = Number(searchParams.get("radius_km") ?? DEFAULT_RADIUS_KM);
        if (!Number.isFinite(radius_km) || radius_km <= 0) {
            radius_km = DEFAULT_RADIUS_KM;
        }
        if (radius_km > MAX_RADIUS_KM) {
            radius_km = MAX_RADIUS_KM;
        }

        let limit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
        if (!Number.isFinite(limit)) {
            limit = DEFAULT_LIMIT;
        }
        const take = Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);

        const city_slug = searchParams.get("city_slug")?.trim() || undefined;
        const exclude_place_id = searchParams.get("exclude_place_id")?.trim() || undefined;

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return errorResponse(
                "Parametrii lat și lng sunt obligatorii (numere valide).",
                400,
                "invalid_lat_lng",
            );
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return errorResponse(
                "Coordonate invalide (lat: -90..90, lng: -180..180).",
                400,
                "out_of_range_coords",
            );
        }

        let places: RecommendedPlaceRow[];
        try {
            places = await getNearbyRecommendedPlacesFromSupabase(lat, lng, {
                radius_km,
                city_slug,
                category_slug: category_slug || undefined,
                exclude_place_id,
            });
        } catch (dbError) {
            console.error("Recommendations DB/repository fetch failed:", dbError);
            return errorResponse("Recommendations failed", 500, "db_fetch_failed");
        }

        const withValidCoords = places.filter((p) => {
            const okDist = Number.isFinite(p.distance_km);
            return okDist && typeof p.place_id === "string" && p.place_id.length > 0;
        });

        sortByDistanceAsc(withValidCoords);
        const top = withValidCoords.slice(0, take);

        const data = top.map((p) => ({
            place_id: p.place_id,
            name: p.name,
            address: p.address,
            image: p.image,
            rating: p.rating,
            maps_url: p.maps_url,
            city_slug: p.city_slug,
            category_slug: p.category_slug,
            distance_km: Number.isFinite(p.distance_km) ? Math.round(p.distance_km * 10) / 10 : 0,
            is_featured: p.active_featured === true,
            is_promoted: p.active_promoted === true,
            google_match_status: p.google_match_status ?? null,
            google_photo_uri: p.google_photo_uri ?? null,
        }));

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Recommendations route error:", error);
        const raw = error instanceof Error ? error.message : String(error);
        const safe = raw.length > 200 ? "internal_error" : raw;
        return NextResponse.json(
            {
                success: false,
                message: "Recommendations failed",
                data: null,
                error: safe,
            },
            { status: 500 },
        );
    }
}
