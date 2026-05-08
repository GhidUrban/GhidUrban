import { normalizeListingPlanType } from "@/lib/listing-plan";
import { supabase } from "@/lib/supabase/client";
import type { PlaceListingRow } from "./types";

export async function getPlaceListing(
    placeId: string, citySlug: string, categorySlug: string,
): Promise<PlaceListingRow | null> {
    const { data, error } = await supabase
        .from("place_listings")
        .select("*")
        .eq("place_id", placeId)
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug)
        .maybeSingle();
    if (error) return null;
    return data;
}

export async function upsertPlaceListing(
    row: Partial<PlaceListingRow> & { place_id: string; city_slug: string; category_slug: string },
): Promise<void> {
    const payload = { ...row };
    if (payload.plan_type != null) {
        payload.plan_type = normalizeListingPlanType(payload.plan_type);
    }
    const { error } = await supabase
        .from("place_listings")
        .upsert(payload, { onConflict: "place_id,city_slug,category_slug" });
    if (error) throw new Error("Failed to upsert place_listings");
}

export async function updatePlaceListingFeatured(
    placeId: string, citySlug: string, categorySlug: string, featured: boolean,
): Promise<void> {
    const { error } = await supabase
        .from("place_listings")
        .update({ featured })
        .eq("place_id", placeId)
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug);
    if (error) throw new Error("Failed to update listing featured");
}

export async function deletePlaceListing(
    placeId: string, citySlug: string, categorySlug: string,
): Promise<void> {
    const { error } = await supabase
        .from("place_listings")
        .delete()
        .eq("place_id", placeId)
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug);
    if (error) throw new Error("Failed to delete place_listings");
}
