import type { GlobalSearchPlace } from "@/lib/load-global-search-index";

/** Preview rows under city hub on `/cauta`. */
export const CITY_HUB_CATEGORY_ROWS = [
    { slug: "cafenele", title: "Cafenele" },
    { slug: "cazare", title: "Cazare" },
    { slug: "restaurante", title: "Restaurante" },
] as const;

function ratingRank(rating: number | null | undefined): number {
    if (rating == null || !Number.isFinite(rating)) return Number.NEGATIVE_INFINITY;
    return rating;
}

/** Top `limitPerCategory` places per slug, filtered by city; sort desc by rating (null last). */
export function topPlacesPerCategoriesForCity(
    places: GlobalSearchPlace[],
    citySlug: string,
    categorySlugs: readonly string[],
    limitPerCategory: number,
): Record<string, GlobalSearchPlace[]> {
    const out: Record<string, GlobalSearchPlace[]> = {};
    for (const slug of categorySlugs) {
        const rows = places
            .filter((p) => p.city_slug === citySlug && p.category_slug === slug)
            .sort((a, b) => ratingRank(b.rating) - ratingRank(a.rating));
        out[slug] = rows.slice(0, limitPerCategory);
    }
    return out;
}
