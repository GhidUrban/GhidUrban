import { verifyToken } from "@/lib/auth";
import { uploadGooglePhotosForPlace } from "@/lib/google-place-photos-storage";
import {
    categoryExistsForCityInSupabase,
    createOrMergePlaceForAdminImport,
} from "@/lib/repositories/place-import-admin-repository";
import {
    normalizeCanonicalGooglePlaceId,
    placeExistsByNameCityCategory,
    placeIdExistsInCategory,
} from "@/lib/place-repository";
import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";
import { placeIdSlugFromName } from "@/lib/slug";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { importCommitFriendlyError } from "@/lib/supabase-error";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
/** Import + Google Photo API poate depăși timeout-ul implicit. */
export const maxDuration = 300;

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
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;
        if (!token || verifyToken(token) === null) {
            return NextResponse.json(
                { success: false, message: "Neautorizat. Autentifică-te în administrare.", data: null },
                { status: 401 },
            );
        }

        const body = await req.json();
        const city_slug = typeof body.city_slug === "string" ? body.city_slug.trim() : "";
        const category_slug = typeof body.category_slug === "string" ? body.category_slug.trim() : "";
        const items = body.items;
        const uploadUpTo3 =
            body.upload_up_to_3_photos === true || body.upload_up_to_3_photos === "true";
        const maxPhotos = uploadUpTo3 ? 3 : 1;

        if (!city_slug || !category_slug) {
            return NextResponse.json(
                { success: false, message: "Lipsește city_slug sau category_slug.", data: null },
                { status: 400 },
            );
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, message: "Lista items este goală.", data: null },
                { status: 400 },
            );
        }

        const catOk = await categoryExistsForCityInSupabase(city_slug, category_slug);
        if (!catOk) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Categoria nu există pentru orașul selectat. Creează categoria pentru acest oraș în administrare înainte de import.",
                    data: { code: "category_missing" },
                },
                { status: 400 },
            );
        }

        let inserted = 0;
        let merged = 0;
        let skipped = 0;
        let inserts_with_photo_ok = 0;
        let inserts_photo_failed = 0;
        const usedPlaceIds = new Set<string>();
        const googleApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

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

            if (
                !external_place_id &&
                (await placeExistsByNameCityCategory(name, city_slug, category_slug))
            ) {
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

            const image = PLACE_IMAGE_PLACEHOLDER;

            const ratingVal = numOrNull(item.rating);
            const googlePlaceId = normalizeCanonicalGooglePlaceId(
                external_place_id ? external_place_id : null,
            );
            try {
                const createOutcome = await createOrMergePlaceForAdminImport({
                    place_id,
                    city_slug,
                    category_slug,
                    name,
                    description: "",
                    address: strOrNull(item.address),
                    schedule: strOrNull(item.schedule),
                    image,
                    rating: ratingVal !== null && ratingVal >= 0 ? ratingVal : 0,
                    phone: strOrNull(item.phone),
                    website: strOrNull(item.website),
                    maps_url: strOrNull(item.maps_url),
                    status: "available",
                    featured: false,
                    featured_until: null,
                    external_source: strOrNull(item.external_source),
                    external_place_id: external_place_id ? external_place_id : null,
                    google_place_id: googlePlaceId,
                    latitude: numOrNull(item.latitude),
                    longitude: numOrNull(item.longitude),
                });

                if (createOutcome.result === "inserted") {
                    inserted += 1;

                    const ext = external_place_id?.trim() ?? "";
                    if (ext.length > 0 && maxPhotos > 0 && googleApiKey) {
                        try {
                            const sb = getSupabaseAdmin();
                            const photoRes = await uploadGooglePhotosForPlace(sb, {
                                apiKey: googleApiKey,
                                city_slug,
                                category_slug,
                                place_id: createOutcome.place_id,
                                external_place_id: ext,
                                maxPhotos,
                                photoDelayMs: 120,
                            });
                            if (photoRes.count > 0) {
                                inserts_with_photo_ok += 1;
                            }
                            if (photoRes.failed_after_names) {
                                inserts_photo_failed += 1;
                            }
                        } catch (photoErr) {
                            console.error("Import commit: photo upload", photoErr);
                            inserts_photo_failed += 1;
                        }
                    }
                } else {
                    merged += 1;
                }
            } catch (e) {
                const rawMsg = e instanceof Error ? e.message : String(e);
                const mapped = importCommitFriendlyError(rawMsg);
                return NextResponse.json(
                    {
                        success: false,
                        message: mapped.message,
                        data: {
                            ...mapped.data,
                            detail: mapped.data.detail,
                            partial: {
                                inserted,
                                merged,
                                skipped,
                                inserts_with_photo_ok,
                                inserts_photo_failed,
                            },
                        },
                    },
                    { status: mapped.http_status },
                );
            }
        }

        revalidatePath("/admin");
        revalidatePath("/orase");
        revalidatePath(`/orase/${city_slug}`);
        revalidatePath(`/orase/${city_slug}/${category_slug}`);

        const parts = [
            `Import finalizat: ${inserted} locuri noi, ${merged} actualizate (același Google în categorie), ${skipped} sărate.`,
        ];
        if (maxPhotos > 0 && googleApiKey && inserted > 0) {
            parts.push(` Poze salvate pentru ${inserts_with_photo_ok} din cele ${inserted} locuri noi (obiectiv: max ${maxPhotos} foto / loc).`);
            if (inserts_photo_failed > 0) {
                parts.push(
                    ` La ${inserts_photo_failed} loc(uri) nou(e) nu s-au putut încărca pozele; datele despre loc rămân salvate.`,
                );
            }
        } else if (maxPhotos > 0 && !googleApiKey && inserted > 0) {
            parts.push(
                " GOOGLE_MAPS_API_KEY lipsește în mediu — locurile noi sunt fără poze din Google.",
            );
        }

        return NextResponse.json({
            success: true,
            message: parts.join(""),
            data: {
                inserted,
                merged,
                skipped,
                google_photos_max: maxPhotos,
                inserts_with_photo_ok,
                inserts_photo_failed,
            },
        });
    } catch (error) {
        const rawMsg = error instanceof Error ? error.message : "Import commit failed";
        console.error("Import commit error:", error);
        const mapped = importCommitFriendlyError(rawMsg);
        return NextResponse.json(
            {
                success: false,
                message: mapped.message,
                data: mapped.data,
            },
            { status: mapped.http_status },
        );
    }
}
