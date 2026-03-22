import {
    createPlaceInSupabase,
    deletePlaceFromSupabase,
    getAllPlacesForAdminFromSupabase,
    updatePlaceInSupabase,
} from "@/lib/place-repository";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const places = await getAllPlacesForAdminFromSupabase();

        return NextResponse.json({
            success: true,
            message: "Admin places fetched successfully",
            data: {
                count: places.length,
                places,
            },
        });
    } catch (error) {
        console.error("Failed to fetch admin places", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch admin places",
                data: null,
            },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    const body = await req.json();

    const {
        name,
        city_slug,
        category_slug,
        address,
        schedule,
        image,
        rating,
        phone,
        website,
        maps_url,
        description
    } = body;

    if (!name || !city_slug || !category_slug) {
        return NextResponse.json(
            {
                success: false,
                message: "Missing required fields",
                data: null
            },
            { status: 400 }
        );
    }

    const place_id = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    try {
        await createPlaceInSupabase({
            place_id,
            city_slug,
            category_slug,
            name,
            description: description || null,
            address: address || null,
            schedule: schedule || null,
            image: image || null,
            rating: rating ? Number(rating) : null,
            phone: phone || null,
            website: website || null,
            maps_url: maps_url || null,
        });
    } catch (error) {
        console.error("Insert error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to create place",
                data: null
            },
            { status: 500 }
        );
    }

    revalidatePath("/admin");
    revalidatePath("/orase");
    revalidatePath(`/orase/${city_slug}`);
    revalidatePath(`/orase/${city_slug}/${category_slug}`);
    revalidatePath(`/orase/${city_slug}/${category_slug}/${place_id}`);

    return NextResponse.json({
        success: true,
        message: "Place created successfully",
        data: null
    });
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();

        const {
            place_id,
            name,
            city_slug,
            category_slug,
            address,
            schedule,
            image,
            rating,
            phone,
            website,
            maps_url,
            description,
        } = body;

        if (!place_id || !name || !city_slug || !category_slug) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields",
                    data: null,
                },
                { status: 400 }
            );
        }

        try {
            await updatePlaceInSupabase({
                place_id,
                city_slug,
                category_slug,
                name,
                description: description || null,
                address: address || null,
                schedule: schedule || null,
                image: image || null,
                rating: rating ? Number(rating) : null,
                phone: phone || null,
                website: website || null,
                maps_url: maps_url || null,
            });
        } catch (error) {
            console.error("Update error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to update place",
                    data: null,
                },
                { status: 500 }
            );
        }

        revalidatePath("/admin");
        revalidatePath("/orase");
        revalidatePath(`/orase/${city_slug}`);
        revalidatePath(`/orase/${city_slug}/${category_slug}`);
        revalidatePath(`/orase/${city_slug}/${category_slug}/${place_id}`);

        return NextResponse.json({
            success: true,
            message: "Place updated successfully",
            data: null,
        });
    } catch (error) {
        console.error("Failed to update place", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to update place",
                data: null,
            },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { place_id, city_slug, category_slug } = body;

        if (!place_id || !city_slug || !category_slug) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields",
                    data: null,
                },
                { status: 400 }
            );
        }

        try {
            await deletePlaceFromSupabase(place_id, city_slug, category_slug);
        } catch (error) {
            console.error("Delete error:", error);

            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to delete place",
                    data: null,
                },
                { status: 500 }
            );
        }

        revalidatePath("/admin");
        revalidatePath("/orase");
        revalidatePath(`/orase/${city_slug}`);
        revalidatePath(`/orase/${city_slug}/${category_slug}`);
        revalidatePath(`/orase/${city_slug}/${category_slug}/${place_id}`);

        return NextResponse.json({
            success: true,
            message: "Place deleted successfully",
            data: null,
        });
    } catch (error) {
        console.error("Failed to delete place", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to delete place",
                data: null,
            },
            { status: 500 }
        );
    }
}
