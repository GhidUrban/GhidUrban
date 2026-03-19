import { ok } from "@/lib/api-response";
import { getCategoryCardsForCity, isValidCitySlug } from "@/lib/place-repository";
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

        if (!city_slug) {
            return errorResponse("city_slug is required", 400);
        }

        if (!isValidCitySlug(city_slug)) {
            return errorResponse("City not found", 404);
        }

        const categories = getCategoryCardsForCity(city_slug).map((category) => ({
            category_slug: category.slug,
            category_name: category.name,
            category_icon: category.icon,
        }));

        return ok("Categories fetched successfully", {
            city_slug,
            count: categories.length,
            categories,
        });
    } catch (error) {
        console.error("Failed to fetch categories", error);
        return errorResponse("Failed to fetch categories", 500);
    }
}
