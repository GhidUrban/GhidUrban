import { ok } from "@/lib/api-response";
import {
    cityExistsInSupabase,
    getCategoriesByCityFromSupabase,
    isSafeCitySlug,
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
        const city_slug = (searchParams.get("city_slug") ?? "").trim();

        console.log("[categories api] city_slug:", city_slug);

        if (!city_slug) {
            return errorResponse("city_slug is required", 400);
        }

        if (!isSafeCitySlug(city_slug)) {
            return errorResponse("Invalid city_slug", 400);
        }

        const exists = await cityExistsInSupabase(city_slug);
        if (!exists) {
            console.log("[categories api] city not in database:", city_slug);
            return errorResponse("City not found", 404);
        }

        const categories = await getCategoriesByCityFromSupabase(city_slug);
        const n = categories.length;
        console.log(`[categories api] found ${n} categories for ${city_slug}`);

        if (n === 0) {
            return errorResponse("No categories for this city", 404);
        }

        return ok("Categories fetched successfully", {
            city_slug,
            count: n,
            categories,
        });
    } catch (error) {
        console.error("Failed to fetch categories", error);
        return errorResponse("Failed to fetch categories", 500);
    }
}
