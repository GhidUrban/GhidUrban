import { fail, ok } from "@/lib/api-response";
import {
    getPlaceById,
    isValidCategorySlug,
    isValidCitySlug,
} from "@/lib/place-repository";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const city_slug = searchParams.get("city_slug");
    const category_slug = searchParams.get("category_slug");
    const place_id = searchParams.get("place_id");

    if (!city_slug || !category_slug || !place_id) {
        return fail("Missing required query params: city_slug, category_slug, place_id.", 400, {
            city_slug,
            category_slug,
            place_id,
        });
    }

    if (!isValidCitySlug(city_slug)) {
        return fail("City not found.", 404, { city_slug });
    }

    if (!isValidCategorySlug(city_slug, category_slug)) {
        return fail("Category not found for this city.", 404, {
            city_slug,
            category_slug,
        });
    }

    const place = getPlaceById(city_slug, category_slug, place_id);

    if (!place) {
        return fail("Place not found for this city/category.", 404, {
            city_slug,
            category_slug,
            place_id,
        });
    }

    return ok("Place fetched successfully.", {
        city_slug,
        category_slug,
        place_id,
        place,
    });
}
