import { normalizeListingPlanType } from "@/lib/listing-plan";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatSupabaseWriteError } from "@/lib/supabase-error";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
    getPlaceKeyByGoogleOrExternal,
    normalizeCanonicalGooglePlaceId,
} from "./place-repository";
import type { CreatePlaceOutcome, SupabasePlaceMutationInput } from "./types";

export async function categoryExistsForCityInSupabase(
    citySlug: string,
    categorySlug: string,
): Promise<boolean> {
    const sb = getSupabaseAdmin();
    const city = citySlug?.trim();
    const cat = categorySlug?.trim();
    if (!city || !cat) return false;
    const { data, error } = await sb
        .from("categories")
        .select("category_slug")
        .eq("city_slug", city)
        .eq("category_slug", cat)
        .maybeSingle();
    if (error) throw new Error(formatSupabaseWriteError("categories select", error));
    return data != null;
}

async function adminUpsertPlaceGoogleRow(
    sb: SupabaseClient,
    row: {
        place_id: string;
        city_slug: string;
        category_slug: string;
        google_place_id: string | null;
    },
): Promise<void> {
    const { error } = await sb
        .from("place_google_data")
        .upsert(row, { onConflict: "place_id,city_slug,category_slug" });
    if (error) throw new Error(formatSupabaseWriteError("place_google_data upsert", error));
}

async function adminUpsertPlaceListingPartial(
    sb: SupabaseClient,
    row: Record<string, unknown> & { place_id: string; city_slug: string; category_slug: string },
): Promise<void> {
    const payload = { ...row };
    if (payload["plan_type"] != null) {
        payload["plan_type"] = normalizeListingPlanType(String(payload["plan_type"]));
    }
    const { error } = await sb
        .from("place_listings")
        .upsert(payload, { onConflict: "place_id,city_slug,category_slug" });
    if (error) throw new Error(formatSupabaseWriteError("place_listings upsert", error));
}

async function adminUpdatePlaceForImport(
    sb: SupabaseClient,
    place: SupabasePlaceMutationInput,
): Promise<void> {
    const corePayload: Record<string, unknown> = {
        name: place.name,
        description: place.description,
        address: place.address,
        schedule: place.schedule,
        image: place.image,
        rating: place.rating,
        phone: place.phone,
        website: place.website,
        maps_url: place.maps_url,
    };
    if (place.status != null) corePayload.status = place.status;
    if (place.latitude !== undefined) corePayload.latitude = place.latitude;
    if (place.longitude !== undefined) corePayload.longitude = place.longitude;

    const { error } = await sb
        .from("places")
        .update(corePayload)
        .eq("place_id", place.place_id)
        .eq("city_slug", place.city_slug)
        .eq("category_slug", place.category_slug);
    if (error) throw new Error(formatSupabaseWriteError("places update (import merge)", error));

    const listingPayload: Record<string, unknown> & {
        place_id: string;
        city_slug: string;
        category_slug: string;
    } = {
        place_id: place.place_id,
        city_slug: place.city_slug,
        category_slug: place.category_slug,
    };
    let hasListingUpdate = false;
    if (typeof place.featured === "boolean") {
        listingPayload.featured = place.featured;
        hasListingUpdate = true;
    }
    if (place.featured_until !== undefined) {
        listingPayload.featured_until =
            place.featured_until == null || place.featured_until === "" ? null : place.featured_until;
        hasListingUpdate = true;
    }
    if (place.plan_type != null) {
        listingPayload.plan_type = normalizeListingPlanType(place.plan_type);
        hasListingUpdate = true;
    }
    if (place.plan_expires_at !== undefined) {
        listingPayload.plan_expires_at =
            place.plan_expires_at == null || place.plan_expires_at === "" ? null : place.plan_expires_at;
        hasListingUpdate = true;
    }
    if (place.external_place_id !== undefined) {
        listingPayload.external_place_id =
            place.external_place_id == null || place.external_place_id === "" ? null : place.external_place_id;
        hasListingUpdate = true;
    }
    if (place.external_source !== undefined) {
        listingPayload.external_source = place.external_source;
        hasListingUpdate = true;
    }
    if (hasListingUpdate) {
        await adminUpsertPlaceListingPartial(sb, listingPayload);
    }

    if (place.google_place_id !== undefined) {
        const gid = normalizeCanonicalGooglePlaceId(place.google_place_id) ?? place.google_place_id;
        await adminUpsertPlaceGoogleRow(sb, {
            place_id: place.place_id,
            city_slug: place.city_slug,
            category_slug: place.category_slug,
            google_place_id: gid,
        });
    }
}

export async function createOrMergePlaceForAdminImport(
    place: SupabasePlaceMutationInput,
): Promise<CreatePlaceOutcome> {
    const sb = getSupabaseAdmin();
    const googleKey = normalizeCanonicalGooglePlaceId(
        place.google_place_id ?? place.external_place_id ?? undefined,
    );
    if (googleKey) {
        const existing = await getPlaceKeyByGoogleOrExternal(
            place.google_place_id ?? place.external_place_id ?? googleKey,
            { city_slug: place.city_slug, category_slug: place.category_slug },
        );
        if (existing) {
            await adminUpdatePlaceForImport(sb, {
                ...place,
                place_id: existing.place_id,
                google_place_id: googleKey,
            });
            return { result: "merged", place_id: existing.place_id };
        }
    }

    const coreRow = {
        place_id: place.place_id,
        city_slug: place.city_slug,
        category_slug: place.category_slug,
        name: place.name,
        description: place.description,
        address: place.address,
        schedule: place.schedule,
        image: place.image,
        rating: place.rating,
        phone: place.phone,
        website: place.website,
        maps_url: place.maps_url,
        latitude: place.latitude ?? null,
        longitude: place.longitude ?? null,
        status: place.status ?? "available",
    };

    const { error: insertErr } = await sb.from("places").insert([coreRow]);
    if (insertErr) throw new Error(formatSupabaseWriteError("places insert (import)", insertErr));

    await adminUpsertPlaceListingPartial(sb, {
        place_id: place.place_id,
        city_slug: place.city_slug,
        category_slug: place.category_slug,
        plan_type: normalizeListingPlanType(place.plan_type),
        plan_expires_at: place.plan_expires_at == null || place.plan_expires_at === "" ? null : place.plan_expires_at,
        featured: typeof place.featured === "boolean" ? place.featured : false,
        featured_until:
            place.featured_until == null || place.featured_until === "" ? null : place.featured_until ?? null,
        external_source: place.external_source ?? null,
        external_place_id: place.external_place_id ?? null,
    });

    if (googleKey) {
        await adminUpsertPlaceGoogleRow(sb, {
            place_id: place.place_id,
            city_slug: place.city_slug,
            category_slug: place.category_slug,
            google_place_id: googleKey,
        });
    }

    return { result: "inserted", place_id: place.place_id };
}
