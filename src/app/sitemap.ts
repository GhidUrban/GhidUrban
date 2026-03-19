import type { MetadataRoute } from "next";
import {
    getAllCitySlugs,
    getCategoryCardsForCity,
    getPlacesByCategory,
} from "@/lib/place-repository";

const BASE_URL = "https://ghidurban.ro";

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    const cities = getAllCitySlugs();

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${BASE_URL}/`,
            lastModified,
        },
        {
            url: `${BASE_URL}/orase`,
            lastModified,
        },
    ];

    const cityRoutes: MetadataRoute.Sitemap = cities.map((city) => ({
        url: `${BASE_URL}/orase/${city}`,
        lastModified,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = cities.flatMap((city) =>
        getCategoryCardsForCity(city).map((category) => ({
            url: `${BASE_URL}/orase/${city}/${category.slug}`,
            lastModified,
        }))
    );

    const placeRoutes: MetadataRoute.Sitemap = cities.flatMap((city) =>
        getCategoryCardsForCity(city).flatMap((category) =>
            getPlacesByCategory(city, category.slug).map((place) => ({
                url: `${BASE_URL}/orase/${city}/${category.slug}/${place.id}`,
                lastModified,
            }))
        )
    );

    return [...staticRoutes, ...cityRoutes, ...categoryRoutes, ...placeRoutes];
}
