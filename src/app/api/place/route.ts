import { fail, ok } from "@/lib/api-response";
import {
    categoryExistsInSupabase,
    cityExistsInSupabase,
    getPlaceByIdFromSupabase,
    supabasePlaceToPlace,
} from "@/lib/place-repository";
import { placeQuery, parseSearchParams } from "@/lib/schemas/api";
import { ZodError } from "zod";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const { city_slug, category_slug, place_id } = parseSearchParams(placeQuery, searchParams);

        const cityExists = await cityExistsInSupabase(city_slug);
        if (!cityExists) return fail("City not found", 404);

        const categoryExists = await categoryExistsInSupabase(city_slug, category_slug);
        if (!categoryExists) return fail("Category not found for this city", 404);

        const supabasePlace = await getPlaceByIdFromSupabase(city_slug, category_slug, place_id);
        if (!supabasePlace) return fail("Place not found for this city/category", 404);

        const place = supabasePlaceToPlace(supabasePlace);

        return ok("Place fetched successfully", {
            city_slug, category_slug, place_id, place,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return fail(error.issues[0]?.message ?? "Invalid parameters", 400);
        }
        console.error("Failed to fetch place", error);
        return fail("Failed to fetch place", 500);
    }
}
