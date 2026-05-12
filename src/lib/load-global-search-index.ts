import {
    getCategoriesByCityFromSupabase,
    getPlacesSearchIndexRowsFromSupabase,
    getPublicCitiesFromSupabase,
} from "@/lib/place-repository";
import { resolveListing } from "@/lib/listing-plan";
import { normalizeForSearch } from "@/lib/global-place-search";

export type GlobalSearchCity = {
    slug: string;
    name: string;
};

export type GlobalSearchCategory = {
    city_slug: string;
    city_name: string;
    category_slug: string;
    category_name: string;
};

/** Fields needed for search + `PublicPlaceCard` on `/cauta`. */
export type GlobalSearchPlace = {
    place_id: string;
    name: string;
    city_slug: string;
    city_name: string;
    category_slug: string;
    category_name: string;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    image?: string | null;
    rating?: number | null;
    active_featured?: boolean;
    active_promoted?: boolean;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
    /** Pre-computed normalizeForSearch(name) — avoids re-normalizing per keystroke. */
    _n_name?: string;
    /** Pre-computed normalizeForSearch(address) — avoids re-normalizing per keystroke. */
    _n_addr?: string;
};

export type GlobalSearchIndex = {
    cities: GlobalSearchCity[];
    categories: GlobalSearchCategory[];
    places: GlobalSearchPlace[];
};

let cachedIndex: GlobalSearchIndex | null = null;
let inflightLoad: Promise<GlobalSearchIndex> | null = null;
let clientPrewarmRequested = false;

async function loadGlobalSearchIndexUncached(): Promise<GlobalSearchIndex> {
    const citiesRows = await getPublicCitiesFromSupabase();
    const cities: GlobalSearchCity[] = citiesRows.map((c) => ({
        slug: c.slug,
        name: c.name,
    }));

    const perCityResults = await Promise.all(
        citiesRows.map(async (city) => {
            const cats = await getCategoriesByCityFromSupabase(city.slug);
            const perCategory = await Promise.all(
                cats.map(async (cat) => {
                    const placeRows = await getPlacesSearchIndexRowsFromSupabase(city.slug, cat.category_slug);
                    return { cat, placeRows };
                }),
            );
            return { city, perCategory };
        }),
    );

    const categories: GlobalSearchCategory[] = [];
    const places: GlobalSearchPlace[] = [];

    for (const { city, perCategory } of perCityResults) {
        for (const { cat, placeRows } of perCategory) {
            categories.push({
                city_slug: city.slug,
                city_name: city.name,
                category_slug: cat.category_slug,
                category_name: cat.category_name ?? "",
            });
            for (const p of placeRows) {
                const { activeFeatured, activePromoted } = resolveListing({
                    featured: p.featured,
                    featured_until: p.featured_until,
                    plan_type: p.plan_type,
                    plan_expires_at: p.plan_expires_at,
                });
                const addr = p.address ?? "";
                places.push({
                    place_id: p.place_id,
                    name: p.name,
                    city_slug: city.slug,
                    city_name: city.name,
                    category_slug: cat.category_slug,
                    category_name: cat.category_name ?? "",
                    latitude: p.latitude ?? null,
                    longitude: p.longitude ?? null,
                    address: addr || null,
                    image: p.image ?? null,
                    rating: p.rating ?? null,
                    active_featured: activeFeatured,
                    active_promoted: activePromoted,
                    google_match_status: p.google_match_status ?? null,
                    google_photo_uri: p.google_photo_uri ?? null,
                    _n_name: normalizeForSearch(p.name),
                    _n_addr: normalizeForSearch(addr),
                });
            }
        }
    }

    return { cities, categories, places };
}

export async function loadGlobalSearchIndex(): Promise<GlobalSearchIndex> {
    if (cachedIndex) {
        return cachedIndex;
    }
    if (inflightLoad) {
        return inflightLoad;
    }
    inflightLoad = loadGlobalSearchIndexUncached()
        .then((idx) => {
            cachedIndex = idx;
            inflightLoad = null;
            return idx;
        })
        .catch((err) => {
            inflightLoad = null;
            throw err;
        });
    return inflightLoad;
}

/**
 * Warm server-side index (uses same cache + in-flight dedupe as `loadGlobalSearchIndex`).
 * Call from client before navigating to `/cauta` so the first RSC render can hit cache.
 */
export function prewarmGlobalSearchIndex(): void {
    if (typeof window === "undefined") {
        return;
    }
    if (clientPrewarmRequested) {
        return;
    }
    clientPrewarmRequested = true;
    void fetch("/api/global-search-index/prewarm", { method: "GET" }).catch(() => {});
}
