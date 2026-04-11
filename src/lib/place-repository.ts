import {
    isCategorySlug,
    isCitySlug,
    placesByCity,
    type CategorySlug,
    type CitySlug,
    type Place,
} from "@/data/places";
import { isActiveFeatured } from "@/lib/is-active-featured";
import { normalizeListingPlanType, resolveListing } from "@/lib/listing-plan";
import { GOOGLE_IMPORT_SUPPORTED_CATEGORIES } from "@/lib/google-import-categories";
import { haversineKm } from "@/lib/haversine-km";
import { placeIdSlugFromName, slugToTitle } from "@/lib/slug";
import { supabase } from "@/lib/supabase/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export { isActiveFeatured };


export type CategoryCard = {
    slug: CategorySlug;
    name: string;
    icon: string;
};

export type SupabaseCity = {
    slug: string;
    name: string;
};

export type AdminCityRow = {
    slug: string;
    name: string;
    image: string | null;
    is_active: boolean;
    sort_order: number;
    latitude: number | null;
    longitude: number | null;
};

export type AdminCategoryRow = {
    city_slug: string;
    category_slug: string;
    category_name: string;
    image: string | null;
    icon: string | null;
    is_active: boolean;
    sort_order: number;
};

// Admin: DB default sort_order 0 means unset — show after real 1,2,…
function adminListSortRank(sort_order: unknown): number {
    const n =
        typeof sort_order === "number" && Number.isFinite(sort_order)
            ? sort_order
            : Number(sort_order);
    if (!Number.isFinite(n) || n === 0) {
        return Number.MAX_SAFE_INTEGER;
    }
    return n;
}

export type UpdateCityInput = {
    name?: string;
    slug?: string;
    image?: string | null;
    is_active?: boolean;
    sort_order?: number;
    latitude?: number | null;
    longitude?: number | null;
};

export type UpdateCategoryInput = {
    category_name?: string;
    category_slug_new?: string;
    image?: string | null;
    icon?: string | null;
    is_active?: boolean;
    sort_order?: number;
};

export type SupabasePlace = {
    place_id: string;
    name: string;
    description: string | null;
    address: string | null;
    schedule: string | null;
    image: string | null;
    rating: number | null;
    phone: string | null;
    website: string | null;
    maps_url: string | null;
    featured: boolean | null;
    featured_until: string | null;
    plan_type: string;
    plan_expires_at: string | null;
    /** Prezent pe rândurile din `getPlacesByCategoryFromSupabase` / similar. */
    latitude?: number | null;
    longitude?: number | null;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
    google_hours_raw?: unknown | null;
};

export type PlaceVisibilityStatus = "available" | "hidden";

export type AdminSupabasePlaceRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    rating: number | null;
    status: string;
    featured: boolean;
    featured_until: string | null;
};

export type AdminSupabasePlaceDetails = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    description: string | null;
    address: string | null;
    schedule: string | null;
    image: string | null;
    rating: number | null;
    phone: string | null;
    website: string | null;
    maps_url: string | null;
    status: string;
    featured: boolean;
    featured_until: string | null;
    plan_type: string;
    plan_expires_at: string | null;
};

export type SupabasePlaceMutationInput = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    description: string | null;
    address: string | null;
    schedule: string | null;
    image: string | null;
    rating: number | null;
    phone: string | null;
    website: string | null;
    maps_url: string | null;
    status?: string | null;
    featured?: boolean | null;
    featured_until?: string | null;
    plan_type?: string | null;
    plan_expires_at?: string | null;
    external_source?: string | null;
    external_place_id?: string | null;
    /** Google resource id; uniqueness is per (city_slug, category_slug), not globally. */
    google_place_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
};

/** Canonical `places/ChIJ…` form for lookups and composite (city+category) de-dupe. */
export function normalizeCanonicalGooglePlaceId(
    raw: string | null | undefined,
): string | null {
    const t = raw?.trim();
    if (!t) {
        return null;
    }
    if (t.startsWith("places/")) {
        return t;
    }
    return `places/${t}`;
}

/** Best-effort id from a Google Maps URL (classic ChIJ… ids). */
export function extractGooglePlaceIdFromMapsUrl(
    raw: string | null | undefined,
): string | null {
    if (raw == null) {
        return null;
    }
    const u = String(raw).trim();
    if (!u) {
        return null;
    }
    try {
        const parsed = new URL(u);
        const fromParams =
            parsed.searchParams.get("query_place_id") ?? parsed.searchParams.get("place_id");
        if (fromParams?.trim()) {
            return fromParams.trim();
        }
    } catch {
        // relative or invalid URL — fall through to regex heuristics
    }
    const paramMatch = u.match(/[?&](?:query_place_id|place_id)=([^&]+)/i);
    if (paramMatch?.[1]) {
        try {
            const dec = decodeURIComponent(paramMatch[1].replace(/\+/g, " "));
            if (dec.trim()) {
                return dec.trim();
            }
        } catch {
            const t = paramMatch[1].trim();
            if (t) {
                return t;
            }
        }
    }
    const fq = u.match(/place[/_]id[=:]\s*([A-Za-z0-9_-]+)/i);
    if (fq?.[1]?.trim()) {
        return fq[1].trim();
    }
    const resource = u.match(/places\/(ChIJ[A-Za-z0-9_-]{10,})/);
    if (resource?.[1]) {
        return `places/${resource[1]}`;
    }
    const chij = u.match(/(ChIJ[A-Za-z0-9_-]{10,})/);
    if (chij?.[1]) {
        return chij[1];
    }
    return null;
}

export type PlaceKeyRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
};

export type GooglePlaceListingScope = {
    city_slug: string;
    category_slug: string;
};

/** Row in the same city+category that already holds this Google / external id (merge target). */
export async function getPlaceKeyByGoogleOrExternal(
    raw: string | null | undefined,
    scope: GooglePlaceListingScope,
): Promise<PlaceKeyRow | null> {
    const city = scope.city_slug?.trim();
    const cat = scope.category_slug?.trim();
    if (!city || !cat) {
        return null;
    }
    const c = normalizeCanonicalGooglePlaceId(raw ?? undefined);
    if (!c) {
        return null;
    }
    const variants = [c];
    if (c.startsWith("places/")) {
        const tail = c.slice("places/".length).trim();
        if (tail && !variants.includes(tail)) {
            variants.push(tail);
        }
    }
    for (const v of variants) {
        const { data, error } = await supabase
            .from("places")
            .select("place_id,city_slug,category_slug")
            .eq("google_place_id", v)
            .eq("city_slug", city)
            .eq("category_slug", cat)
            .limit(1);
        if (error) {
            console.error("Supabase google_place_id lookup error:", error);
            throw new Error("Failed to check google_place_id");
        }
        const row = data?.[0] as PlaceKeyRow | undefined;
        if (row) {
            return row;
        }
    }
    for (const v of variants) {
        const { data, error } = await supabase
            .from("places")
            .select("place_id,city_slug,category_slug")
            .eq("external_place_id", v)
            .eq("city_slug", city)
            .eq("category_slug", cat)
            .limit(1);
        if (error) {
            console.error("Supabase external_place_id lookup error:", error);
            throw new Error("Failed to check external_place_id");
        }
        const row = data?.[0] as PlaceKeyRow | undefined;
        if (row) {
            return row;
        }
    }
    return null;
}

const CATEGORY_CARDS: CategoryCard[] = [
    { name: "Restaurante", slug: "restaurante", icon: "" },
    { name: "Cafenele", slug: "cafenele", icon: "" },
    { name: "Instituții", slug: "institutii", icon: "" },
    { name: "Cultural", slug: "cultural", icon: "" },
    { name: "Natură", slug: "natura", icon: "" },
    { name: "Evenimente", slug: "evenimente", icon: "" },
    { name: "Cazare", slug: "cazare", icon: "" },
];

const MIN_PLACES_PER_CATEGORY = 20;

export function isValidCitySlug(slug: string): slug is CitySlug {
    return isCitySlug(slug);
}

export function isValidCategorySlug(city: CitySlug, category: string): category is CategorySlug {
    return isCategorySlug(city, category);
}

export function getCategoryCardsForCity(_: CitySlug): CategoryCard[] {
    return CATEGORY_CARDS;
}

export function getAllCitySlugs(): CitySlug[] {
    return Object.keys(placesByCity) as CitySlug[];
}

/** Active cities for public listing: sort_order, then name. */
export async function getPublicCitiesFromSupabase(): Promise<SupabaseCity[]> {
    const { data, error } = await supabase
        .from("cities")
        .select("slug, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function getAllCitiesForAdminFromSupabase(): Promise<AdminCityRow[]> {
    const { data, error } = await supabase
        .from("cities")
        .select("slug, name, image, is_active, sort_order, latitude, longitude");

    if (error) {
        throw error;
    }

    const rows = (data ?? []) as AdminCityRow[];
    return [...rows].sort((a, b) => {
        const d = adminListSortRank(a.sort_order) - adminListSortRank(b.sort_order);
        if (d !== 0) {
            return d;
        }
        return a.name.localeCompare(b.name, "ro", { sensitivity: "base" });
    });
}

export type GoogleImportCoverageRow = {
    city_slug: string;
    city_name: string | null;
    category_slug: string;
    place_count: number;
};

/**
 * Counts places per (city, category) for Google-supported categories only.
 * Sorted ascending by count (batch import: start with lowest coverage).
 */
export async function getGoogleImportCoverageHintsFromSupabase(): Promise<
    GoogleImportCoverageRow[]
> {
    const cities = await getAllCitiesForAdminFromSupabase();
    const citySlugs = new Set(cities.map((c) => c.slug));

    const { data: placeRows, error } = await supabase
        .from("places")
        .select("city_slug, category_slug")
        .in("category_slug", [...GOOGLE_IMPORT_SUPPORTED_CATEGORIES]);

    if (error) {
        console.error("getGoogleImportCoverageHintsFromSupabase:", error);
        throw new Error("Failed to load google import coverage");
    }

    const counts = new Map<string, number>();
    for (const raw of placeRows ?? []) {
        const row = raw as { city_slug: string | null; category_slug: string | null };
        const cs = row.city_slug?.trim() ?? "";
        const cat = row.category_slug?.trim() ?? "";
        if (!cs || !cat || !citySlugs.has(cs)) {
            continue;
        }
        const key = `${cs}\t${cat}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const out: GoogleImportCoverageRow[] = [];
    for (const city of cities) {
        for (const category_slug of GOOGLE_IMPORT_SUPPORTED_CATEGORIES) {
            const key = `${city.slug}\t${category_slug}`;
            out.push({
                city_slug: city.slug,
                city_name: city.name,
                category_slug,
                place_count: counts.get(key) ?? 0,
            });
        }
    }

    out.sort((a, b) => {
        if (a.place_count !== b.place_count) {
            return a.place_count - b.place_count;
        }
        const sa = `${a.city_slug}/${a.category_slug}`;
        const sb = `${b.city_slug}/${b.category_slug}`;
        return sa.localeCompare(sb, "ro", { sensitivity: "base" });
    });

    return out;
}

/** Import / autofill: `cities.latitude` / `cities.longitude` only (no hardcoded fallback). */
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
        console.warn(`[city coords] missing DB coordinates for ${s} (query failed)`);
        return null;
    }

    if (!data) {
        console.warn(`[city coords] missing DB coordinates for ${s} (no row)`);
        return null;
    }

    const row = data as { latitude: number | null; longitude: number | null };
    const la = row.latitude != null ? Number(row.latitude) : NaN;
    const lo = row.longitude != null ? Number(row.longitude) : NaN;
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
        console.warn(`[city coords] missing DB coordinates for ${s} (invalid or null lat/lon)`);
        return null;
    }

    console.log(`[city coords] using DB coordinates for ${s}`);
    return { lat: la, lon: lo };
}

export async function getCategoriesForAdminByCityFromSupabase(
    city_slug: string,
): Promise<AdminCategoryRow[]> {
    const { data, error } = await supabase
        .from("categories")
        .select(
            "city_slug, category_slug, category_name, image, icon, is_active, sort_order",
        )
        .eq("city_slug", city_slug);

    if (error) {
        throw error;
    }

    const rows = (data ?? []) as AdminCategoryRow[];
    return [...rows].sort((a, b) => {
        const d = adminListSortRank(a.sort_order) - adminListSortRank(b.sort_order);
        if (d !== 0) {
            return d;
        }
        return a.category_name.localeCompare(b.category_name, "ro", { sensitivity: "base" });
    });
}

export async function updateCityInSupabase(
    city_slug: string,
    updates: UpdateCityInput,
): Promise<{ slug: string }> {
    const trimmedOld = city_slug?.trim();
    if (!trimmedOld) {
        throw new Error("Lipsește slug-ul orașului.");
    }

    let newSlug =
        updates.slug !== undefined && updates.slug !== null
            ? updates.slug.trim()
            : trimmedOld;
    if (!newSlug || !isSafeCitySlug(newSlug)) {
        throw new Error("Slug invalid. Folosiți litere mici, cifre și cratime.");
    }

    if (newSlug !== trimmedOld) {
        const { data: conflict, error: conflictErr } = await supabase
            .from("cities")
            .select("slug")
            .eq("slug", newSlug)
            .limit(1);

        if (conflictErr) {
            console.error("Supabase city slug conflict check error:", conflictErr);
            throw new Error("Nu s-a putut verifica slug-ul.");
        }
        if ((conflict?.length ?? 0) > 0) {
            throw new Error("Există deja un oraș cu acest slug.");
        }

        const { error: placesErr } = await supabase
            .from("places")
            .update({ city_slug: newSlug })
            .eq("city_slug", trimmedOld);

        if (placesErr) {
            console.error("Supabase update places city_slug error:", placesErr);
            throw new Error("Nu s-au putut actualiza locurile pentru noul slug.");
        }

        const { error: catsErr } = await supabase
            .from("categories")
            .update({ city_slug: newSlug })
            .eq("city_slug", trimmedOld);

        if (catsErr) {
            console.error("Supabase update categories city_slug error:", catsErr);
            throw new Error("Nu s-au putut actualiza categoriile pentru noul slug.");
        }
    }

    const row: Record<string, unknown> = {};
    if (updates.name !== undefined) {
        const n = updates.name?.trim();
        if (!n) {
            throw new Error("Numele orașului nu poate fi gol.");
        }
        row.name = n;
    }
    if (updates.image !== undefined) {
        row.image =
            updates.image === null || updates.image === "" ? null : String(updates.image).trim();
    }
    if (updates.is_active !== undefined) {
        row.is_active = Boolean(updates.is_active);
    }
    if (updates.sort_order !== undefined) {
        const so = Number(updates.sort_order);
        if (!Number.isFinite(so) || !Number.isInteger(so)) {
            throw new Error("sort_order trebuie să fie număr întreg.");
        }
        row.sort_order = so;
    }
    if (updates.latitude !== undefined) {
        if (updates.latitude === null) {
            row.latitude = null;
        } else {
            const la = Number(updates.latitude);
            if (!Number.isFinite(la) || la < -90 || la > 90) {
                throw new Error("latitude trebuie să fie între -90 și 90.");
            }
            row.latitude = la;
        }
    }
    if (updates.longitude !== undefined) {
        if (updates.longitude === null) {
            row.longitude = null;
        } else {
            const lo = Number(updates.longitude);
            if (!Number.isFinite(lo) || lo < -180 || lo > 180) {
                throw new Error("longitude trebuie să fie între -180 și 180.");
            }
            row.longitude = lo;
        }
    }
    if (newSlug !== trimmedOld) {
        row.slug = newSlug;
    }

    if (Object.keys(row).length === 0) {
        return { slug: newSlug };
    }

    const { error } = await supabase.from("cities").update(row).eq("slug", trimmedOld);

    if (error) {
        console.error("Supabase update city error:", error);
        throw new Error("Nu s-a putut actualiza orașul.");
    }

    return { slug: newSlug };
}

export async function updateCategoryInSupabase(
    city_slug: string,
    category_slug: string,
    updates: UpdateCategoryInput,
): Promise<{ category_slug: string }> {
    const c = city_slug?.trim();
    const oldCat = category_slug?.trim();
    if (!c || !oldCat) {
        throw new Error("Lipsește orașul sau categoria.");
    }

    let newCatSlug =
        updates.category_slug_new !== undefined && updates.category_slug_new !== null
            ? updates.category_slug_new.trim()
            : oldCat;
    if (!newCatSlug || !isSafeCitySlug(newCatSlug)) {
        throw new Error("Slug categorie invalid. Folosiți litere mici, cifre și cratime.");
    }

    if (newCatSlug !== oldCat) {
        const { data: conflict, error: conflictErr } = await supabase
            .from("categories")
            .select("category_slug")
            .eq("city_slug", c)
            .eq("category_slug", newCatSlug)
            .limit(1);

        if (conflictErr) {
            console.error("Supabase category slug conflict check error:", conflictErr);
            throw new Error("Nu s-a putut verifica slug-ul categoriei.");
        }
        if ((conflict?.length ?? 0) > 0) {
            throw new Error("Există deja o categorie cu acest slug în acest oraș.");
        }

        const { error: placesErr } = await supabase
            .from("places")
            .update({ category_slug: newCatSlug })
            .eq("city_slug", c)
            .eq("category_slug", oldCat);

        if (placesErr) {
            console.error("Supabase update places category_slug error:", placesErr);
            throw new Error("Nu s-au putut actualiza locurile pentru noul slug de categorie.");
        }
    }

    const row: Record<string, unknown> = {};
    if (updates.category_name !== undefined) {
        const n = updates.category_name?.trim();
        if (!n) {
            throw new Error("Numele categoriei nu poate fi gol.");
        }
        row.category_name = n;
    }
    if (updates.image !== undefined) {
        row.image =
            updates.image === null || updates.image === "" ? null : String(updates.image).trim();
    }
    if (updates.icon !== undefined) {
        row.icon =
            updates.icon === null || updates.icon === ""
                ? null
                : String(updates.icon).trim();
    }
    if (updates.is_active !== undefined) {
        row.is_active = Boolean(updates.is_active);
    }
    if (updates.sort_order !== undefined) {
        const so = Number(updates.sort_order);
        if (!Number.isFinite(so) || !Number.isInteger(so)) {
            throw new Error("sort_order trebuie să fie număr întreg.");
        }
        row.sort_order = so;
    }
    if (newCatSlug !== oldCat) {
        row.category_slug = newCatSlug;
    }

    if (Object.keys(row).length === 0) {
        return { category_slug: newCatSlug };
    }

    const { error } = await supabase
        .from("categories")
        .update(row)
        .eq("city_slug", c)
        .eq("category_slug", oldCat);

    if (error) {
        console.error("Supabase update category error:", error);
        throw new Error("Nu s-a putut actualiza categoria.");
    }

    return { category_slug: newCatSlug };
}

export function getPlacesByCategory(city: CitySlug, category: CategorySlug): Place[] {
    const basePlaces = placesByCity[city][category];
    if (basePlaces.length >= MIN_PLACES_PER_CATEGORY) {
        return basePlaces;
    }

    const generated: Place[] = [];
    const missingCount = MIN_PLACES_PER_CATEGORY - basePlaces.length;

    for (let i = 1; i <= missingCount; i += 1) {
        const placeNumber = basePlaces.length + i;
        const cityName = slugToTitle(city);
        const categoryName = slugToTitle(category);
        const generatedName = `${categoryName} ${placeNumber} - ${cityName}`;
        const generatedId = `${city}-${category}-auto-${placeNumber}`;

        generated.push({
            id: generatedId,
            name: generatedName,
            image: "/images/place-placeholder.jpg",
            address: `${cityName}, zona ${placeNumber}`,
            rating: Number((4.1 + (placeNumber % 8) * 0.1).toFixed(1)),
            description: `Locație adăugată automat pentru categoria ${categoryName} din ${cityName}, până la completarea listei reale.`,
            schedule: "09:00 - 21:00",
            phone: `07${String(10000000 + placeNumber).slice(-8)}`,
            website: `https://ghidurban.ro/${city}/${category}/${generatedId}`,
            mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(generatedName + " " + cityName)}`,
        });
    }

    return [...basePlaces, ...generated];
}

export function getPlaceById(city: CitySlug, category: CategorySlug, placeId: string): Place | undefined {
    return getPlacesByCategory(city, category).find((place) => place.id === placeId);
}

/** True if a row exists in `cities` (any visibility). Used by public APIs that must not depend on static placesByCity. */
export async function cityExistsInSupabase(citySlug: string): Promise<boolean> {
    const s = citySlug?.trim();
    if (!s) {
        return false;
    }
    const { data, error } = await supabase.from("cities").select("slug").eq("slug", s).limit(1);
    if (error) {
        console.error("Supabase city lookup error:", error);
        throw new Error("Failed to verify city");
    }
    return (data?.length ?? 0) > 0;
}

export async function getCategoriesByCityFromSupabase(citySlug: string) {
    const { data, error } = await supabase
        .from("categories")
        .select("category_slug, category_name")
        .eq("city_slug", citySlug.trim());

    if (error) {
        console.error("Supabase categories error:", error);
        throw new Error("Failed to fetch categories");
    }

    return data ?? [];
}

export async function getPlacesByCategoryFromSupabase(
    citySlug: string,
    categorySlug: string,
): Promise<SupabasePlace[]> {
    const { data, error } = await supabase
        .from("places")
        .select(
            "place_id, name, description, address, schedule, image, rating, phone, website, maps_url, featured, featured_until, plan_type, plan_expires_at, latitude, longitude, google_match_status, google_photo_uri",
        )
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug)
        .eq("status", "available")
        .order("name", { ascending: true });

    if (error) {
        console.error("Supabase places error:", error);
        throw new Error("Failed to fetch places");
    }

    return data ?? [];
}

/** Columns for `/cauta` global search index + public place cards. */
export type PlaceSearchIndexRow = {
    place_id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    image: string | null;
    rating: number | null;
    featured: boolean | null;
    featured_until: string | null;
    plan_type: string | null;
    plan_expires_at: string | null;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
};

export async function getPlacesSearchIndexRowsFromSupabase(
    citySlug: string,
    categorySlug: string,
): Promise<PlaceSearchIndexRow[]> {
    const { data, error } = await supabase
        .from("places")
        .select(
            "place_id, name, latitude, longitude, address, image, rating, featured, featured_until, plan_type, plan_expires_at, google_match_status, google_photo_uri",
        )
        .eq("city_slug", citySlug.trim())
        .eq("category_slug", categorySlug.trim())
        .eq("status", "available")
        .order("name", { ascending: true });

    if (error) {
        console.error("Supabase places (search index) error:", error);
        throw new Error("Failed to fetch places for search index");
    }

    return data ?? [];
}


export async function getPlaceByIdFromSupabase(
    citySlug: string,
    categorySlug: string,
    placeId: string,
): Promise<SupabasePlace | null> {
    const { data, error } = await supabase
        .from("places")
        .select(
            "place_id, name, description, address, schedule, image, rating, phone, website, maps_url, featured, featured_until, plan_type, plan_expires_at, latitude, longitude, google_match_status, google_photo_uri, google_hours_raw",
        )
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug)
        .eq("place_id", placeId)
        .eq("status", "available")
        .single();

    if (error) {
        console.error("Supabase place error:", error);
        return null;
    }

    return data;
}

export type RecommendedPlaceRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    image: string | null;
    rating: number | null;
    maps_url: string | null;
    distance_km: number;
    active_featured: boolean;
    active_promoted: boolean;
    listing_tier_rank: number;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
};

type RecommendationOptions = {
    radius_km: number;
    city_slug?: string;
    category_slug?: string;
    exclude_place_id?: string;
};

const RECOMMENDATIONS_FETCH_LIMIT = 400;

/**
 * Available places with coordinates within radius (unsorted; API applies order and limit).
 */
export async function getNearbyRecommendedPlacesFromSupabase(
    userLat: number,
    userLng: number,
    options: RecommendationOptions,
): Promise<RecommendedPlaceRow[]> {
    const radius = Math.max(options.radius_km, 0.1);
    const pad = 1.12;
    const dLat = (radius * pad) / 111;
    const cosLat = Math.cos((userLat * Math.PI) / 180);
    const dLng = Math.abs(cosLat) < 0.05 ? 180 : (radius * pad) / (111 * cosLat);

    let query = supabase
        .from("places")
        .select(
            "place_id, city_slug, category_slug, name, address, image, rating, maps_url, featured, featured_until, plan_type, plan_expires_at, latitude, longitude, google_match_status, google_photo_uri",
        )
        .eq("status", "available")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .gte("latitude", userLat - dLat)
        .lte("latitude", userLat + dLat)
        .gte("longitude", userLng - dLng)
        .lte("longitude", userLng + dLng)
        .limit(RECOMMENDATIONS_FETCH_LIMIT);

    const city = options.city_slug?.trim();
    if (city) {
        query = query.eq("city_slug", city);
    }
    const category = options.category_slug?.trim();
    if (category) {
        query = query.eq("category_slug", category);
    }

    const excludeId = options.exclude_place_id?.trim();
    if (excludeId) {
        query = query.neq("place_id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Supabase recommendations query error:", error);
        throw new Error("Failed to fetch recommendations");
    }

    const rows = data ?? [];
    const out: RecommendedPlaceRow[] = [];

    for (const raw of rows) {
        const lat = Number(raw.latitude);
        const lng = Number(raw.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            continue;
        }
        const distance_km = haversineKm(userLat, userLng, lat, lng);
        if (distance_km > radius) {
            continue;
        }
        const featured = Boolean(raw.featured);
        const featured_until = raw.featured_until ?? null;
        const plan_type = raw.plan_type ?? "free";
        const plan_expires_at = raw.plan_expires_at ?? null;
        const {
            activeFeatured: active_featured,
            activePromoted: active_promoted,
            listingTierRank: listing_tier_rank,
        } = resolveListing({
            featured,
            featured_until,
            plan_type,
            plan_expires_at,
        });
        out.push({
            place_id: raw.place_id,
            city_slug: raw.city_slug,
            category_slug: raw.category_slug,
            name: raw.name,
            address: raw.address,
            image: raw.image,
            rating: raw.rating,
            maps_url: raw.maps_url,
            distance_km,
            active_featured,
            active_promoted,
            listing_tier_rank,
            google_match_status: raw.google_match_status ?? null,
            google_photo_uri: raw.google_photo_uri ?? null,
        });
    }

    return out;
}

export async function getAllPlacesForAdminFromSupabase(): Promise<AdminSupabasePlaceRow[]> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, address, rating, status, featured, featured_until")
        .order("city_slug", { ascending: true })
        .order("category_slug", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        console.error("Supabase admin places error:", error);
        throw new Error("Failed to fetch admin places");
    }

    return data ?? [];
}

/** Another row in the same city+category that already holds this google_place_id. */
export type GooglePlaceIdListingConflict = {
    conflicting_place_id: string;
    conflicting_name: string;
    conflicting_city_slug: string;
    conflicting_category_slug: string;
    conflicting_address: string | null;
};

export type AdminGoogleMatchReviewRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    google_match_score: number | null;
    google_place_id: string | null;
    google_maps_uri: string | null;
    google_photo_uri: string | null;
    /** false = checked, no conflict; true = checked, conflict; null = check failed (unknown) */
    has_google_conflict: boolean | null;
    conflict: GooglePlaceIdListingConflict | null;
    /** true when conflict lookup errored (timeout/network); safe to show list, do not approve matched blindly */
    conflict_check_failed: boolean;
};

/**
 * Same listing scope as sync collision: another place with same stored google_place_id
 * (any variant) in this city+category, excluding the current place_id.
 */
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
    if (!canonical || !city || !cat || !exclude) {
        return null;
    }
    const variants = [canonical];
    if (canonical.startsWith("places/")) {
        const tail = canonical.slice("places/".length).trim();
        if (tail && !variants.includes(tail)) {
            variants.push(tail);
        }
    }
    for (const v of variants) {
        const { data, error } = await supabase
            .from("places")
            .select("place_id,name,city_slug,category_slug,address")
            .eq("google_place_id", v)
            .eq("city_slug", city)
            .eq("category_slug", cat)
            .neq("place_id", exclude)
            .limit(1);
        if (error) {
            console.error("findGooglePlaceIdListingConflict:", error);
            throw new Error("Failed to check google_place_id conflict");
        }
        const row = data?.[0] as
            | {
                  place_id: string;
                  name: string | null;
                  city_slug: string;
                  category_slug: string;
                  address: string | null;
              }
            | undefined;
        if (row?.place_id) {
            return {
                conflicting_place_id: row.place_id,
                conflicting_name: row.name?.trim() || row.place_id,
                conflicting_city_slug: row.city_slug,
                conflicting_category_slug: row.category_slug,
                conflicting_address: row.address ?? null,
            };
        }
    }
    return null;
}

export type GoogleMatchReviewListFilters = {
    search?: string;
    city_slug?: string;
    category_slug?: string;
};

/** Distinct city / category slugs among places in Google match review (for admin filter dropdowns). */
export async function getGoogleMatchReviewFilterSlugsFromSupabase(): Promise<{
    city_slugs: string[];
    category_slugs: string[];
}> {
    const { data, error } = await supabase
        .from("places")
        .select("city_slug, category_slug")
        .eq("google_match_status", "review");

    if (error) {
        console.error("Supabase google match review filter slugs error:", error);
        throw new Error("Failed to fetch google match review filter options");
    }

    const rows = (data ?? []) as { city_slug: string; category_slug: string }[];
    const citySet = new Set<string>();
    const catSet = new Set<string>();
    for (const r of rows) {
        if (r.city_slug) {
            citySet.add(r.city_slug);
        }
        if (r.category_slug) {
            catSet.add(r.category_slug);
        }
    }
    return {
        city_slugs: Array.from(citySet).sort(),
        category_slugs: Array.from(catSet).sort(),
    };
}

export async function getPlacesForGoogleMatchReviewFromSupabase(
    filters?: GoogleMatchReviewListFilters,
): Promise<AdminGoogleMatchReviewRow[]> {
    const city = filters?.city_slug?.trim();
    const category = filters?.category_slug?.trim();
    const search = filters?.search?.trim();

    let q = supabase
        .from("places")
        .select(
            "place_id, city_slug, category_slug, name, address, google_match_score, google_place_id, google_maps_uri, google_photo_uri",
        )
        .eq("google_match_status", "review");

    if (city) {
        q = q.eq("city_slug", city);
    }
    if (category) {
        q = q.eq("category_slug", category);
    }
    if (search) {
        q = q.ilike("name", `%${search}%`);
    }

    const { data, error } = await q
        .order("city_slug", { ascending: true })
        .order("category_slug", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        console.error("Supabase google match review list error:", error);
        throw new Error("Failed to fetch google match review places");
    }

    const base = (data ?? []) as Omit<
        AdminGoogleMatchReviewRow,
        "has_google_conflict" | "conflict" | "conflict_check_failed"
    >[];

    const enriched = await Promise.all(
        base.map(async (r) => {
            const gid = r.google_place_id?.trim();
            if (gid == null || gid === "") {
                return {
                    ...r,
                    has_google_conflict: false,
                    conflict: null,
                    conflict_check_failed: false,
                };
            }
            try {
                const conflict = await findGooglePlaceIdListingConflict(
                    r.google_place_id,
                    r.place_id,
                    r.city_slug,
                    r.category_slug,
                );
                return {
                    ...r,
                    has_google_conflict: conflict != null,
                    conflict,
                    conflict_check_failed: false,
                };
            } catch (e) {
                console.error("google match review conflict check failed for row:", r.place_id, e);
                return {
                    ...r,
                    has_google_conflict: null,
                    conflict: null,
                    conflict_check_failed: true,
                };
            }
        }),
    );

    return enriched;
}

export type GoogleMatchReviewAction = "matched" | "clear_match";

export async function applyGoogleMatchReviewDecision(
    placeId: string,
    citySlug: string,
    categorySlug: string,
    action: GoogleMatchReviewAction,
): Promise<void> {
    const pid = placeId?.trim();
    const c = citySlug?.trim();
    const cat = categorySlug?.trim();
    if (!pid || !c || !cat) {
        throw new Error("Missing place_id, city_slug, or category_slug");
    }

    if (action === "matched") {
        const { data: selfRow, error: selfErr } = await supabase
            .from("places")
            .select("google_place_id")
            .eq("place_id", pid)
            .eq("city_slug", c)
            .eq("category_slug", cat)
            .eq("google_match_status", "review")
            .maybeSingle();
        if (selfErr) {
            console.error("applyGoogleMatchReviewDecision read:", selfErr);
            throw new Error("Failed to read place for conflict check");
        }
        const gid = (selfRow as { google_place_id: string | null } | null)?.google_place_id;
        const conflict = await findGooglePlaceIdListingConflict(gid, pid, c, cat);
        if (conflict) {
            throw new Error(
                "CONFLICT: același google_place_id este deja pe alt loc în această categorie. Rezolvă înainte de matched.",
            );
        }

        const { error } = await supabase
            .from("places")
            .update({ google_match_status: "matched" })
            .eq("place_id", pid)
            .eq("city_slug", c)
            .eq("category_slug", cat)
            .eq("google_match_status", "review");

        if (error) {
            console.error("applyGoogleMatchReviewDecision matched:", error);
            throw new Error("Failed to update google match status");
        }
        return;
    }

    if (action === "clear_match") {
        const { error } = await supabase
            .from("places")
            .update({
                google_place_id: null,
                google_maps_uri: null,
                google_photo_uri: null,
                google_photo_name: null,
                google_match_score: null,
                google_hours_raw: null,
                google_hours_text: null,
                google_match_status: "review",
            })
            .eq("place_id", pid)
            .eq("city_slug", c)
            .eq("category_slug", cat)
            .eq("google_match_status", "review");

        if (error) {
            console.error("applyGoogleMatchReviewDecision clear_match:", error);
            throw new Error("Failed to clear google match fields");
        }
    }
}

export async function getAdminPlaceByIdFromSupabase(
    placeId: string,
): Promise<AdminSupabasePlaceDetails | null> {
    const { data, error } = await supabase
        .from("places")
        .select(
            "place_id, city_slug, category_slug, name, description, address, schedule, image, rating, phone, website, maps_url, status, featured, featured_until, plan_type, plan_expires_at",
        )
        .eq("place_id", placeId)
        .single();

    if (error) {
        console.error("Supabase admin place error:", error);
        return null;
    }

    return data;
}

export function normalizePlaceNameForDedupe(name: string): string {
    return String(name ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

export function normalizePlaceAddressForDedupe(raw: string | null | undefined): string {
    let s = String(raw ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    s = s.replace(/,\s*romania\s*$/i, "").trim();
    return s;
}

function namesSimilarOneContainsOther(a: string, b: string): boolean {
    const na = normalizePlaceNameForDedupe(a);
    const nb = normalizePlaceNameForDedupe(b);
    if (!na || !nb) {
        return false;
    }
    if (na === nb) {
        return true;
    }
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length <= nb.length ? nb : na;
    if (shorter.length < 4) {
        return false;
    }
    return longer.includes(shorter);
}

export async function placeDuplicateByNormalizedAddressInCategory(
    address: string,
    city_slug: string,
    category_slug: string,
): Promise<boolean> {
    const target = normalizePlaceAddressForDedupe(address);
    if (!target) {
        return false;
    }
    const c = city_slug?.trim();
    const cat = category_slug?.trim();
    if (!c || !cat) {
        return false;
    }

    const { data, error } = await supabase
        .from("places")
        .select("address")
        .eq("city_slug", c)
        .eq("category_slug", cat);

    if (error) {
        console.error("Supabase address dedupe lookup error:", error);
        throw new Error("Failed to check duplicate address");
    }

    for (const row of data ?? []) {
        const addr = (row as { address: string | null }).address;
        if (normalizePlaceAddressForDedupe(addr) === target) {
            return true;
        }
    }
    return false;
}

export async function placeDuplicateBySimilarNameAndAddressInCategory(
    name: string,
    address: string,
    city_slug: string,
    category_slug: string,
): Promise<boolean> {
    const targetAddr = normalizePlaceAddressForDedupe(address);
    if (!targetAddr) {
        return false;
    }
    const c = city_slug?.trim();
    const cat = category_slug?.trim();
    if (!c || !cat) {
        return false;
    }

    const { data, error } = await supabase
        .from("places")
        .select("name, address")
        .eq("city_slug", c)
        .eq("category_slug", cat);

    if (error) {
        console.error("Supabase similar name+address lookup error:", error);
        throw new Error("Failed to check duplicate name and address");
    }

    for (const row of data ?? []) {
        const r = row as { name: string | null; address: string | null };
        if (normalizePlaceAddressForDedupe(r.address) !== targetAddr) {
            continue;
        }
        if (namesSimilarOneContainsOther(name, r.name ?? "")) {
            return true;
        }
    }
    return false;
}

function escapeIlikePattern(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function placeExistsByNameCityCategory(
    name: string,
    city_slug: string,
    category_slug: string,
): Promise<boolean> {
    const n = name?.trim();
    if (!n) {
        return false;
    }
    const { data, error } = await supabase
        .from("places")
        .select("place_id")
        .eq("city_slug", city_slug)
        .eq("category_slug", category_slug)
        .ilike("name", escapeIlikePattern(n))
        .limit(1);

    if (error) {
        console.error("Supabase name/city/category lookup error:", error);
        throw new Error("Failed to check duplicate name");
    }

    return (data?.length ?? 0) > 0;
}

export async function placeIdExistsInCategory(
    place_id: string,
    city_slug: string,
    category_slug: string,
): Promise<boolean> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id")
        .eq("place_id", place_id)
        .eq("city_slug", city_slug)
        .eq("category_slug", category_slug)
        .limit(1);

    if (error) {
        console.error("Supabase place_id lookup error:", error);
        throw new Error("Failed to check place id");
    }

    return (data?.length ?? 0) > 0;
}

export type CreatePlaceOutcome = {
    result: "inserted" | "merged";
    /** Slug used in public URLs (existing row on merge). */
    place_id: string;
};

export async function createPlaceInSupabase(
    place: SupabasePlaceMutationInput,
): Promise<CreatePlaceOutcome> {
    const googleKey = normalizeCanonicalGooglePlaceId(
        place.google_place_id ?? place.external_place_id ?? undefined,
    );
    if (googleKey) {
        const existing = await getPlaceKeyByGoogleOrExternal(
            place.google_place_id ?? place.external_place_id ?? googleKey,
            {
                city_slug: place.city_slug,
                category_slug: place.category_slug,
            },
        );
        if (existing) {
            await updatePlaceInSupabase({
                ...place,
                place_id: existing.place_id,
                google_place_id: googleKey,
            });
            return { result: "merged", place_id: existing.place_id };
        }
    }

    const {
        status: _omitStatus,
        featured: _omitFeatured,
        featured_until: _omitFu,
        plan_type: _omitPlan,
        plan_expires_at: _omitPlanEx,
        ...rest
    } = place;
    const featured = typeof place.featured === "boolean" ? place.featured : false;
    const featured_until =
        place.featured_until === undefined ||
        place.featured_until === null ||
        place.featured_until === ""
            ? null
            : place.featured_until;
    const plan_type = normalizeListingPlanType(place.plan_type);
    const plan_expires_at =
        place.plan_expires_at === undefined ||
        place.plan_expires_at === null ||
        place.plan_expires_at === ""
            ? null
            : place.plan_expires_at;
    const row = {
        ...rest,
        google_place_id: googleKey ?? place.google_place_id ?? null,
        status: place.status ?? "available",
        featured,
        featured_until,
        plan_type,
        plan_expires_at,
    };
    const { error } = await supabase.from("places").insert([row]);

    if (error) {
        console.error("Supabase create place error:", error);
        throw new Error("Failed to create place");
    }
    return { result: "inserted", place_id: place.place_id };
}

export async function updatePlaceInSupabase(place: SupabasePlaceMutationInput): Promise<void> {
    const updatePayload: Record<string, unknown> = {
        name: place.name,
        city_slug: place.city_slug,
        category_slug: place.category_slug,
        description: place.description,
        address: place.address,
        schedule: place.schedule,
        image: place.image,
        rating: place.rating,
        phone: place.phone,
        website: place.website,
        maps_url: place.maps_url,
    };
    if (place.status !== undefined && place.status !== null) {
        updatePayload.status = place.status;
    }
    if (typeof place.featured === "boolean") {
        updatePayload.featured = place.featured;
    }
    if (place.featured_until !== undefined) {
        updatePayload.featured_until =
            place.featured_until === null || place.featured_until === ""
                ? null
                : place.featured_until;
    }
    if (place.plan_type !== undefined && place.plan_type !== null) {
        updatePayload.plan_type = normalizeListingPlanType(place.plan_type);
    }
    if (place.plan_expires_at !== undefined) {
        updatePayload.plan_expires_at =
            place.plan_expires_at === null || place.plan_expires_at === ""
                ? null
                : place.plan_expires_at;
    }
    if (place.external_place_id !== undefined) {
        updatePayload.external_place_id =
            place.external_place_id === null || place.external_place_id === ""
                ? null
                : place.external_place_id;
    }
    if (place.external_source !== undefined) {
        updatePayload.external_source = place.external_source;
    }
    if (place.latitude !== undefined) {
        updatePayload.latitude = place.latitude;
    }
    if (place.longitude !== undefined) {
        updatePayload.longitude = place.longitude;
    }
    if (place.google_place_id !== undefined) {
        updatePayload.google_place_id =
            normalizeCanonicalGooglePlaceId(place.google_place_id) ?? place.google_place_id;
    }

    const { error } = await supabase
        .from("places")
        .update(updatePayload)
        .eq("place_id", place.place_id)
        .eq("city_slug", place.city_slug)
        .eq("category_slug", place.category_slug);

    if (error) {
        console.error("Supabase update place error:", error);
        throw new Error("Failed to update place");
    }
}

export async function updatePlaceStatusInSupabase(
    placeId: string,
    citySlug: string,
    categorySlug: string,
    status: PlaceVisibilityStatus,
): Promise<void> {
    const { error } = await supabase
        .from("places")
        .update({ status })
        .eq("place_id", placeId)
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug);

    if (error) {
        console.error("Supabase update place status error:", error);
        throw new Error("Failed to update place status");
    }
}

export async function updatePlaceFeaturedInSupabase(
    placeId: string,
    citySlug: string,
    categorySlug: string,
    featured: boolean,
): Promise<void> {
    const { error } = await supabase
        .from("places")
        .update({ featured })
        .eq("place_id", placeId)
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug);

    if (error) {
        console.error("Supabase update place featured error:", error);
        throw new Error("Failed to update place featured");
    }
}

export async function deletePlaceFromSupabase(
    placeId: string,
    citySlug: string,
    categorySlug: string,
): Promise<void> {
    const { error } = await supabase
        .from("places")
        .delete()
        .eq("place_id", placeId)
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug);

    if (error) {
        console.error("Supabase delete place error:", error);
        throw new Error("Failed to delete place");
    }
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

export function isSafeCitySlug(s: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length > 0 && s.length <= 128;
}

export type CreateCityResult = {
    city_slug: string;
    categories_created: number;
    reused_existing: boolean;
    coordinates_updated: boolean;
};

export function parseCityCreateCoords(
    coords?: { latitude: number; longitude: number } | null,
): { latitude: number; longitude: number } | null {
    if (coords == null) {
        return null;
    }
    const latitude = Number(coords.latitude);
    const longitude = Number(coords.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        return null;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return null;
    }
    return { latitude, longitude };
}

async function insertMissingStandardCategories(
    db: SupabaseClient,
    city_slug: string,
): Promise<number> {
    const { data: existingCats, error: catLookupErr } = await db
        .from("categories")
        .select("category_slug")
        .eq("city_slug", city_slug);

    if (catLookupErr) {
        console.error("Supabase categories lookup error:", catLookupErr);
        throw new Error("Nu s-au putut citi categoriile.");
    }

    const have = new Set(
        (existingCats ?? []).map((r: { category_slug: string }) => r.category_slug),
    );

    const missing = STANDARD_CATEGORY_DEFS.filter((d) => !have.has(d.category_slug));
    const toInsert = missing.map((d) => {
        const ord = STANDARD_CATEGORY_DEFS.findIndex((x) => x.category_slug === d.category_slug);
        return {
            city_slug,
            category_slug: d.category_slug,
            category_name: d.category_name,
            is_active: true,
            sort_order: ord + 1,
        };
    });

    if (toInsert.length === 0) {
        return 0;
    }

    const { error: insertCatErr } = await db.from("categories").insert(toInsert);
    if (insertCatErr) {
        console.error("Supabase create categories error:", insertCatErr);
        throw new Error("Categoriile standard nu s-au putut adăuga.");
    }
    return toInsert.length;
}

/** Server-side city + category seed: prefer service role so inserts succeed under RLS. */
function supabaseClientForCityCreate(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (url && serviceKey) {
        return createClient(url, serviceKey);
    }
    return supabase;
}

export async function createCityWithStandardCategories(
    name: string,
    slugInput?: string | null,
    coords?: { latitude: number; longitude: number } | null,
): Promise<CreateCityResult> {
    const trimmedName = name?.trim();
    if (!trimmedName) {
        throw new Error("Lipsește numele orașului.");
    }

    const city_slug = (slugInput?.trim() || placeIdSlugFromName(trimmedName)).trim();
    if (!city_slug || !isSafeCitySlug(city_slug)) {
        throw new Error("Slug invalid. Folosiți litere mici, cifre și cratime.");
    }

    const parsedCoords = parseCityCreateCoords(coords);

    const db = supabaseClientForCityCreate();
    const cityImage = `/images/places/${city_slug}/city.jpg`;

    const { data: existingRows, error: cityLookupErr } = await db
        .from("cities")
        .select("slug, latitude, longitude")
        .eq("slug", city_slug)
        .limit(1);

    if (cityLookupErr) {
        console.error("Supabase city lookup error:", cityLookupErr);
        throw new Error("Nu s-a putut verifica orașul.");
    }

    const existing = (existingRows ?? [])[0] as
        | { slug: string; latitude: number | null; longitude: number | null }
        | undefined;

    if (existing) {
        console.log(`[city create] reused existing city ${city_slug}`);

        let coordinates_updated = false;
        if (parsedCoords) {
            const { error: coordErr } = await db
                .from("cities")
                .update({
                    latitude: parsedCoords.latitude,
                    longitude: parsedCoords.longitude,
                })
                .eq("slug", city_slug);

            if (coordErr) {
                console.error("Supabase update city coordinates error:", coordErr);
                throw new Error("Nu s-au putut actualiza coordonatele orașului.");
            }
            coordinates_updated = true;
            console.log(`[city create] updated coordinates for ${city_slug}`);
        }

        const categories_created = await insertMissingStandardCategories(db, city_slug);
        console.log(`[city create] categories created for ${city_slug}: ${categories_created}`);

        return {
            city_slug,
            categories_created,
            reused_existing: true,
            coordinates_updated,
        };
    }

    if (!parsedCoords) {
        throw new Error("Lipsește latitude / longitude.");
    }

    const { error: insertCityErr } = await db.from("cities").insert([
        {
            slug: city_slug,
            name: trimmedName,
            image: cityImage,
            latitude: parsedCoords.latitude,
            longitude: parsedCoords.longitude,
        },
    ]);

    if (insertCityErr) {
        console.error("Supabase create city error:", insertCityErr);
        throw new Error("Nu s-a putut crea orașul.");
    }

    console.log(`[city create] created city ${city_slug}`);

    const categories_created = await insertMissingStandardCategories(db, city_slug);
    console.log(`[city create] categories created for ${city_slug}: ${categories_created}`);

    return {
        city_slug,
        categories_created,
        reused_existing: false,
        coordinates_updated: false,
    };
}
