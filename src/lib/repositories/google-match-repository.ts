import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { supabase } from "@/lib/supabase/client";
import { normalizeCanonicalGooglePlaceId } from "./place-repository";
import type { GoogleMatchReviewAction, GooglePlaceIdListingConflict } from "./types";

export { normalizeCanonicalGooglePlaceId };

export async function findGooglePlaceIdListingConflict(
    googlePlaceIdRaw: string | null | undefined,
    excludePlaceId: string,
    citySlug: string,
    categorySlug: string,
): Promise<GooglePlaceIdListingConflict | null> {
    const canonical = normalizeCanonicalGooglePlaceId(googlePlaceIdRaw ?? undefined);
    const city = citySlug?.trim();
    const cat = categorySlug?.trim();
    const exclude = excludePlaceId?.trim();
    if (!canonical || !city || !cat || !exclude) return null;

    const variants = [canonical];
    if (canonical.startsWith("places/")) {
        const tail = canonical.slice("places/".length).trim();
        if (tail && !variants.includes(tail)) variants.push(tail);
    }
    for (const v of variants) {
        const { data, error } = await supabase
            .from("place_google_data")
            .select("place_id,city_slug,category_slug")
            .eq("google_place_id", v).eq("city_slug", city).eq("category_slug", cat)
            .neq("place_id", exclude).limit(1);
        if (error) throw new Error("Failed to check google_place_id conflict");
        const gRow = data?.[0] as { place_id: string; city_slug: string; category_slug: string } | undefined;
        if (gRow?.place_id) {
            const { data: placeData } = await supabase
                .from("places").select("name,address")
                .eq("place_id", gRow.place_id).eq("city_slug", gRow.city_slug).eq("category_slug", gRow.category_slug)
                .limit(1);
            const pl = placeData?.[0] as { name: string | null; address: string | null } | undefined;
            return {
                conflicting_place_id: gRow.place_id,
                conflicting_name: pl?.name?.trim() || gRow.place_id,
                conflicting_city_slug: gRow.city_slug,
                conflicting_category_slug: gRow.category_slug,
                conflicting_address: pl?.address ?? null,
            };
        }
    }
    return null;
}

export async function getGoogleMatchReviewFilterSlugsFromSupabase(): Promise<{
    city_slugs: string[];
    category_slugs: string[];
}> {
    const { data, error } = await supabase
        .from("place_google_data")
        .select("city_slug, category_slug")
        .eq("google_match_status", "review");
    if (error) throw new Error("Failed to fetch google match review filter options");

    const rows = (data ?? []) as { city_slug: string; category_slug: string }[];
    const citySet = new Set<string>();
    const catSet = new Set<string>();
    for (const r of rows) {
        if (r.city_slug) citySet.add(r.city_slug);
        if (r.category_slug) catSet.add(r.category_slug);
    }
    return { city_slugs: Array.from(citySet).sort(), category_slugs: Array.from(catSet).sort() };
}

export async function applyGoogleMatchReviewDecision(
    placeId: string, citySlug: string, categorySlug: string, action: GoogleMatchReviewAction,
): Promise<void> {
    const pid = placeId?.trim();
    const c = citySlug?.trim();
    const cat = categorySlug?.trim();
    if (!pid || !c || !cat) throw new Error("Missing place_id, city_slug, or category_slug");

    if (action === "matched") {
        const { data: selfRow, error: selfErr } = await supabase
            .from("place_google_data").select("google_place_id")
            .eq("place_id", pid).eq("city_slug", c).eq("category_slug", cat)
            .eq("google_match_status", "review").maybeSingle();
        if (selfErr) throw new Error("Failed to read place for conflict check");
        const gid = (selfRow as { google_place_id: string | null } | null)?.google_place_id;
        const conflict = await findGooglePlaceIdListingConflict(gid, pid, c, cat);
        if (conflict) {
            throw new Error("CONFLICT: același google_place_id este deja pe alt loc în această categorie. Rezolvă înainte de matched.");
        }
        const { data: updated, error } = await getSupabaseAdmin()
            .from("place_google_data")
            .update({ google_match_status: "matched" })
            .eq("place_id", pid)
            .eq("city_slug", c)
            .eq("category_slug", cat)
            .eq("google_match_status", "review")
            .select("place_id");
        if (error) throw new Error("Failed to update google match status");
        if (!updated?.length) {
            throw new Error(
                "Nu s-a actualizat niciun rând ca matched (lipsește rândul în review sau problema de permisiuni).",
            );
        }
        return;
    }

    if (action === "clear_match") {
        const { data: updated, error } = await getSupabaseAdmin()
            .from("place_google_data")
            .update({
                google_place_id: null, google_maps_uri: null, google_photo_uri: null,
                google_photo_name: null, google_match_score: null,
                google_hours_raw: null, google_hours_text: null,
                google_match_status: "cleared",
            })
            .eq("place_id", pid).eq("city_slug", c).eq("category_slug", cat).eq("google_match_status", "review")
            .select("place_id");
        if (error) throw new Error("Failed to clear google match fields");
        if (!updated?.length) {
            throw new Error(
                "Nu s-a golit nicio înregistrare (rândul nu era în stare review sau problema de permisiuni).",
            );
        }
    }
}
