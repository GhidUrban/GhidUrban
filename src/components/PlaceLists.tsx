"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import type { Place } from "@/data/places";

type PlacesListProps = {
  places: Place[];
  slug: string;
  category: string;
};

type RecommendationsResponse = {
  success?: boolean;
  data?: Array<{ place_id?: string; distance_km?: number }>;
};

export function PlacesList({ places, slug, category }: PlacesListProps) {
  const [search, setSearch] = useState("");
  const [distanceByPlaceId, setDistanceByPlaceId] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          city_slug: slug,
          category_slug: category,
        });
        try {
          const res = await fetch(`/api/recommendations?${params.toString()}`);
          const json = (await res.json()) as RecommendationsResponse;
          if (!res.ok || !json.success || !Array.isArray(json.data)) {
            return;
          }
          const next: Record<string, number> = {};
          for (const row of json.data) {
            const id = row.place_id?.trim();
            const d = row.distance_km;
            if (id && typeof d === "number" && Number.isFinite(d)) {
              next[id] = d;
            }
          }
          setDistanceByPlaceId(next);
        } catch {
          /* ignore */
        }
      },
      () => {
        /* denied or error */
      },
      { maximumAge: 60_000, timeout: 12_000 },
    );
  }, [slug, category]);

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
      const tier = (b.listingTierRank ?? 0) - (a.listingTierRank ?? 0);
      if (tier !== 0) {
        return tier;
      }
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDiff !== 0) {
        return ratingDiff;
      }
      const da = distanceByPlaceId[a.id];
      const db = distanceByPlaceId[b.id];
      const aOk = typeof da === "number" && Number.isFinite(da);
      const bOk = typeof db === "number" && Number.isFinite(db);
      if (aOk && bOk && da !== db) {
        return da - db;
      }
      if (aOk && !bOk) {
        return -1;
      }
      if (!aOk && bOk) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [places, search, distanceByPlaceId]);

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
            const isPromoted = place.activePromoted === true;

            const distanceKm = distanceByPlaceId[place.id];

            return (
              <PublicPlaceCard
                key={place.id}
                place={place}
                citySlug={slug}
                categorySlug={category}
                activeFeatured={isFeatured}
                activePromoted={isPromoted}
                distanceKm={distanceKm}
                href={`/orase/${slug}/${category}/${place.id}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
