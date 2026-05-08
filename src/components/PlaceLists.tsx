"use client";

import { useMemo } from "react";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import type { Place } from "@/data/places";

type PlacesListProps = {
  places: Place[];
  slug: string;
  category: string;
  /** Distanțe calculate automat din geolocația sesiunii. */
  distanceByPlaceId?: Record<string, number>;
};

export function PlacesList({
  places,
  slug,
  category,
  distanceByPlaceId: distanceByPlaceIdProp,
}: PlacesListProps) {
  const distanceByPlaceId = distanceByPlaceIdProp ?? {};

  const sortedPlaces = useMemo(() => {
    return [...places].sort((a, b) => {
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
  }, [places, distanceByPlaceId]);

  return (
    <div>
      {sortedPlaces.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/90 bg-white p-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100/60">
          Nu am găsit rezultate.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPlaces.map((place) => {
            const isFeatured = place.activeFeatured === true;
            const isPromoted = place.activePromoted === true;

            const distanceKm = distanceByPlaceId[place.id];

            return (
              <PublicPlaceCard
                key={`${slug}-${category}-${place.id}`}
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
