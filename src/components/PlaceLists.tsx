"use client";

import { useMemo, useState } from "react";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
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

    const base =
      !searchValue
        ? places
        : places.filter((place) => {
            const addr = place.address?.toLowerCase() ?? "";
            return (
              place.name.toLowerCase().includes(searchValue) ||
              addr.includes(searchValue)
            );
          });

    return [...base].sort((a, b) => {
      const rank =
        Number(!!b.activeFeatured) - Number(!!a.activeFeatured);
      if (rank !== 0) {
        return rank;
      }
      return a.name.localeCompare(b.name);
    });
  }, [places, search]);

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Caută un loc după nume sau adresă..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition-shadow duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 focus:ring-offset-gray-100"
        />
      </div>

      {filteredPlaces.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100/60">
          Nu am găsit rezultate.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlaces.map((place) => {
            const isFeatured = place.activeFeatured === true;

            return (
              <PublicPlaceCard
                key={place.id}
                place={place}
                citySlug={slug}
                categorySlug={category}
                activeFeatured={isFeatured}
                href={`/orase/${slug}/${category}/${place.id}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
