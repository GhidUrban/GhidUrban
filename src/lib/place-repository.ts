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
import { haversineKm } from "@/lib/haversine-km";
import { placeIdSlugFromName, slugToTitle } from "@/lib/slug";
import { supabase } from "@/lib/supabase/client";

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

export type UpdateCityInput = {
    name?: string;
    slug?: string;
    image?: string | null;
    is_active?: boolean;
    sort_order?: number;
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
    latitude?: number | null;
    longitude?: number | null;
};

const CATEGORY_CARDS: CategoryCard[] = [
    { name: "Restaurante", slug: "restaurante", icon: "🍽" },
    { name: "Cafenele", slug: "cafenele", icon: "☕" },
    { name: "Instituții", slug: "institutii", icon: "🏛" },
    { name: "Cultural", slug: "cultural", icon: "🎭" },
    { name: "Natură", slug: "natura", icon: "🌿" },
    { name: "Evenimente", slug: "evenimente", icon: "🎉" },
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
        .select("slug, name, image, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        throw error;
    }

    return (data ?? []) as AdminCityRow[];
}

export async function getCategoriesForAdminByCityFromSupabase(
    city_slug: string,
): Promise<AdminCategoryRow[]> {
    const { data, error } = await supabase
        .from("categories")
        .select(
            "city_slug, category_slug, category_name, image, icon, is_active, sort_order",
        )
        .eq("city_slug", city_slug)
        .order("sort_order", { ascending: true })
        .order("category_name", { ascending: true });

    if (error) {
        throw error;
    }

    return (data ?? []) as AdminCategoryRow[];
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


export async function getCategoriesByCityFromSupabase(citySlug: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("category_slug, category_name")
    .eq("city_slug", citySlug);

  if (error) {
    console.error("Supabase categories error:", error);
    throw new Error("Failed to fetch categories");
  }

  return data;
}

export async function getPlacesByCategoryFromSupabase(
    citySlug: string,
    categorySlug: string,
): Promise<SupabasePlace[]> {
    const { data, error } = await supabase
        .from("places")
        .select(
            "place_id, name, description, address, schedule, image, rating, phone, website, maps_url, featured, featured_until, plan_type, plan_expires_at",
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


export async function getPlaceByIdFromSupabase(
    citySlug: string,
    categorySlug: string,
    placeId: string,
): Promise<SupabasePlace | null> {
    const { data, error } = await supabase
        .from("places")
        .select(
            "place_id, name, description, address, schedule, image, rating, phone, website, maps_url, featured, featured_until, plan_type, plan_expires_at",
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
};

type RecommendationOptions = {
    radius_km: number;
    city_slug?: string;
    category_slug?: string;
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
            "place_id, city_slug, category_slug, name, address, image, rating, maps_url, featured, featured_until, plan_type, plan_expires_at, latitude, longitude",
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

export async function placeExistsByExternalPlaceId(external_place_id: string): Promise<boolean> {
    const id = external_place_id?.trim();
    if (!id) {
        return false;
    }
    const { data, error } = await supabase
        .from("places")
        .select("place_id")
        .eq("external_place_id", id)
        .limit(1);

    if (error) {
        console.error("Supabase external_place_id lookup error:", error);
        throw new Error("Failed to check external place id");
    }

    return (data?.length ?? 0) > 0;
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

export async function createPlaceInSupabase(place: SupabasePlaceMutationInput): Promise<void> {
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
    { category_slug: "restaurante", category_name: "Restaurante" },
    { category_slug: "cafenele", category_name: "Cafenele" },
    { category_slug: "natura", category_name: "Natură" },
    { category_slug: "cultural", category_name: "Cultural" },
    { category_slug: "institutii", category_name: "Instituții" },
    { category_slug: "evenimente", category_name: "Evenimente" },
];

function isSafeCitySlug(s: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length > 0 && s.length <= 128;
}

export type CreateCityResult = {
    city_slug: string;
    categories_created: number;
};

export async function createCityWithStandardCategories(
    name: string,
    slugInput?: string | null,
): Promise<CreateCityResult> {
    const trimmedName = name?.trim();
    if (!trimmedName) {
        throw new Error("Lipsește numele orașului.");
    }

    const city_slug = (slugInput?.trim() || placeIdSlugFromName(trimmedName)).trim();
    if (!city_slug || !isSafeCitySlug(city_slug)) {
        throw new Error("Slug invalid. Folosiți litere mici, cifre și cratime.");
    }

    const { data: existingCity, error: cityLookupErr } = await supabase
        .from("cities")
        .select("slug")
        .eq("slug", city_slug)
        .limit(1);

    if (cityLookupErr) {
        console.error("Supabase city lookup error:", cityLookupErr);
        throw new Error("Nu s-a putut verifica orașul.");
    }

    if ((existingCity?.length ?? 0) > 0) {
        throw new Error("Există deja un oraș cu acest slug.");
    }

    const { error: insertCityErr } = await supabase
        .from("cities")
        .insert([{ slug: city_slug, name: trimmedName }]);

    if (insertCityErr) {
        console.error("Supabase create city error:", insertCityErr);
        throw new Error("Nu s-a putut crea orașul.");
    }

    const { data: existingCats, error: catLookupErr } = await supabase
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

    const toInsert = STANDARD_CATEGORY_DEFS.filter((d) => !have.has(d.category_slug)).map((d) => ({
        city_slug,
        category_slug: d.category_slug,
        category_name: d.category_name,
    }));

    let categories_created = 0;
    if (toInsert.length > 0) {
        const { error: insertCatErr } = await supabase.from("categories").insert(toInsert);
        if (insertCatErr) {
            console.error("Supabase create categories error:", insertCatErr);
            throw new Error("Orașul a fost creat, dar categoriile nu s-au putut adăuga.");
        }
        categories_created = toInsert.length;
    }

    return { city_slug, categories_created };
}
