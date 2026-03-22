"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
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
      const addr = place.address?.toLowerCase() ?? "";
      return (
        place.name.toLowerCase().includes(searchValue) ||
        addr.includes(searchValue)
      );
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
          className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
        />
      </div>

      {filteredPlaces.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
          Nu am găsit rezultate.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlaces.map((place) => (
            <Link
              key={place.id}
              href={`/orase/${slug}/${category}/${place.id}`}
              className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-95"
            >
              <div className="h-full cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg">
                <div className="relative overflow-hidden rounded-t-2xl">
                  <PlaceImage
                    place={place}
                    citySlug={slug}
                    categorySlug={category}
                    width={600}
                    height={400}
                    className="h-36 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-950">{place.name}</h3>
                  {place.address?.trim() ? (
                    <p className="mt-1 text-sm text-gray-500">{place.address.trim()}</p>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}