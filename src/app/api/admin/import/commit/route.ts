import {
    createPlaceInSupabase,
    placeExistsByExternalPlaceId,
    placeExistsByNameCityCategory,
    placeIdExistsInCategory,
} from "@/lib/place-repository";
import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";
import { placeIdSlugFromName } from "@/lib/slug";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type CommitItem = {
    name: string;
    address: string;
    phone: string;
    website: string;
    schedule: string;
    maps_url: string;
    image: string;
    external_source: string;
    external_place_id: string;
    latitude?: number | null;
    longitude?: number | null;
};

function strOrNull(v: unknown): string | null {
    if (typeof v !== "string") {
        return null;
    }
    const t = v.trim();
    return t ? t : null;
}

function strOrEmpty(v: unknown): string {
    return typeof v === "string" ? v.trim() : "";
}

function numOrNull(v: unknown): number | null {
    if (v === null || v === undefined) {
        return null;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
        return v;
    }
    if (typeof v === "string") {
        const t = v.trim();
        if (!t) {
            return null;
        }
        const n = Number(t);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const city_slug = typeof body.city_slug === "string" ? body.city_slug.trim() : "";
        const category_slug = typeof body.category_slug === "string" ? body.category_slug.trim() : "";
        const items = body.items;

        if (!city_slug || !category_slug) {
            return NextResponse.json(
                { success: false, message: "Missing city_slug or category_slug", data: null },
                { status: 400 },
            );
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, message: "Missing or empty items", data: null },
                { status: 400 },
            );
        }

        let inserted = 0;
        let skipped = 0;
        const usedPlaceIds = new Set<string>();

        for (const raw of items as unknown[]) {
            if (!raw || typeof raw !== "object") {
                skipped += 1;
                continue;
            }

            const item = raw as Record<string, unknown>;
            const name = strOrEmpty(item.name);
            if (!name) {
                skipped += 1;
                continue;
            }

            const external_place_id = strOrEmpty(item.external_place_id);
            if (external_place_id && (await placeExistsByExternalPlaceId(external_place_id))) {
                skipped += 1;
                continue;
            }

            if (await placeExistsByNameCityCategory(name, city_slug, category_slug)) {
                skipped += 1;
                continue;
            }

            const baseSlug = placeIdSlugFromName(name);
            if (!baseSlug) {
                skipped += 1;
                continue;
            }

            let place_id = baseSlug;
            let suffix = 2;
            while (
                usedPlaceIds.has(place_id) ||
                (await placeIdExistsInCategory(place_id, city_slug, category_slug))
            ) {
                place_id = `${baseSlug}-${suffix}`;
                suffix += 1;
            }
            usedPlaceIds.add(place_id);

            const imageRaw = strOrEmpty(item.image);
            const image = imageRaw || PLACE_IMAGE_PLACEHOLDER;

            await createPlaceInSupabase({
                place_id,
                city_slug,
                category_slug,
                name,
                description: "",
                address: strOrNull(item.address),
                schedule: strOrNull(item.schedule),
                image,
                rating: 0,
                phone: strOrNull(item.phone),
                website: strOrNull(item.website),
                maps_url: strOrNull(item.maps_url),
                status: "available",
                featured: false,
                featured_until: null,
                external_source: strOrNull(item.external_source),
                external_place_id: external_place_id ? external_place_id : null,
                latitude: numOrNull(item.latitude),
                longitude: numOrNull(item.longitude),
            });

            inserted += 1;
        }

        revalidatePath("/admin");
        revalidatePath("/orase");
        revalidatePath(`/orase/${city_slug}`);
        revalidatePath(`/orase/${city_slug}/${category_slug}`);

        return NextResponse.json({
            success: true,
            message: "Import completed",
            data: { inserted, skipped },
        });
    } catch (error) {
        console.error("Import commit error:", error);
        return NextResponse.json(
            { success: false, message: "Import commit failed", data: null },
            { status: 500 },
        );
    }
}
