import {
    createPlaceInSupabase,
    deletePlaceFromSupabase,
    getAllPlacesForAdminFromSupabase,
    type AdminSupabasePlaceRow,
    placeDuplicateByNormalizedAddressInCategory,
    placeDuplicateBySimilarNameAndAddressInCategory,
    placeExistsByExternalPlaceId,
    placeIdExistsInCategory,
    updatePlaceFeaturedInSupabase,
    updatePlaceInSupabase,
    updatePlaceStatusInSupabase,
} from "@/lib/place-repository";
import { placeIdSlugFromName } from "@/lib/slug";
import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function filterAdminPlaces(
    places: AdminSupabasePlaceRow[],
    search: string,
    city_slug: string,
    category_slug: string,
): AdminSupabasePlaceRow[] {
    let filtered: AdminSupabasePlaceRow[] = places;

    const searchTokens = search
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (searchTokens.length > 0) {
        filtered = filtered.filter((p) => {
            const haystack = [
                p.name,
                p.city_slug,
                p.category_slug,
                p.address ?? "",
            ]
                .join(" ")
                .toLowerCase();
            return searchTokens.every((token) => haystack.includes(token));
        });
    }

    if (city_slug) {
        filtered = filtered.filter((p) => p.city_slug === city_slug);
    }

    if (category_slug) {
        filtered = filtered.filter((p) => p.category_slug === category_slug);
    }

    return filtered;
}

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

function planTypeFromBody(raw: unknown): "free" | "promoted" | "featured" {
    if (typeof raw !== "string") {
        return "free";
    }
    const v = raw.toLowerCase().trim();
    if (v === "promoted" || v === "featured" || v === "free") {
        return v;
    }
    return "free";
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") ?? "";
        const city_slug = searchParams.get("city_slug") ?? "";
        const category_slug = searchParams.get("category_slug") ?? "";

        console.log("ADMIN FILTER:", { search, city_slug, category_slug });

        const allPlaces = await getAllPlacesForAdminFromSupabase();

        const city_slugs = Array.from(new Set(allPlaces.map((p) => p.city_slug))).sort();
        const category_slugs = Array.from(
            new Set(allPlaces.map((p) => p.category_slug)),
        ).sort();

        const places = filterAdminPlaces(allPlaces, search, city_slug, category_slug);

        return NextResponse.json({
            success: true,
            message: "Admin places fetched successfully",
            data: {
                count: places.length,
                places,
                city_slugs,
                category_slugs,
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
        plan_type,
        plan_expires_at,
        external_place_id: externalPlaceIdBody,
        place_id: placeIdBody,
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

    const place_id =
        typeof placeIdBody === "string" && placeIdBody.trim()
            ? placeIdBody.trim()
            : placeIdSlugFromName(String(name));

    const external_place_id_trimmed =
        typeof externalPlaceIdBody === "string" && externalPlaceIdBody.trim()
            ? externalPlaceIdBody.trim()
            : "";

    const msgAddressOrSimilar = "Place already exists (same address / similar name)";

    function duplicateResponse(
        reason: "external_place_id" | "place_id" | "same_address" | "similar_name_address",
    ) {
        const message =
            reason === "external_place_id" || reason === "place_id"
                ? "Place already exists"
                : msgAddressOrSimilar;
        return NextResponse.json(
            {
                success: false,
                message,
                data: { reason },
            },
            { status: 409 },
        );
    }

    try {
        if (external_place_id_trimmed) {
            if (await placeExistsByExternalPlaceId(external_place_id_trimmed)) {
                console.log("[place create] duplicate by external_place_id");
                return duplicateResponse("external_place_id");
            }
        }

        if (await placeIdExistsInCategory(place_id, city_slug, category_slug)) {
            console.log("[place create] duplicate by place_id");
            return duplicateResponse("place_id");
        }

        if (
            await placeDuplicateBySimilarNameAndAddressInCategory(
                name,
                address,
                city_slug,
                category_slug,
            )
        ) {
            console.log("[place create] duplicate by similar name + address");
            return duplicateResponse("similar_name_address");
        }

        if (await placeDuplicateByNormalizedAddressInCategory(address, city_slug, category_slug)) {
            console.log("[place create] duplicate by address");
            return duplicateResponse("same_address");
        }

        const featuredBool = Boolean(featured);
        const featuredUntilResolved = featuredUntilFromBody(featured_until);
        const featuredUntilForCreate =
            featuredBool && featuredUntilResolved !== undefined
                ? featuredUntilResolved
                : null;
        const statusForCreate =
            status === "available" || status === "hidden" ? status : "available";

        const planExpiresCreate = featuredUntilFromBody(plan_expires_at);

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
            plan_type: planTypeFromBody(plan_type),
            plan_expires_at:
                planExpiresCreate === undefined ? null : planExpiresCreate,
            external_place_id: external_place_id_trimmed || null,
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
            plan_type,
            plan_expires_at,
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

            const planExpiresParsed = featuredUntilFromBody(plan_expires_at);

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
                plan_type:
                    typeof plan_type === "string" ? planTypeFromBody(plan_type) : undefined,
                plan_expires_at: planExpiresParsed,
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
