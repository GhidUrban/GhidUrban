import { ok } from "@/lib/api-response";
import { resolveListing } from "@/lib/listing-plan";
import {
    getPlaceByIdFromSupabase,
    isValidCategorySlug,
    isValidCitySlug,
} from "@/lib/place-repository";
import { NextResponse } from "next/server";

function errorResponse(message: string, status: number) {
    return NextResponse.json(
        {
            success: false,
            message,
            data: null,
        },
        { status }
    );
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const city_slug = searchParams.get("city_slug");
        const category_slug = searchParams.get("category_slug");
        const place_id = searchParams.get("place_id");

        if (!city_slug) {
            return errorResponse("city_slug is required", 400);
        }

        if (!category_slug) {
            return errorResponse("category_slug is required", 400);
        }

        if (!place_id) {
            return errorResponse("place_id is required", 400);
        }

        if (!isValidCitySlug(city_slug)) {
            return errorResponse("City not found", 404);
        }

        if (!isValidCategorySlug(city_slug, category_slug)) {
            return errorResponse("Category not found for this city", 404);
        }

        const supabasePlace = await getPlaceByIdFromSupabase(
            city_slug,
            category_slug,
            place_id
        );

        if (!supabasePlace) {
            return errorResponse("Place not found for this city/category", 404);
        }

        const featured = Boolean(supabasePlace.featured);
        const featured_until = supabasePlace.featured_until ?? null;
        const plan_type = supabasePlace.plan_type ?? "free";
        const plan_expires_at = supabasePlace.plan_expires_at ?? null;
        const { activeFeatured, activePromoted, listingTierRank } = resolveListing({
            featured,
            featured_until,
            plan_type,
            plan_expires_at,
        });
        const place = {
            id: supabasePlace.place_id,
            name: supabasePlace.name,
            description: supabasePlace.description ?? "",
            address: supabasePlace.address ?? "",
            schedule: supabasePlace.schedule ?? "",
            image: supabasePlace.image ?? "",
            rating: supabasePlace.rating ?? 0,
            phone: supabasePlace.phone ?? "",
            website: supabasePlace.website ?? "",
            mapsUrl: supabasePlace.maps_url ?? "",
            featured,
            featured_until,
            activeFeatured,
            activePromoted,
            listingTierRank,
            google_match_status: supabasePlace.google_match_status ?? null,
            google_photo_uri: supabasePlace.google_photo_uri ?? null,
            google_hours_raw: supabasePlace.google_hours_raw ?? null,
        };

        return ok("Place fetched successfully", {
            city_slug,
            category_slug,
            place_id,
            place,
        });
    } catch (error) {
        console.error("Failed to fetch place", error);
        return errorResponse("Failed to fetch place", 500);
    }
}
