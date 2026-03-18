import { fail, ok } from "@/lib/api-response";
import { getCategoryCardsForCity, isValidCitySlug } from "@/lib/place-repository";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const city_slug = searchParams.get("city_slug");

    if (!city_slug) {
        return fail("Missing required query param: city_slug.", 400, {
            city_slug: null,
        });
    }

    if (!isValidCitySlug(city_slug)) {
        return fail("City not found.", 404, { city_slug });
    }

    const categories = getCategoryCardsForCity(city_slug).map((category) => ({
        category_slug: category.slug,
        category_name: category.name,
        category_icon: category.icon,
    }));

    return ok("Categories fetched successfully.", {
        city_slug,
        count: categories.length,
        categories,
    });
}
