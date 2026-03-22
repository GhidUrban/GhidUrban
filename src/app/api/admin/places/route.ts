import {
    createPlaceInSupabase,
    deletePlaceFromSupabase,
    getAllPlacesForAdminFromSupabase,
    updatePlaceFeaturedInSupabase,
    updatePlaceInSupabase,
    updatePlaceStatusInSupabase,
} from "@/lib/place-repository";
import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function normalizeImagePath(raw: unknown): string {
    if (typeof raw !== "string" || !raw.trim()) {
        return PLACE_IMAGE_PLACEHOLDER;
    }
    return raw.trim();
}

function featuredUntilFromBody(raw: unknown): string | null | undefined {
    if (raw === undefined) {
        return undefined;
    }
    if (raw === null || raw === "") {
        return null;
    }
    const d = new Date(String(raw));
    if (Number.isNaN(d.getTime())) {
        return null;
    }
    return d.toISOString();
}

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
        description,
        status,
        featured,
        featured_until,
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
        const featuredBool = Boolean(featured);
        const featuredUntilResolved = featuredUntilFromBody(featured_until);
        const featuredUntilForCreate =
            featuredBool && featuredUntilResolved !== undefined
                ? featuredUntilResolved
                : null;
        const statusForCreate =
            status === "available" || status === "hidden" ? status : "available";

        await createPlaceInSupabase({
            place_id,
            city_slug,
            category_slug,
            name,
            description: description || null,
            address: address || null,
            schedule: schedule || null,
            image: normalizeImagePath(image),
            rating: rating ? Number(rating) : null,
            phone: phone || null,
            website: website || null,
            maps_url: maps_url || null,
            status: statusForCreate,
            featured: featuredBool,
            featured_until: featuredUntilForCreate,
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
            status_only,
            featured_only,
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
            status,
            featured,
            featured_until,
        } = body;

        if (
            featured_only === true &&
            place_id &&
            city_slug &&
            category_slug &&
            typeof featured === "boolean"
        ) {
            try {
                await updatePlaceFeaturedInSupabase(
                    place_id,
                    city_slug,
                    category_slug,
                    featured,
                );
            } catch (error) {
                console.error("Update featured error:", error);

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
        }

        if (
            status_only === true &&
            place_id &&
            city_slug &&
            category_slug &&
            (status === "available" || status === "hidden")
        ) {
            try {
                await updatePlaceStatusInSupabase(
                    place_id,
                    city_slug,
                    category_slug,
                    status,
                );
            } catch (error) {
                console.error("Update status error:", error);

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
        }

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
            const featuredVal = typeof featured === "boolean" ? featured : undefined;
            const fuParsed = featuredUntilFromBody(featured_until);
            const featuredUntilForUpdate =
                featuredVal === false ? null : fuParsed;

            await updatePlaceInSupabase({
                place_id,
                city_slug,
                category_slug,
                name,
                description: description || null,
                address: address || null,
                schedule: schedule || null,
                image: normalizeImagePath(image),
                rating: rating ? Number(rating) : null,
                phone: phone || null,
                website: website || null,
                maps_url: maps_url || null,
                status:
                    status === "available" || status === "hidden" ? status : undefined,
                featured: featuredVal,
                featured_until: featuredUntilForUpdate,
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
