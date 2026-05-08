"use client";

import { useEffect, useRef, useState } from "react";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import { DelayedSpinner } from "@/components/DelayedSpinner";

type CarouselPlace = {
  place_id: string;
  city_slug: string;
  category_slug: string;
  name: string;
  image: string | null;
  rating: number | null;
  google_match_status: string | null;
  google_photo_uri: string | null;
  distance_km?: number;
};

type GeoState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "ready"; lat: number; lng: number };

const SESSION_KEY = "ghidurban_geo";

function getCachedCoords(): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") return parsed;
  } catch { /* ignore */ }
  return null;
}

export function HomePlacesCarousel({
  popularPlaces,
}: {
  popularPlaces: CarouselPlace[];
}) {
  const [geo, setGeo] = useState<GeoState>({ status: "loading" });
  const [nearbyPlaces, setNearbyPlaces] = useState<CarouselPlace[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const didRequest = useRef(false);

  useEffect(() => {
    if (didRequest.current) return;
    didRequest.current = true;

    const cached = getCachedCoords();
    if (cached) {
      setGeo({ status: "ready", lat: cached.lat, lng: cached.lng });
      return;
    }

    if (!navigator.geolocation) {
      setGeo({ status: "denied" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(coords)); } catch { /* ignore */ }
        setGeo({ status: "ready", ...coords });
      },
      () => setGeo({ status: "denied" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    if (geo.status !== "ready") return;
    setFetching(true);
    fetch(`/api/recommendations?lat=${geo.lat}&lng=${geo.lng}&radius_km=50&limit=20`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setNearbyPlaces(json.data);
        }
      })
      .catch(() => { /* fall back to popular */ })
      .finally(() => setFetching(false));
  }, [geo]);

  const isLoadingNearby = geo.status === "loading" || fetching;
  const useNearby = nearbyPlaces !== null && nearbyPlaces.length > 0;
  const places = useNearby ? nearbyPlaces : popularPlaces;
  const title = useNearby ? "Locuri aproape de tine" : "Locuri populare";

  if (isLoadingNearby) {
    return <DelayedSpinner />;
  }

  if (places.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl pb-6">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-[15px] font-semibold text-gray-800 sm:text-base">
          {title}
        </h2>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4 snap-x snap-mandatory">
        {places.map((place) => {
          return (
            <PublicPlaceCard
              key={`${place.city_slug}-${place.category_slug}-${place.place_id}`}
              place={{
                id: place.place_id,
                name: place.name,
                address: "",
                image: place.image ?? "",
                rating: place.rating ?? 0,
                google_match_status: place.google_match_status,
                google_photo_uri: place.google_photo_uri,
              }}
              citySlug={place.city_slug}
              categorySlug={place.category_slug}
              activeFeatured={false}
              activePromoted={false}
              distanceKm={useNearby ? place.distance_km : undefined}
              href={`/orase/${place.city_slug}/${place.category_slug}/${place.place_id}`}
              className="w-44 shrink-0 snap-start sm:w-52"
            />
          );
        })}
      </div>
    </section>
  );
}
