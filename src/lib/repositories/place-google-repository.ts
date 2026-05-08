import { supabase } from "@/lib/supabase/client";
import type { PlaceGoogleDataRow } from "./types";

export async function getPlaceGoogleData(
    placeId: string, citySlug: string, categorySlug: string,
): Promise<PlaceGoogleDataRow | null> {
    const { data, error } = await supabase
        .from("place_google_data")
        .select("*")
        .eq("place_id", placeId)
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug)
        .maybeSingle();
    if (error) return null;
    return data;
}

export async function upsertPlaceGoogleData(
    row: Partial<PlaceGoogleDataRow> & { place_id: string; city_slug: string; category_slug: string },
): Promise<void> {
    const { error } = await supabase
        .from("place_google_data")
        .upsert(row, { onConflict: "place_id,city_slug,category_slug" });
    if (error) throw new Error("Failed to upsert place_google_data");
}

export async function deletePlaceGoogleData(
    placeId: string, citySlug: string, categorySlug: string,
): Promise<void> {
    const { error } = await supabase
        .from("place_google_data")
        .delete()
        .eq("place_id", placeId)
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug);
    if (error) throw new Error("Failed to delete place_google_data");
}
