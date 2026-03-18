import {
    isCategorySlug,
    isCitySlug,
    placesByCity,
    type CategorySlug,
    type CitySlug,
    type Place,
} from "@/data/places";
import { slugToTitle } from "@/lib/slug";

export type CategoryCard = {
    slug: CategorySlug;
    name: string;
    icon: string;
};

const CATEGORY_CARDS: CategoryCard[] = [
    { name: "Restaurante", slug: "restaurante", icon: "🍽" },
    { name: "Cafenele", slug: "cafenele", icon: "☕" },
    { name: "Instituții", slug: "institutii", icon: "🏛" },
    { name: "Cultural", slug: "cultural", icon: "🎭" },
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
