"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";

type SectionRow = {
    place_id: string;
    name: string;
    address: string;
    image: string;
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
        const category_slug = typeof o.category_slug === "string" ? o.category_slug.trim() : "";
        const d = o.distance_km;
        if (!place_id || !name || !city_slug || !category_slug || typeof d !== "number" || !Number.isFinite(d)) {
            continue;
        }
        out.push({
            place_id,
            name,
            address: typeof o.address === "string" ? o.address : null,
            image: typeof o.image === "string" ? o.image : null,
            rating: typeof o.rating === "number" && Number.isFinite(o.rating) ? o.rating : null,
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
        image: r.image?.trim() || PLACE_IMAGE_PLACEHOLDER,
        rating: r.rating ?? 0,
        city_slug: r.city_slug,
        category_slug: r.category_slug,
        is_featured: r.is_featured,
        is_promoted: r.is_promoted,
        distance_km: r.distance_km,
    };
}

function placesToRows(places: PlaceFromApi[], city_slug: string, category_slug: string): SectionRow[] {
    return places.slice(0, 6).map((p) => ({
        place_id: p.id,
        name: p.name,
        address: (p.address ?? "").trim(),
        image: (p.image ?? "").trim() || PLACE_IMAGE_PLACEHOLDER,
        rating: typeof p.rating === "number" && Number.isFinite(p.rating) ? p.rating : 0,
        city_slug,
        category_slug,
        is_featured: p.activeFeatured === true,
        is_promoted: p.activePromoted === true,
    }));
}

type NearbyRecommendationsSectionProps = {
    citySlug: string;
    categorySlug: string;
};

function NearbyRecommendationsSection({ citySlug, categorySlug }: NearbyRecommendationsSectionProps) {
    const [location, setLocation] = useState<LocationState>({
        loadingLocation: true,
        noLocation: false,
        needsLocationCta: false,
    });
    const [rows, setRows] = useState<SectionRow[]>([]);
    const [sectionKind, setSectionKind] = useState<"nearby" | "fallback" | null>(null);

    const loadFallback = useCallback(async () => {
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
            const mapped = placesToRows(json.data.places, citySlug.trim(), categorySlug.trim());
            if (mapped.length > 0) {
                setRows(mapped);
                setSectionKind("fallback");
            }
        } catch {
            /* */
        } finally {
            setLocation((prev) => ({ ...prev, loadingLocation: false }));
        }
    }, [citySlug, categorySlug]);

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

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                    setLocation((prev) => ({ ...prev, noLocation: true, loadingLocation: true }));
                    await loadFallback();
                    return;
                }

                try {
                    const params = new URLSearchParams({
                        lat: String(lat),
                        lng: String(lng),
                        limit: "6",
                        category_slug: categorySlug.trim(),
                        city_slug: citySlug.trim(),
                    });
                    const res = await fetch(`/api/recommendations?${params.toString()}`);
                    const json = (await res.json()) as RecommendationsApiShape;
                    if (res.ok && json.success && Array.isArray(json.data)) {
                        const parsed = parseRecItems(json.data);
                        if (parsed.length > 0) {
                            setRows(parsed.map(recToRow));
                            setSectionKind("nearby");
                            setLocation((prev) => ({ ...prev, loadingLocation: false }));
                            return;
                        }
                    }
                } catch {
                    /* */
                }
                setLocation((prev) => ({ ...prev, loadingLocation: false }));
            },
            () => {
                setLocation((prev) => ({ ...prev, noLocation: true }));
                void loadFallback();
            },
            { maximumAge: 60_000, timeout: 12_000 },
        );
    }, [citySlug, categorySlug, loadFallback]);

    useEffect(() => {
        setRows([]);
        setSectionKind(null);

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
    }, [citySlug, categorySlug, loadFallback]);

    if (location.needsLocationCta && !location.noLocation) {
        return (
            <div className="mt-6 space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="text-base font-semibold text-gray-900">Recomandări în apropiere</h2>
                    <button
                        type="button"
                        onClick={() => requestLocation()}
                        className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                        Folosește locația mea
                    </button>
                </div>
            </div>
        );
    }

    if (location.loadingLocation && rows.length === 0) {
        return (
            <div className="mt-6 space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h2 className="text-base font-semibold text-gray-900">Recomandări în apropiere</h2>
                    <span className="text-sm text-gray-500">Se încarcă…</span>
                </div>
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
