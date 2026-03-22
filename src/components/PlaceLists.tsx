"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

  function resolveImage(place: Place) {
    if (!place.image || place.image === "/images/place-placeholder.jpg") {
      return "/images/place-placeholder.jpg";
    }
    return place.image;
  }

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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlaces.map((place) => (
            <Link
              key={place.id}
              href={`/orase/${slug}/${category}/${place.id}`}
              className="block rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="p-4 space-y-3">
                <div className="overflow-hidden rounded-lg">
                  <Image
                    src={resolveImage(place)}
                    alt={place.name}
                    width={600}
                    height={300}
                    className="h-48 w-full rounded-lg object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
                  <p className="text-sm text-gray-500">{place.address}</p>
                  <p className="text-sm font-semibold text-yellow-600">⭐ {place.rating}</p>
                  <p className="text-sm text-gray-600">{place.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}