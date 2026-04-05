"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import { PlacesList } from "@/components/PlaceLists";
import type { Place } from "@/data/places";
import { haversineKm } from "@/lib/haversine-km";
import { readSessionUserLocation } from "@/lib/session-user-location";

const NEARBY_MAX = 6;

type CategoryPlacesSectionProps = {
  places: Place[];
  slug: string;
  category: string;
};

function placeCoords(p: Place): { lat: number; lng: number } | null {
  const lat = p.latitude;
  const lng = p.longitude;
  if (lat == null || lng == null) return null;
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return { lat: la, lng: lo };
}

export function CategoryPlacesSection({
  places,
  slug,
  category,
}: CategoryPlacesSectionProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [sessionCoords, setSessionCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    setHasMounted(true);
    const s = readSessionUserLocation(slug);
    setSessionCoords(s ? { lat: s.lat, lng: s.lng } : null);
  }, [slug]);

  const nearbyWithKm = useMemo(() => {
    if (!sessionCoords) return [];
    const { lat: uLat, lng: uLng } = sessionCoords;
    const scored: { place: Place; km: number }[] = [];
    for (const p of places) {
      const c = placeCoords(p);
      if (!c) continue;
      scored.push({
        place: p,
        km: haversineKm(uLat, uLng, c.lat, c.lng),
      });
    }
    scored.sort((a, b) => a.km - b.km);
    return scored.slice(0, NEARBY_MAX);
  }, [places, sessionCoords]);

  const showNearbySection =
    hasMounted && sessionCoords != null && nearbyWithKm.length > 0;

  return (
    <>
      {showNearbySection ? (
        <section
          className="mt-0 border-b border-gray-200/70 pb-8 sm:pb-10"
          aria-labelledby="category-nearby-title"
        >
          <h2
            id="category-nearby-title"
            className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg"
          >
            Aproape de tine
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-5">
            {nearbyWithKm.map(({ place: p, km }) => {
              const isFeatured = p.activeFeatured === true;
              const isPromoted = p.activePromoted === true;
              return (
                <PublicPlaceCard
                  key={`nearby-${slug}-${category}-${p.id}`}
                  place={p}
                  citySlug={slug}
                  categorySlug={category}
                  activeFeatured={isFeatured}
                  activePromoted={isPromoted}
                  distanceKm={km}
                  href={`/orase/${slug}/${category}/${p.id}`}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <div className={showNearbySection ? "mt-8 sm:mt-10" : "mt-0"}>
        <PlacesList places={places} slug={slug} category={category} />
      </div>
    </>
  );
}
