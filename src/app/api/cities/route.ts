import { ok } from "@/lib/api-response";
import { getAllCitySlugs } from "@/lib/place-repository";
import { slugToTitle } from "@/lib/slug";
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

export async function GET() {
    try {
        const city_slugs = getAllCitySlugs();
        const cities = city_slugs.map((city_slug) => ({
            city_slug,
            city_name: slugToTitle(city_slug),
        }));

        return ok("Cities fetched successfully", {
            count: cities.length,
            cities,
        });
    } catch (error) {
        console.error("Failed to fetch cities", error);
        return errorResponse("Failed to fetch cities", 500);
    }
}
