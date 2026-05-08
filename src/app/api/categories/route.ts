import { fail, ok } from "@/lib/api-response";
import {
    cityExistsInSupabase,
    getCategoriesByCityFromSupabase,
} from "@/lib/place-repository";
import { citySlugQuery, parseSearchParams } from "@/lib/schemas/api";
import { ZodError } from "zod";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const { city_slug } = parseSearchParams(citySlugQuery, searchParams);

        const exists = await cityExistsInSupabase(city_slug);
        if (!exists) return fail("City not found", 404);

        const categories = await getCategoriesByCityFromSupabase(city_slug);
        if (categories.length === 0) return fail("No categories for this city", 404);

        return ok("Categories fetched successfully", {
            city_slug,
            count: categories.length,
            categories,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return fail(error.issues[0]?.message ?? "Invalid parameters", 400);
        }
        console.error("Failed to fetch categories", error);
        return fail("Failed to fetch categories", 500);
    }
}
