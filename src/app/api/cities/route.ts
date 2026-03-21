import { ok } from "@/lib/api-response";
import { getAllCitiesFromSupabase } from "@/lib/place-repository";
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
        const supabaseCities = await getAllCitiesFromSupabase();
        const cities = supabaseCities.map((city) => ({
            city_slug: city.slug,
            city_name: city.name,
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
