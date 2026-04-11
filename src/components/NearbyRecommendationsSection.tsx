"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";

type SectionRow = {
  place_id: string;
  name: string;
  address: string;
  image: string;
  google_match_status: string | null;
  google_photo_uri: string | null;
  rating: number;
  city_slug: string;
  category_slug: string;
  is_featured: boolean;
  is_promoted: boolean;
  distance_km?: number;
};

type RecItem = {
  place_id: string;
  name: string;
  address: string | null;
  image: string | null;
  google_match_status: string | null;
  google_photo_uri: string | null;
  rating: number | null;
  city_slug: string;
  category_slug: string;
  distance_km: number;
  is_featured: boolean;
  is_promoted: boolean;
};

type RecommendationsApiShape = {
  success?: boolean;
  data?: unknown[];
};

type PlaceFromApi = {
  id: string;
  name: string;
  address?: string;
  image?: string;
  google_match_status?: string | null;
  google_photo_uri?: string | null;
  rating?: number;
  activeFeatured?: boolean;
  activePromoted?: boolean;
};

type PlacesApiShape = {
  success?: boolean;
  data?: {
    places?: PlaceFromApi[];
  } | null;
};

type LocationState = {
  loadingLocation: boolean;
  noLocation: boolean;
  needsLocationCta: boolean;
};

function parseRecItems(raw: unknown): RecItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: RecItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") {
      continue;
    }
    const o = x as Record<string, unknown>;
    const place_id = typeof o.place_id === "string" ? o.place_id.trim() : "";
    const name = typeof o.name === "string" ? o.name : "";
    const city_slug = typeof o.city_slug === "string" ? o.city_slug.trim() : "";
    const category_slug =
      typeof o.category_slug === "string" ? o.category_slug.trim() : "";
    const d = o.distance_km;
    if (
      !place_id ||
      !name ||
      !city_slug ||
      !category_slug ||
      typeof d !== "number" ||
      !Number.isFinite(d)
    ) {
      continue;
    }
    const gms =
      typeof o.google_match_status === "string" ? o.google_match_status.trim() : null;
    const gpu =
      typeof o.google_photo_uri === "string" ? o.google_photo_uri.trim() : null;
    out.push({
      place_id,
      name,
      address: typeof o.address === "string" ? o.address : null,
      image: typeof o.image === "string" ? o.image : null,
      google_match_status: gms && gms.length > 0 ? gms : null,
      google_photo_uri: gpu && gpu.length > 0 ? gpu : null,
      rating:
        typeof o.rating === "number" && Number.isFinite(o.rating) ? o.rating : null,
      city_slug,
      category_slug,
      distance_km: d,
      is_featured: o.is_featured === true,
      is_promoted: o.is_promoted === true,
    });
  }
  return out;
}

function recToRow(r: RecItem): SectionRow {
  return {
    place_id: r.place_id,
    name: r.name,
    address: r.address?.trim() ?? "",
    image: r.image?.trim() ?? "",
    google_match_status: r.google_match_status,
    google_photo_uri: r.google_photo_uri,
    rating: r.rating ?? 0,
    city_slug: r.city_slug,
    category_slug: r.category_slug,
    is_featured: r.is_featured,
    is_promoted: r.is_promoted,
    distance_km: r.distance_km,
  };
}

function placesToRows(
  places: PlaceFromApi[],
  city_slug: string,
  category_slug: string,
): SectionRow[] {
  return places.slice(0, 6).map((p) => ({
    place_id: p.id,
    name: p.name,
    address: (p.address ?? "").trim(),
    image: (p.image ?? "").trim(),
    google_match_status:
      typeof p.google_match_status === "string" ? p.google_match_status.trim() || null : null,
    google_photo_uri:
      typeof p.google_photo_uri === "string" ? p.google_photo_uri.trim() || null : null,
    rating:
      typeof p.rating === "number" && Number.isFinite(p.rating) ? p.rating : 0,
    city_slug,
    category_slug,
    is_featured: p.activeFeatured === true,
    is_promoted: p.activePromoted === true,
  }));
}

function buildDistanceMapFromRecItems(items: RecItem[]): Record<string, number> {
  const next: Record<string, number> = {};
  for (const it of items) {
    if (it.place_id && Number.isFinite(it.distance_km)) {
      next[it.place_id] = it.distance_km;
    }
  }
  return next;
}

type NearbyRecommendationsSectionProps = {
  citySlug: string;
  categorySlug: string;
  excludePlaceId?: string;
  onRecommendationsChange?: (placeIds: string[]) => void;
  onDistancesChange?: (distanceByPlaceId: Record<string, number>) => void;
};

function NearbyRecommendationsSection({
  citySlug,
  categorySlug,
  excludePlaceId,
  onRecommendationsChange,
  onDistancesChange,
}: NearbyRecommendationsSectionProps) {
  const [location, setLocation] = useState<LocationState>({
    loadingLocation: true,
    noLocation: false,
    needsLocationCta: false,
  });
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [sectionKind, setSectionKind] = useState<"nearby" | "fallback" | null>(
    null,
  );

  const loadFallback = useCallback(async () => {
    onDistancesChange?.({});
    try {
      const params = new URLSearchParams({
        city_slug: citySlug.trim(),
        category_slug: categorySlug.trim(),
        sort: "rating_desc",
      });
      const res = await fetch(`/api/places?${params.toString()}`);
      const json = (await res.json()) as PlacesApiShape;
      if (!res.ok || !json.success || !json.data?.places?.length) {
        return;
      }
      const mapped = placesToRows(
        json.data.places,
        citySlug.trim(),
        categorySlug.trim(),
      );
      if (mapped.length > 0) {
        setRows(mapped);
        setSectionKind("fallback");
      }
    } catch {
      /* */
    } finally {
      setLocation((prev) => ({ ...prev, loadingLocation: false }));
    }
  }, [citySlug, categorySlug, onDistancesChange]);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        needsLocationCta: false,
        noLocation: true,
        loadingLocation: true,
      }));
      setRows([]);
      setSectionKind(null);
      onDistancesChange?.({});
      void loadFallback();
      return;
    }

    setLocation((prev) => ({
      ...prev,
      needsLocationCta: false,
      loadingLocation: true,
      noLocation: false,
    }));
    setRows([]);
    setSectionKind(null);
    onDistancesChange?.({});

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setLocation((prev) => ({
            ...prev,
            noLocation: true,
            loadingLocation: true,
          }));
          await loadFallback();
          return;
        }

        try {
          const params = new URLSearchParams({
            lat: String(lat),
            lng: String(lng),
            limit: "50",
            category_slug: categorySlug.trim(),
            city_slug: citySlug.trim(),
          });
          const ex = excludePlaceId?.trim();
          if (ex) {
            params.set("exclude_place_id", ex);
          }
          const res = await fetch(`/api/recommendations?${params.toString()}`);
          const json = (await res.json()) as RecommendationsApiShape;
          if (res.ok && json.success && Array.isArray(json.data)) {
            const parsed = parseRecItems(json.data);
            if (parsed.length > 0) {
              onDistancesChange?.(buildDistanceMapFromRecItems(parsed));
              setRows(parsed.slice(0, 6).map(recToRow));
              setSectionKind("nearby");
              setLocation((prev) => ({ ...prev, loadingLocation: false }));
              return;
            }
          }
        } catch {
          /* */
        }
        setLocation((prev) => ({ ...prev, loadingLocation: false }));
        onDistancesChange?.({});
      },
      () => {
        setLocation((prev) => ({ ...prev, noLocation: true }));
        void loadFallback();
      },
      { maximumAge: 60_000, timeout: 12_000 },
    );
  }, [citySlug, categorySlug, excludePlaceId, loadFallback, onDistancesChange]);

  useEffect(() => {
    setRows([]);
    setSectionKind(null);
    onDistancesChange?.({});

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocation({
        loadingLocation: true,
        noLocation: true,
        needsLocationCta: false,
      });
      void loadFallback();
      return;
    }

    setLocation({
      loadingLocation: false,
      noLocation: false,
      needsLocationCta: true,
    });
  }, [citySlug, categorySlug, excludePlaceId, loadFallback, onDistancesChange]);

  useEffect(() => {
    if (!onRecommendationsChange) {
      return;
    }
    if (rows.length > 0 && sectionKind) {
      onRecommendationsChange(rows.map((r) => r.place_id));
    } else {
      onRecommendationsChange([]);
    }
  }, [rows, sectionKind, onRecommendationsChange]);

  if (location.needsLocationCta && !location.noLocation) {
    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={() => requestLocation()}
          className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
        >
          <svg
            className="h-4 w-4 shrink-0 text-gray-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          Folosește locația mea
        </button>
      </div>
    );
  }

  if (location.loadingLocation && rows.length === 0) {
    return (
      <div className="mt-6 flex items-center gap-2.5 text-sm text-gray-500">
        <span
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500"
          aria-hidden
        />
        <span>Se încarcă…</span>
      </div>
    );
  }

  if (rows.length === 0 || !sectionKind) {
    return null;
  }

  const title =
    sectionKind === "nearby" ? "Recomandări în apropiere" : "Top din categorie";

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <PublicPlaceCard
            key={`${row.city_slug}-${row.category_slug}-${row.place_id}`}
            place={{
              id: row.place_id,
              name: row.name,
              address: row.address,
              image: row.image,
              google_match_status: row.google_match_status,
              google_photo_uri: row.google_photo_uri,
              rating: row.rating,
            }}
            citySlug={row.city_slug}
            categorySlug={row.category_slug}
            activeFeatured={row.is_featured}
            activePromoted={row.is_promoted}
            distanceKm={sectionKind === "nearby" ? row.distance_km : undefined}
            href={`/orase/${row.city_slug}/${row.category_slug}/${row.place_id}`}
          />
        ))}
      </div>
    </div>
  );
}

export default NearbyRecommendationsSection;
export { NearbyRecommendationsSection };
