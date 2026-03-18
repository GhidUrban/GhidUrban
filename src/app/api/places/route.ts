import { fail, ok } from "@/lib/api-response";
import {
    getPlacesByCategory,
    isValidCategorySlug,
    isValidCitySlug,
} from "@/lib/place-repository";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const city_slug = searchParams.get("city_slug");
    const category_slug = searchParams.get("category_slug");

    if (!city_slug || !category_slug) {
        return fail("Missing required query params: city_slug, category_slug.", 400, {
            city_slug,
            category_slug,
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

    const places = getPlacesByCategory(city_slug, category_slug);

    return ok("Places fetched successfully.", {
        city_slug,
        category_slug,
        count: places.length,
        places,
    });
}
