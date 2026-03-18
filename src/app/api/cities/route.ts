import { ok } from "@/lib/api-response";
import { getAllCitySlugs } from "@/lib/place-repository";
import { slugToTitle } from "@/lib/slug";

export async function GET() {
    const city_slugs = getAllCitySlugs();
    const cities = city_slugs.map((city_slug) => ({
        city_slug,
        city_name: slugToTitle(city_slug),
    }));

    return ok("Cities fetched successfully.", {
        count: cities.length,
        cities,
    });
}
