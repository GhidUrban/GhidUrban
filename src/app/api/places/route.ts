import { fail, ok } from "@/lib/api-response";
import { resolveListing } from "@/lib/listing-plan";
import {
    categoryExistsInSupabase,
    cityExistsInSupabase,
    getPlacesByCategoryFromSupabase,
} from "@/lib/place-repository";
import { placesQuery, parseSearchParams } from "@/lib/schemas/api";
import type { Place } from "@/data/places";
import { ZodError } from "zod";

type PlacesSortValue = "rating_desc" | "rating_asc" | "name_asc" | "name_desc";

function filterPlaces(places: Place[], search: string | null): Place[] {
    const normalizedSearch = search?.trim().toLowerCase();
    if (!normalizedSearch) return [...places];
    return places.filter((place) =>
        place.name.toLowerCase().includes(normalizedSearch) ||
        place.description.toLowerCase().includes(normalizedSearch) ||
        place.address.toLowerCase().includes(normalizedSearch)
    );
}

function sortPlaces(places: Place[], sort: PlacesSortValue | null): Place[] {
    const sorted = [...places];
    sorted.sort((a, b) => {
        const tierDiff = (b.listingTierRank ?? 0) - (a.listingTierRank ?? 0);
        if (tierDiff !== 0) return tierDiff;
        if (sort === "name_asc") { const c = a.name.localeCompare(b.name); return c !== 0 ? c : (b.rating ?? 0) - (a.rating ?? 0); }
        if (sort === "name_desc") { const c = b.name.localeCompare(a.name); return c !== 0 ? c : (b.rating ?? 0) - (a.rating ?? 0); }
        if (sort === "rating_asc") { const r = (a.rating ?? 0) - (b.rating ?? 0); return r !== 0 ? r : a.name.localeCompare(b.name); }
        const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
        return ratingDiff !== 0 ? ratingDiff : a.name.localeCompare(b.name);
    });
    return sorted;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const { city_slug, category_slug, search, sort } = parseSearchParams(placesQuery, searchParams);

        const cityExists = await cityExistsInSupabase(city_slug);
        if (!cityExists) return fail("City not found", 404);

        const categoryExists = await categoryExistsInSupabase(city_slug, category_slug);
        if (!categoryExists) return fail("Category not found for this city", 404);

        const supabasePlaces = await getPlacesByCategoryFromSupabase(city_slug, category_slug);
        const places: Place[] = supabasePlaces.map((p) => {
            const { activeFeatured, activePromoted, listingTierRank } = resolveListing({
                featured: Boolean(p.featured),
                featured_until: p.featured_until ?? null,
                plan_type: p.plan_type ?? "free",
                plan_expires_at: p.plan_expires_at ?? null,
            });
            return {
                id: p.place_id, name: p.name,
                description: p.description ?? "", address: p.address ?? "",
                schedule: p.schedule ?? "", image: p.image ?? "",
                rating: p.rating ?? 0, phone: p.phone ?? "",
                website: p.website ?? "", mapsUrl: p.maps_url ?? "",
                featured: Boolean(p.featured), featured_until: p.featured_until ?? null,
                activeFeatured, activePromoted, listingTierRank,
                latitude: p.latitude, longitude: p.longitude,
                google_match_status: p.google_match_status ?? null,
                google_photo_uri: p.google_photo_uri ?? null,
            };
        });
        const filtered = filterPlaces(places, search ?? null);
        const sorted = sortPlaces(filtered, sort ?? null);

        return ok("Places fetched successfully", {
            city_slug, category_slug, count: sorted.length, places: sorted,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return fail(error.issues[0]?.message ?? "Invalid parameters", 400);
        }
        console.error("Failed to fetch places", error);
        return fail("Failed to fetch places", 500);
    }
}
