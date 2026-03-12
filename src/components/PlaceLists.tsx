"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlaceCard } from "@/components/PlaceCard";
import type { Place } from "@/data/places";

type PlacesListProps = {
  places: Place[];
  slug: string;
  category: string;
};

export function PlacesList({ places, slug, category }: PlacesListProps) {
  const [search, setSearch] = useState("");

  const filteredPlaces = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    if (!searchValue) {
      return places;
    }

    return places.filter((place) => {
      return (
        place.name.toLowerCase().includes(searchValue) ||
        place.address.toLowerCase().includes(searchValue) ||
        place.description.toLowerCase().includes(searchValue)
      );
    });
  }, [places, search]);

  return (
    <div className="mt-8">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Caută o locație..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none focus:border-gray-500"
        />
      </div>

      {filteredPlaces.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm">
          Nu am găsit nicio locație pentru „{search}”.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPlaces.map((place) => (
            <Link
              key={place.id}
              href={`/orase/${slug}/${category}/${place.id}`}
            >
              <PlaceCard
                name={place.name}
                image={place.image}
                address={place.address}
                rating={place.rating}
                description={place.description}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}