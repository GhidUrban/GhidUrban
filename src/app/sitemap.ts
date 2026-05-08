import type { MetadataRoute } from "next";
import {
    getAllCitySlugs,
    getCategoriesByCityFromSupabase,
    getPlacesByCategoryFromSupabase,
} from "@/lib/place-repository";

const BASE_URL = "https://ghidurban.ro";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const lastModified = new Date();
    const cities = await getAllCitySlugs();

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${BASE_URL}/`, lastModified },
        { url: `${BASE_URL}/orase`, lastModified },
        { url: `${BASE_URL}/cauta`, lastModified },
    ];

    const cityRoutes: MetadataRoute.Sitemap = cities.map((city) => ({
        url: `${BASE_URL}/orase/${city}`,
        lastModified,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = [];
    const placeRoutes: MetadataRoute.Sitemap = [];

    for (const city of cities) {
        const cats = await getCategoriesByCityFromSupabase(city);
        for (const cat of cats) {
            categoryRoutes.push({
                url: `${BASE_URL}/orase/${city}/${cat.category_slug}`,
                lastModified,
            });

            const places = await getPlacesByCategoryFromSupabase(city, cat.category_slug);
            for (const place of places) {
                placeRoutes.push({
                    url: `${BASE_URL}/orase/${city}/${cat.category_slug}/${place.place_id}`,
                    lastModified,
                });
            }
        }
    }

    return [...staticRoutes, ...cityRoutes, ...categoryRoutes, ...placeRoutes];
}
