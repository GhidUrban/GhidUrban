"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { resolvePlaceImageSrc } from "@/lib/resolve-place-image-src";
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
          const src = resolvePlaceImageSrc({
            image: place.image,
            google_match_status: place.google_match_status,
            google_photo_uri: place.google_photo_uri,
            category_slug: place.category_slug,
          });

          return (
            <Link
              key={`${place.city_slug}-${place.category_slug}-${place.place_id}`}
              href={`/orase/${place.city_slug}/${place.category_slug}/${place.place_id}`}
              className="group w-44 shrink-0 snap-start sm:w-52"
            >
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 active:scale-[0.98] md:hover:shadow-md md:hover:-translate-y-0.5">
                <div className="relative overflow-hidden">
                  <Image
                    src={src}
                    alt={place.name}
                    width={400}
                    height={260}
                    className="h-36 w-full object-cover sm:h-40"
                  />
                  {useNearby && place.distance_km != null && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-2.5 pt-8">
                      <span className="inline-flex rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-gray-700 backdrop-blur-sm">
                        {place.distance_km.toFixed(1)} km
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <h3 className="truncate text-[13px] font-semibold leading-snug text-gray-900 sm:text-sm">
                    {place.name}
                  </h3>
                  {place.rating != null && place.rating > 0 && (
                    <p className="mt-1 text-[11px] font-medium tabular-nums text-amber-600">
                      {place.rating.toFixed(1)} ★
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-[11px] leading-snug text-gray-400 capitalize">
                    {place.city_slug.replace(/-/g, " ")}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
