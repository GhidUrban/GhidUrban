import type { PlacesByCity } from "./src/data/places";

type FlatPlace = {
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

const { placesByCity } = (await import(new URL("./src/data/places.ts", import.meta.url).href)) as {
  placesByCity: PlacesByCity;
};

const flatPlaces: FlatPlace[] = [];

for (const [city_slug, categories] of Object.entries(placesByCity)) {
  for (const [category_slug, places] of Object.entries(categories)) {
    for (const place of places) {
      flatPlaces.push({
        place_id: place.id,
        city_slug,
        category_slug,
        name: place.name,
        description: place.description ?? null,
        address: place.address ?? null,
        schedule: place.schedule ?? null,
        image: place.image ?? null,
        rating: place.rating ?? null,
        phone: place.phone ?? null,
        website: place.website ?? null,
        maps_url: place.mapsUrl ?? null,
      });
    }
  }
}

console.log(JSON.stringify(flatPlaces, null, 2));
