import {
    isCategorySlug,
    isCitySlug,
    placesByCity,
    type CategorySlug,
    type CitySlug,
    type Place,
} from "@/data/places";
import { slugToTitle } from "@/lib/slug";
import { supabase } from "@/lib/supabase/client";


export type CategoryCard = {
    slug: CategorySlug;
    name: string;
    icon: string;
};

export type SupabaseCity = {
    slug: string;
    name: string;
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
};

export type AdminSupabasePlaceRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    rating: number | null;
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

export async function getAllCitiesFromSupabase(): Promise<SupabaseCity[]> {
    const { data, error } = await supabase
        .from("cities")
        .select("slug, name")
        .order("name", { ascending: true });

    if (error) {
        throw error;
    }

    return data ?? [];
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
            "place_id, name, description, address, schedule, image, rating, phone, website, maps_url",
        )
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug)
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
            "place_id, name, description, address, schedule, image, rating, phone, website, maps_url",
        )
        .eq("city_slug", citySlug)
        .eq("category_slug", categorySlug)
        .eq("place_id", placeId)
        .single();

    if (error) {
        console.error("Supabase place error:", error);
        return null;
    }

    return data;
}

export async function getAllPlacesForAdminFromSupabase(): Promise<AdminSupabasePlaceRow[]> {
    const { data, error } = await supabase
        .from("places")
        .select("place_id, city_slug, category_slug, name, address, rating")
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
            "place_id, city_slug, category_slug, name, description, address, schedule, image, rating, phone, website, maps_url",
        )
        .eq("place_id", placeId)
        .single();

    if (error) {
        console.error("Supabase admin place error:", error);
        return null;
    }

    return data;
}

export async function createPlaceInSupabase(place: SupabasePlaceMutationInput): Promise<void> {
    const { error } = await supabase.from("places").insert([place]);

    if (error) {
        console.error("Supabase create place error:", error);
        throw new Error("Failed to create place");
    }
}

export async function updatePlaceInSupabase(place: SupabasePlaceMutationInput): Promise<void> {
    const { error } = await supabase
        .from("places")
        .update({
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
        })
        .eq("place_id", place.place_id)
        .eq("city_slug", place.city_slug)
        .eq("category_slug", place.category_slug);

    if (error) {
        console.error("Supabase update place error:", error);
        throw new Error("Failed to update place");
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
