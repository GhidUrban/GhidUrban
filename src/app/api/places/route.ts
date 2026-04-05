import { ok } from "@/lib/api-response";
import { resolveListing } from "@/lib/listing-plan";
import {
    getPlacesByCategoryFromSupabase,
    isValidCategorySlug,
    isValidCitySlug,
} from "@/lib/place-repository";
import type { Place } from "@/data/places";
import { NextResponse } from "next/server";

type PlacesSortValue = "rating_desc" | "rating_asc" | "name_asc" | "name_desc";

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

function isValidSortValue(sort: string): sort is PlacesSortValue {
    return ["rating_desc", "rating_asc", "name_asc", "name_desc"].includes(sort);
}

function filterPlaces(places: Place[], search: string | null): Place[] {
    const normalizedSearch = search?.trim().toLowerCase();

    if (!normalizedSearch) {
        return [...places];
    }

    return places.filter((place) => {
        return (
            place.name.toLowerCase().includes(normalizedSearch) ||
            place.description.toLowerCase().includes(normalizedSearch) ||
            place.address.toLowerCase().includes(normalizedSearch)
        );
    });
}

function sortPlaces(places: Place[], sort: PlacesSortValue | null): Place[] {
    const sortedPlaces = [...places];

    sortedPlaces.sort((a, b) => {
        const tierDiff = (b.listingTierRank ?? 0) - (a.listingTierRank ?? 0);
        if (tierDiff !== 0) {
            return tierDiff;
        }

        if (sort === "name_asc") {
            const nameCmp = a.name.localeCompare(b.name);
            if (nameCmp !== 0) {
                return nameCmp;
            }
            return (b.rating ?? 0) - (a.rating ?? 0);
        }

        if (sort === "name_desc") {
            const nameCmp = b.name.localeCompare(a.name);
            if (nameCmp !== 0) {
                return nameCmp;
            }
            return (b.rating ?? 0) - (a.rating ?? 0);
        }

        if (sort === "rating_asc") {
            const r = (a.rating ?? 0) - (b.rating ?? 0);
            if (r !== 0) {
                return r;
            }
            return a.name.localeCompare(b.name);
        }

        const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
        if (ratingDiff !== 0) {
            return ratingDiff;
        }

        return a.name.localeCompare(b.name);
    });

    return sortedPlaces;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const city_slug = searchParams.get("city_slug");
        const category_slug = searchParams.get("category_slug");
        const search = searchParams.get("search");
        const sort = searchParams.get("sort");

        if (!city_slug) {
            return errorResponse("city_slug is required", 400);
        }

        if (!category_slug) {
            return errorResponse("category_slug is required", 400);
        }

        if (!isValidCitySlug(city_slug)) {
            return errorResponse("City not found", 404);
        }

        if (!isValidCategorySlug(city_slug, category_slug)) {
            return errorResponse("Category not found for this city", 404);
        }

        if (sort && !isValidSortValue(sort)) {
            return errorResponse("Invalid sort value", 400);
        }

        const supabasePlaces = await getPlacesByCategoryFromSupabase(city_slug, category_slug);

        const places: Place[] = supabasePlaces.map((p) => {
            const featured = Boolean(p.featured);
            const featured_until = p.featured_until ?? null;
            const plan_type = p.plan_type ?? "free";
            const plan_expires_at = p.plan_expires_at ?? null;
            const { activeFeatured, activePromoted, listingTierRank } = resolveListing({
                featured,
                featured_until,
                plan_type,
                plan_expires_at,
            });
            return {
                id: p.place_id,
                name: p.name,
                description: p.description ?? "",
                address: p.address ?? "",
                schedule: p.schedule ?? "",
                image: p.image ?? "",
                rating: p.rating ?? 0,
                phone: p.phone ?? "",
                website: p.website ?? "",
                mapsUrl: p.maps_url ?? "",
                featured,
                featured_until,
                activeFeatured,
                activePromoted,
                listingTierRank,
                latitude: p.latitude,
                longitude: p.longitude,
            };
        });
        const filteredPlaces = filterPlaces(places, search);
        const sortValue = sort && isValidSortValue(sort) ? sort : null;
        const sortedPlaces = sortPlaces(filteredPlaces, sortValue);

        return ok("Places fetched successfully", {
            city_slug,
            category_slug,
            count: sortedPlaces.length,
            places: sortedPlaces,
        });
    } catch (error) {
        console.error("Failed to fetch places", error);
        return errorResponse("Failed to fetch places", 500);
    }
}
