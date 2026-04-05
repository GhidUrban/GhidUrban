import {
    getCategoriesByCityFromSupabase,
    getPlacesByCategoryFromSupabase,
    getPublicCitiesFromSupabase,
} from "@/lib/place-repository";

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

export type GlobalSearchPlace = {
    place_id: string;
    name: string;
    city_slug: string;
    city_name: string;
    category_slug: string;
    category_name: string;
    address: string;
    description: string;
};

export type GlobalSearchIndex = {
    cities: GlobalSearchCity[];
    categories: GlobalSearchCategory[];
    places: GlobalSearchPlace[];
};

export async function loadGlobalSearchIndex(): Promise<GlobalSearchIndex> {
    const citiesRows = await getPublicCitiesFromSupabase();
    const cities: GlobalSearchCity[] = citiesRows.map((c) => ({
        slug: c.slug,
        name: c.name,
    }));

    const categories: GlobalSearchCategory[] = [];
    const places: GlobalSearchPlace[] = [];

    for (const city of citiesRows) {
        const cats = await getCategoriesByCityFromSupabase(city.slug);
        for (const cat of cats) {
            categories.push({
                city_slug: city.slug,
                city_name: city.name,
                category_slug: cat.category_slug,
                category_name: cat.category_name ?? "",
            });
            const placeRows = await getPlacesByCategoryFromSupabase(city.slug, cat.category_slug);
            for (const p of placeRows) {
                places.push({
                    place_id: p.place_id,
                    name: p.name,
                    city_slug: city.slug,
                    city_name: city.name,
                    category_slug: cat.category_slug,
                    category_name: cat.category_name ?? "",
                    address: p.address ?? "",
                    description: p.description ?? "",
                });
            }
        }
    }

    return { cities, categories, places };
}
