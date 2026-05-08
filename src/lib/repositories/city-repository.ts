import { supabase } from "@/lib/supabase/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { placeIdSlugFromName } from "@/lib/slug";
import {
    adminListSortRank,
    isSafeCitySlug,
    type AdminCityRow,
    type CreateCityResult,
    type SupabaseCity,
    type UpdateCityInput,
} from "./types";

export async function getPublicCitiesFromSupabase(): Promise<SupabaseCity[]> {
    const { data, error } = await supabase
        .from("cities")
        .select("slug, name, image")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (error) throw error;
    return data ?? [];
}

export async function getAllCitySlugs(): Promise<string[]> {
    const cities = await getPublicCitiesFromSupabase();
    return cities.map((c) => c.slug);
}

export async function getAllCitiesForAdminFromSupabase(): Promise<AdminCityRow[]> {
    const { data, error } = await supabase
        .from("cities")
        .select("slug, name, image, is_active, sort_order, latitude, longitude");

    if (error) throw error;

    const rows = (data ?? []) as AdminCityRow[];
    return [...rows].sort((a, b) => {
        const d = adminListSortRank(a.sort_order) - adminListSortRank(b.sort_order);
        if (d !== 0) return d;
        return a.name.localeCompare(b.name, "ro", { sensitivity: "base" });
    });
}

export async function cityExistsInSupabase(citySlug: string): Promise<boolean> {
    const s = citySlug?.trim();
    if (!s) return false;
    const { data, error } = await supabase.from("cities").select("slug").eq("slug", s).limit(1);
    if (error) {
        console.error("Supabase city lookup error:", error);
        throw new Error("Failed to verify city");
    }
    return (data?.length ?? 0) > 0;
}

export async function isValidCitySlug(slug: string): Promise<boolean> {
    return cityExistsInSupabase(slug);
}

export async function resolveCityCenterCoordinates(
    city_slug: string,
): Promise<{ lat: number; lon: number } | null> {
    const s = city_slug?.trim();
    if (!s) {
        console.warn("[city coords] missing DB coordinates for (empty slug)");
        return null;
    }

    const { data, error } = await supabase
        .from("cities")
        .select("latitude, longitude")
        .eq("slug", s)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("resolveCityCenterCoordinates:", error);
        return null;
    }
    if (!data) return null;

    const row = data as { latitude: number | null; longitude: number | null };
    const la = row.latitude != null ? Number(row.latitude) : NaN;
    const lo = row.longitude != null ? Number(row.longitude) : NaN;
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;

    return { lat: la, lon: lo };
}

export async function updateCityInSupabase(
    city_slug: string,
    updates: UpdateCityInput,
): Promise<{ slug: string }> {
    const trimmedOld = city_slug?.trim();
    if (!trimmedOld) throw new Error("Lipsește slug-ul orașului.");

    let newSlug =
        updates.slug !== undefined && updates.slug !== null
            ? updates.slug.trim()
            : trimmedOld;
    if (!newSlug || !isSafeCitySlug(newSlug)) {
        throw new Error("Slug invalid. Folosiți litere mici, cifre și cratime.");
    }

    if (newSlug !== trimmedOld) {
        const { data: conflict, error: conflictErr } = await supabase
            .from("cities").select("slug").eq("slug", newSlug).limit(1);
        if (conflictErr) throw new Error("Nu s-a putut verifica slug-ul.");
        if ((conflict?.length ?? 0) > 0) throw new Error("Există deja un oraș cu acest slug.");

        const { error: placesErr } = await supabase
            .from("places").update({ city_slug: newSlug }).eq("city_slug", trimmedOld);
        if (placesErr) throw new Error("Nu s-au putut actualiza locurile pentru noul slug.");

        const { error: catsErr } = await supabase
            .from("categories").update({ city_slug: newSlug }).eq("city_slug", trimmedOld);
        if (catsErr) throw new Error("Nu s-au putut actualiza categoriile pentru noul slug.");
    }

    const row: Record<string, unknown> = {};
    if (updates.name !== undefined) {
        const n = updates.name?.trim();
        if (!n) throw new Error("Numele orașului nu poate fi gol.");
        row.name = n;
    }
    if (updates.image !== undefined) {
        row.image = updates.image === null || updates.image === "" ? null : String(updates.image).trim();
    }
    if (updates.is_active !== undefined) row.is_active = Boolean(updates.is_active);
    if (updates.sort_order !== undefined) {
        const so = Number(updates.sort_order);
        if (!Number.isFinite(so) || !Number.isInteger(so)) throw new Error("sort_order trebuie să fie număr întreg.");
        row.sort_order = so;
    }
    if (updates.latitude !== undefined) {
        if (updates.latitude === null) { row.latitude = null; }
        else {
            const la = Number(updates.latitude);
            if (!Number.isFinite(la) || la < -90 || la > 90) throw new Error("latitude trebuie să fie între -90 și 90.");
            row.latitude = la;
        }
    }
    if (updates.longitude !== undefined) {
        if (updates.longitude === null) { row.longitude = null; }
        else {
            const lo = Number(updates.longitude);
            if (!Number.isFinite(lo) || lo < -180 || lo > 180) throw new Error("longitude trebuie să fie între -180 și 180.");
            row.longitude = lo;
        }
    }
    if (newSlug !== trimmedOld) row.slug = newSlug;
    if (Object.keys(row).length === 0) return { slug: newSlug };

    const { error } = await supabase.from("cities").update(row).eq("slug", trimmedOld);
    if (error) throw new Error("Nu s-a putut actualiza orașul.");
    return { slug: newSlug };
}

const STANDARD_CATEGORY_DEFS: { category_slug: string; category_name: string }[] = [
    { category_slug: "cafenele", category_name: "Cafenele" },
    { category_slug: "restaurante", category_name: "Restaurante" },
    { category_slug: "natura", category_name: "Natura" },
    { category_slug: "cultural", category_name: "Cultural" },
    { category_slug: "institutii", category_name: "Institutii" },
    { category_slug: "cazare", category_name: "Cazare" },
    { category_slug: "evenimente", category_name: "Evenimente" },
];

async function insertMissingStandardCategories(db: SupabaseClient, city_slug: string): Promise<number> {
    const { data: existingCats, error: catLookupErr } = await db
        .from("categories").select("category_slug").eq("city_slug", city_slug);
    if (catLookupErr) throw new Error("Nu s-au putut citi categoriile.");

    const have = new Set((existingCats ?? []).map((r: { category_slug: string }) => r.category_slug));
    const toInsert = STANDARD_CATEGORY_DEFS
        .filter((d) => !have.has(d.category_slug))
        .map((d) => ({
            city_slug,
            category_slug: d.category_slug,
            category_name: d.category_name,
            is_active: true,
            sort_order: STANDARD_CATEGORY_DEFS.findIndex((x) => x.category_slug === d.category_slug) + 1,
        }));

    if (toInsert.length === 0) return 0;
    const { error: insertCatErr } = await db.from("categories").insert(toInsert);
    if (insertCatErr) throw new Error("Categoriile standard nu s-au putut adăuga.");
    return toInsert.length;
}

function supabaseClientForCityCreate(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (url && serviceKey) return createClient(url, serviceKey);
    return supabase;
}

export function parseCityCreateCoords(
    coords?: { latitude: number; longitude: number } | null,
): { latitude: number; longitude: number } | null {
    if (coords == null) return null;
    const latitude = Number(coords.latitude);
    const longitude = Number(coords.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
}

export async function createCityWithStandardCategories(
    name: string,
    slugInput?: string | null,
    coords?: { latitude: number; longitude: number } | null,
): Promise<CreateCityResult> {
    const trimmedName = name?.trim();
    if (!trimmedName) throw new Error("Lipsește numele orașului.");

    const city_slug = (slugInput?.trim() || placeIdSlugFromName(trimmedName)).trim();
    if (!city_slug || !isSafeCitySlug(city_slug)) {
        throw new Error("Slug invalid. Folosiți litere mici, cifre și cratime.");
    }

    const parsedCoords = parseCityCreateCoords(coords);
    const db = supabaseClientForCityCreate();
    const cityImage = `/images/places/${city_slug}/city.jpg`;

    const { data: existingRows, error: cityLookupErr } = await db
        .from("cities").select("slug, latitude, longitude").eq("slug", city_slug).limit(1);
    if (cityLookupErr) throw new Error("Nu s-a putut verifica orașul.");

    const existing = (existingRows ?? [])[0] as
        | { slug: string; latitude: number | null; longitude: number | null }
        | undefined;

    if (existing) {
        let coordinates_updated = false;
        if (parsedCoords) {
            const { error: coordErr } = await db
                .from("cities").update({ latitude: parsedCoords.latitude, longitude: parsedCoords.longitude }).eq("slug", city_slug);
            if (coordErr) throw new Error("Nu s-au putut actualiza coordonatele orașului.");
            coordinates_updated = true;
        }
        const categories_created = await insertMissingStandardCategories(db, city_slug);
        return { city_slug, categories_created, reused_existing: true, coordinates_updated };
    }

    if (!parsedCoords) throw new Error("Lipsește latitude / longitude.");

    const { error: insertCityErr } = await db.from("cities").insert([{
        slug: city_slug, name: trimmedName, image: cityImage,
        latitude: parsedCoords.latitude, longitude: parsedCoords.longitude,
    }]);
    if (insertCityErr) throw new Error("Nu s-a putut crea orașul.");

    const categories_created = await insertMissingStandardCategories(db, city_slug);
    return { city_slug, categories_created, reused_existing: false, coordinates_updated: false };
}
