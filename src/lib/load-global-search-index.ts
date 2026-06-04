import { getAllCategoriesForSearchIndexFromSupabase } from "@/lib/repositories/category-repository";
import { getAllPlacesSearchIndexRowsFromSupabase } from "@/lib/repositories/place-repository";
import { getPublicCitiesFromSupabase } from "@/lib/repositories/city-repository";
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
    _n_city?: string;
    _n_cat?: string;
};

export type GlobalSearchIndex = {
    cities: GlobalSearchCity[];
    categories: GlobalSearchCategory[];
    places: GlobalSearchPlace[];
};

const INDEX_CACHE_TTL_MS = 120_000;

let cachedIndex: GlobalSearchIndex | null = null;
let cachedAt = 0;
let inflightLoad: Promise<GlobalSearchIndex> | null = null;

function isIndexCacheFresh(): boolean {
    return cachedIndex !== null && Date.now() - cachedAt < INDEX_CACHE_TTL_MS;
}

function shouldCacheIndex(idx: GlobalSearchIndex): boolean {
    return idx.places.length > 0 || idx.cities.length > 0;
}

async function loadGlobalSearchIndexUncached(): Promise<GlobalSearchIndex> {
    const [citiesRows, categoryRows, placeRows] = await Promise.all([
        getPublicCitiesFromSupabase(),
        getAllCategoriesForSearchIndexFromSupabase(),
        getAllPlacesSearchIndexRowsFromSupabase(),
    ]);

    const cities: GlobalSearchCity[] = citiesRows.map((c) => ({
        slug: c.slug,
        name: c.name,
    }));

    const cityNameBySlug = new Map(cities.map((c) => [c.slug, c.name]));
    const categoryNameByKey = new Map(
        categoryRows.map((c) => [`${c.city_slug}:${c.category_slug}`, c.category_name]),
    );

    const categories: GlobalSearchCategory[] = categoryRows.map((cat) => ({
        city_slug: cat.city_slug,
        city_name: cityNameBySlug.get(cat.city_slug) ?? cat.city_slug,
        category_slug: cat.category_slug,
        category_name: cat.category_name,
    }));

    const places: GlobalSearchPlace[] = [];

    for (const p of placeRows) {
        const cityName = cityNameBySlug.get(p.city_slug) ?? p.city_slug;
        const categoryName =
            categoryNameByKey.get(`${p.city_slug}:${p.category_slug}`) ?? p.category_slug;
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
            city_slug: p.city_slug,
            city_name: cityName,
            category_slug: p.category_slug,
            category_name: categoryName,
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
            _n_city: normalizeForSearch(cityName),
            _n_cat: normalizeForSearch(categoryName),
        });
    }

    console.log(
        `[SearchIndex] cities=${cities.length} categories=${categories.length} places=${places.length} (bulk load; place_listings/google skipped)`,
    );

    return { cities, categories, places };
}

export async function loadGlobalSearchIndex(): Promise<GlobalSearchIndex> {
    if (isIndexCacheFresh()) {
        return cachedIndex!;
    }
    if (inflightLoad) {
        return inflightLoad;
    }
    cachedIndex = null;
    cachedAt = 0;
    inflightLoad = loadGlobalSearchIndexUncached()
        .then((idx) => {
            if (shouldCacheIndex(idx)) {
                cachedIndex = idx;
                cachedAt = Date.now();
            } else {
                cachedIndex = null;
                cachedAt = 0;
            }
            inflightLoad = null;
            return idx;
        })
        .catch((err) => {
            inflightLoad = null;
            cachedIndex = null;
            cachedAt = 0;
            throw err;
        });
    return inflightLoad;
}
