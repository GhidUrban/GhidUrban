"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
    GlobalSearchCategory,
    GlobalSearchIndex,
    GlobalSearchPlace,
} from "@/lib/load-global-search-index";
import {
    readRecentPlaces,
    RECENT_PLACES_STORAGE_KEY,
    type RecentPlaceVisit,
} from "@/lib/cauta-recent-places";
import { highlightPlaceTitle } from "@/lib/highlight-place-title";
import {
    searchCitiesGlobal,
    searchPlacesGlobal,
    type GlobalSearchOutcome,
} from "@/lib/global-place-search";
import { haversineKm } from "@/lib/haversine-km";
import {
    clearSessionUserLocation,
    dispatchSessionLocationChanged,
    LOCATION_CHANGED_EVENT,
    readSessionUserLocation,
    saveSessionUserLocation,
} from "@/lib/session-user-location";
import { CautaRecentVisitedRow } from "@/components/CautaRecentVisitedRow";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import { SearchField } from "@/components/ui/SearchField";
import { CITY_HUB_CATEGORY_ROWS, topPlacesPerCategoriesForCity } from "@/lib/city-search-spotlight";

function CityResultHeader({
    citySlug,
    cityDisplayName,
}: {
    citySlug: string;
    cityDisplayName: string;
}) {
    return (
        <div className="mb-4 max-w-2xl">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{cityDisplayName}</h2>
                <span className="select-none text-slate-300" aria-hidden>
                    ·
                </span>
                <Link
                    href={`/orase/${citySlug}`}
                    className="text-sm font-medium text-[#008fa8] underline-offset-[3px] hover:underline"
                >
                    Vezi orașul
                </Link>
            </div>
        </div>
    );
}

/** Benzi „top” pe cele 3 categorii din spotlight. */
function CitySpotlightStrips({
    spotlightByCategory,
    activeCoords,
}: {
    spotlightByCategory: Record<string, GlobalSearchPlace[]>;
    activeCoords: { lat: number; lng: number } | null;
}) {
    return (
        <>
            {CITY_HUB_CATEGORY_ROWS.map((row) => {
                const strip = spotlightByCategory[row.slug] ?? [];
                return (
                    <div key={row.slug} className="mb-6">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {row.title}
                        </h3>
                        {strip.length === 0 ? (
                            <p className="text-sm text-gray-400">Niciun loc în această categorie.</p>
                        ) : (
                            <div className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-1">
                                {strip.map((p) => {
                                    const ratingNum =
                                        typeof p.rating === "number" && Number.isFinite(p.rating)
                                            ? p.rating
                                            : undefined;
                                    return (
                                        <PublicPlaceCard
                                            key={`${p.city_slug}-${p.category_slug}-${p.place_id}`}
                                            place={{
                                                id: p.place_id,
                                                name: p.name,
                                                image: p.image ?? "",
                                                address: (p.address ?? "").trim(),
                                                google_match_status: p.google_match_status ?? null,
                                                google_photo_uri: p.google_photo_uri ?? null,
                                                ...(ratingNum != null && ratingNum > 0
                                                    ? { rating: ratingNum }
                                                    : {}),
                                            }}
                                            citySlug={p.city_slug}
                                            categorySlug={p.category_slug}
                                            activeFeatured={p.active_featured === true}
                                            activePromoted={p.active_promoted === true}
                                            distanceKm={
                                                activeCoords &&
                                                p.latitude != null &&
                                                p.longitude != null
                                                    ? haversineKm(
                                                          activeCoords.lat,
                                                          activeCoords.lng,
                                                          Number(p.latitude),
                                                          Number(p.longitude),
                                                      )
                                                    : undefined
                                            }
                                            href={`/orase/${p.city_slug}/${p.category_slug}/${p.place_id}`}
                                            titleContent={p.name}
                                            className="w-44 shrink-0 sm:w-52"
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}

type DiscoveryCategoryChip = {
    category_slug: string;
    category_name: string;
};

/** Rând compact de categorii sub câmpul de căutare. */
function CautaDiscoveryPillsRow({
    categories,
    citySlug,
    disabled,
    chipClassName,
    onSearchCategory,
}: {
    categories: DiscoveryCategoryChip[];
    citySlug: string | null;
    disabled: boolean;
    chipClassName: (categorySlug: string) => string;
    onSearchCategory: (categoryName: string) => void;
}) {
    if (categories.length === 0) return null;
    return (
        <nav aria-label="Categorii rapide" className="mx-auto mb-4 w-full max-w-2xl">
            <div className="flex flex-wrap justify-center gap-2">
                {categories.map((cat) =>
                    citySlug ? (
                        <Link
                            key={cat.category_slug}
                            href={`/orase/${citySlug}/${cat.category_slug}`}
                            className={chipClassName(cat.category_slug)}
                        >
                            {cat.category_name}
                        </Link>
                    ) : (
                        <button
                            key={cat.category_slug}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSearchCategory(cat.category_name)}
                            className={chipClassName(cat.category_slug)}
                        >
                            {cat.category_name}
                        </button>
                    ),
                )}
                <Link
                    href="/orase"
                    className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-600 transition-[color,background-color,border-color,transform] duration-100 hover:border-black/20 hover:bg-gray-100/70 hover:text-gray-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100"
                >
                    Orașe
                </Link>
            </div>
        </nav>
    );
}

export function GlobalSearchClient({
    index,
    initialQuery = "",
}: {
    index: GlobalSearchIndex;
    initialQuery?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isRoutePending, startRouteTransition] = useTransition();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [inputValue, setInputValue] = useState(initialQuery);
    const [committedQuery, setCommittedQuery] = useState(initialQuery);
    const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
    const [pendingQuery, setPendingQuery] = useState<string | null>(null);
    const [pendingDiscoverySlug, setPendingDiscoverySlug] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<GlobalSearchOutcome>(() =>
        searchPlacesGlobal(index.places, initialQuery),
    );
    const [showSpinner, setShowSpinner] = useState(false);
    const [showSearchingText, setShowSearchingText] = useState(false);
    const [activeCitySlug, setActiveCitySlug] = useState<string | null>(null);
    const [activeCoords, setActiveCoords] = useState<{ lat: number; lng: number } | null>(null);
    const hasTriedAutoGeoRef = useRef(false);
    const [recentPlaces, setRecentPlaces] = useState<RecentPlaceVisit[]>([]);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        try {
            el.focus({ preventScroll: true });
        } catch {
            el.focus();
        }
        try {
            const end = el.value.length;
            el.setSelectionRange(end, end);
        } catch {}
    }, []);

    useEffect(() => {
        setRecentPlaces(readRecentPlaces());
    }, [pathname]);

    useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (e.key === RECENT_PLACES_STORAGE_KEY) {
                setRecentPlaces(readRecentPlaces());
            }
        }
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    useEffect(() => {
        setInputValue(initialQuery);
        setCommittedQuery(initialQuery);
        if (pendingQuery && pendingQuery.trim() === initialQuery.trim()) {
            setIsSubmittingSearch(false);
            setPendingQuery(null);
        }
    }, [initialQuery]);

    useEffect(() => {
        const sync = () => {
            const s = readSessionUserLocation();
            setActiveCitySlug(s?.citySlug ?? null);
            setActiveCoords(s ? { lat: s.lat, lng: s.lng } : null);
        };
        sync();
        window.addEventListener(LOCATION_CHANGED_EVENT, sync);
        return () => {
            window.removeEventListener(LOCATION_CHANGED_EVENT, sync);
        };
    }, []);

    useEffect(() => {
        const run = window.setTimeout(() => {
            const nextOutcome = searchPlacesGlobal(index.places, committedQuery, activeCoords ?? undefined);
            setOutcome(nextOutcome);
            if (pendingQuery && pendingQuery.trim() === committedQuery.trim()) {
                setIsSubmittingSearch(false);
                setPendingQuery(null);
            }
        }, 0);
        return () => {
            window.clearTimeout(run);
        };
    }, [index.places, committedQuery, pendingQuery, activeCoords]);

    const hasQuery = committedQuery.trim().length > 0;
    const inputEmpty = inputValue.trim().length === 0;
    const { places, usedFuzzyFallback } = outcome;
    const hasPendingSearch = inputValue.trim() !== committedQuery.trim();
    const normalizedQuery = committedQuery.trim();
    const isLoadingFeedback = isSubmittingSearch || isRoutePending;
    const resultsOpacityClass = isLoadingFeedback || hasPendingSearch ? "opacity-80" : "opacity-100";
    const pageMode: "empty_no_location" | "empty_with_location" | "results" = hasQuery
        ? "results"
        : activeCitySlug
          ? "empty_with_location"
          : "empty_no_location";

    function commitQuery(nextRaw: string) {
        const next = nextRaw.trim();
        if (next === committedQuery.trim()) return;
        setCommittedQuery(next);
        if (!next.length) {
            setIsSubmittingSearch(false);
            setPendingQuery(null);
            router.replace(pathname);
            return;
        }

        setIsSubmittingSearch(true);
        setPendingQuery(next);
        const encoded = encodeURIComponent(next);
        const href = `${pathname}?q=${encoded}`;
        startRouteTransition(() => {
            router.replace(href);
        });
    }

    function inferNearestCitySlug(lat: number, lng: number): string | null {
        const bestByCity = new Map<string, number>();
        for (const p of index.places) {
            if (p.latitude == null || p.longitude == null) continue;
            const d = haversineKm(lat, lng, Number(p.latitude), Number(p.longitude));
            const prev = bestByCity.get(p.city_slug);
            if (prev == null || d < prev) {
                bestByCity.set(p.city_slug, d);
            }
        }
        let bestCity: string | null = null;
        let bestDist = Number.POSITIVE_INFINITY;
        for (const [citySlug, dist] of bestByCity.entries()) {
            if (dist < bestDist) {
                bestDist = dist;
                bestCity = citySlug;
            }
        }
        return bestCity;
    }

    useEffect(() => {
        if (hasTriedAutoGeoRef.current) return;
        if (activeCoords) return;
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        hasTriedAutoGeoRef.current = true;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const citySlug = inferNearestCitySlug(latitude, longitude);
                if (!citySlug) return;
                saveSessionUserLocation({
                    lat: latitude,
                    lng: longitude,
                    citySlug,
                });
                dispatchSessionLocationChanged();
                setActiveCitySlug(citySlug);
                setActiveCoords({ lat: latitude, lng: longitude });
            },
            () => {
                clearSessionUserLocation();
                dispatchSessionLocationChanged();
                setActiveCitySlug(null);
                setActiveCoords(null);
            },
            { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 },
        );
    }, [activeCoords, index.places]);

    function discoveryClassName(categorySlug: string): string {
        const isPendingChip = isRoutePending && pendingDiscoverySlug === categorySlug;
        return `inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition-[color,background-color,border-color,transform] duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 ${
            isPendingChip
                ? "border-[#2EC4B6]/30 bg-[#2EC4B6]/10 text-[#0B2A3C]"
                : "border-black/10 bg-white text-gray-600 hover:border-black/20 hover:bg-gray-100/70 hover:text-gray-800 active:border-black/20 active:bg-gray-100"
        }`;
    }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = inputValue.trim();
            if (next === committedQuery.trim()) return;
            commitQuery(next);
        }, 250);

        return () => {
            window.clearTimeout(timer);
        };
    }, [inputValue, committedQuery, pathname, router]);

    useEffect(() => {
        if (!isLoadingFeedback) {
            setShowSpinner(false);
            setShowSearchingText(false);
            return;
        }

        const spinnerTimer = window.setTimeout(() => {
            setShowSpinner(true);
        }, 120);
        const textTimer = window.setTimeout(() => {
            setShowSearchingText(true);
        }, 250);

        return () => {
            window.clearTimeout(spinnerTimer);
            window.clearTimeout(textTimer);
        };
    }, [isLoadingFeedback]);

    const cityResults = useMemo(
        () => searchCitiesGlobal(index.cities, committedQuery),
        [index.cities, committedQuery],
    );
    const cityHubActive = pageMode === "results" && cityResults.length === 1;
    const primaryCitySlug = cityHubActive ? cityResults[0]!.slug : null;
    const primaryCityName = cityHubActive ? cityResults[0]!.name : "";

    const spotlightByCategory = useMemo(() => {
        if (!primaryCitySlug) return null;
        const slugs = CITY_HUB_CATEGORY_ROWS.map((row) => row.slug);
        return topPlacesPerCategoriesForCity(index.places, primaryCitySlug, slugs, 4);
    }, [index.places, primaryCitySlug]);

    // Orașul primului loc din rezultate (intenționat simplu pentru spotlight după „Locuri”).
    const contextCitySlug =
        pageMode === "results" && !cityHubActive && places.length > 0
            ? places[0]!.city_slug
            : null;

    const contextCityName = useMemo(() => {
        if (!contextCitySlug) return "";
        const c = index.cities.find((x) => x.slug === contextCitySlug);
        return c?.name ?? contextCitySlug;
    }, [contextCitySlug, index.cities]);

    const spotlightForContextCity = useMemo(() => {
        if (!contextCitySlug) return null;
        const slugs = CITY_HUB_CATEGORY_ROWS.map((row) => row.slug);
        return topPlacesPerCategoriesForCity(index.places, contextCitySlug, slugs, 4);
    }, [index.places, contextCitySlug]);

    const pillCitySlug = useMemo(() => {
        if (activeCitySlug) return activeCitySlug;
        if (cityHubActive && primaryCitySlug) return primaryCitySlug;
        if (contextCitySlug) return contextCitySlug;
        return null;
    }, [activeCitySlug, cityHubActive, primaryCitySlug, contextCitySlug]);

    const topDiscoveryCategories = useMemo((): DiscoveryCategoryChip[] => {
        if (pillCitySlug) {
            const dedup = new Map<string, DiscoveryCategoryChip>();
            for (const row of index.categories) {
                if (row.city_slug !== pillCitySlug) continue;
                dedup.set(row.category_slug, {
                    category_slug: row.category_slug,
                    category_name: row.category_name,
                });
            }
            return [...dedup.values()].sort((a, b) =>
                a.category_name.localeCompare(b.category_name, "ro"),
            );
        }
        const dedup = new Map<string, DiscoveryCategoryChip>();
        for (const row of index.categories) {
            if (!dedup.has(row.category_slug)) {
                dedup.set(row.category_slug, {
                    category_slug: row.category_slug,
                    category_name: row.category_name,
                });
            }
        }
        return [...dedup.values()].sort((a, b) =>
            a.category_name.localeCompare(b.category_name, "ro"),
        );
    }, [index.categories, pillCitySlug]);

    return (
        <>
            <h1 className="sr-only">Caută</h1>

            <div className="mx-auto mb-5 w-full max-w-2xl">
                <label htmlFor="global-search" className="sr-only">
                    Caută locații
                </label>
                <form
                    className="w-full"
                    onSubmit={(e) => {
                        e.preventDefault();
                        commitQuery(inputValue);
                    }}
                >
                    <SearchField
                        inputRef={inputRef}
                        id="global-search"
                        type="search"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Caută oraș, categorie sau locație..."
                        loading={showSpinner}
                        radius="xl"
                        variant="standalone"
                        aria-busy={showSpinner}
                    />
                </form>
                {showSpinner && showSearchingText ? (
                    <p className="mt-2 text-xs text-gray-400">Se caută...</p>
                ) : null}
            </div>

            <CautaDiscoveryPillsRow
                categories={topDiscoveryCategories}
                citySlug={pillCitySlug}
                disabled={isRoutePending}
                chipClassName={discoveryClassName}
                onSearchCategory={(label) => commitQuery(label)}
            />

            {pageMode === "results" ? (
                <div className={`transition-opacity duration-150 ${resultsOpacityClass}`}>
                    <p className="mx-auto mb-3 w-full max-w-2xl text-sm text-gray-500">
                        Rezultate pentru <span className="text-gray-600">„{normalizedQuery}”</span>
                    </p>

                    {!cityHubActive && places.length > 0 ? (
                        <section className="mx-auto mb-6 max-w-4xl" aria-labelledby="cauta-rez-locuri">
                            <h2 id="cauta-rez-locuri" className="mb-3 text-sm font-semibold text-gray-800">
                                Locuri
                            </h2>
                            <div className={`transition-opacity duration-150 ${resultsOpacityClass}`}>
                                {usedFuzzyFallback && (
                                    <p className="mb-3 text-center text-xs text-gray-500">
                                        Nu am găsit rezultate exacte. Îți arătăm cele mai apropiate
                                        potriviri.
                                    </p>
                                )}
                                <ul
                                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                                    role="list"
                                >
                                    {places.map((p) => {
                                        const ratingNum =
                                            typeof p.rating === "number" && Number.isFinite(p.rating)
                                                ? p.rating
                                                : undefined;
                                        return (
                                            <li key={`${p.city_slug}-${p.category_slug}-${p.place_id}`}>
                                                <PublicPlaceCard
                                                    place={{
                                                        id: p.place_id,
                                                        name: p.name,
                                                        image: p.image ?? "",
                                                        address: (p.address ?? "").trim(),
                                                        google_match_status:
                                                            p.google_match_status ?? null,
                                                        google_photo_uri: p.google_photo_uri ?? null,
                                                        ...(ratingNum != null && ratingNum > 0
                                                            ? { rating: ratingNum }
                                                            : {}),
                                                    }}
                                                    citySlug={p.city_slug}
                                                    categorySlug={p.category_slug}
                                                    activeFeatured={p.active_featured === true}
                                                    activePromoted={p.active_promoted === true}
                                                    distanceKm={
                                                        activeCoords && p.distanceKm != null
                                                            ? p.distanceKm
                                                            : undefined
                                                    }
                                                    href={`/orase/${p.city_slug}/${p.category_slug}/${p.place_id}`}
                                                    titleContent={highlightPlaceTitle(
                                                        p.name,
                                                        normalizedQuery,
                                                    )}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </section>
                    ) : null}

                    {!cityHubActive &&
                    contextCitySlug &&
                    contextCityName &&
                    spotlightForContextCity ? (
                        <section
                            className="mx-auto mb-6 max-w-4xl"
                            aria-labelledby="cauta-context-spotlight"
                        >
                            <CityResultHeader
                                citySlug={contextCitySlug}
                                cityDisplayName={contextCityName}
                            />
                            <CitySpotlightStrips
                                spotlightByCategory={spotlightForContextCity}
                                activeCoords={activeCoords}
                            />
                        </section>
                    ) : null}

                    {cityHubActive && primaryCitySlug && spotlightByCategory ? (
                        <section className="mx-auto mb-6 max-w-4xl" aria-labelledby="cauta-rez-orase">
                            <CityResultHeader
                                citySlug={primaryCitySlug}
                                cityDisplayName={primaryCityName}
                            />
                            <CitySpotlightStrips
                                spotlightByCategory={spotlightByCategory}
                                activeCoords={activeCoords}
                            />
                        </section>
                    ) : cityResults.length > 0 ? (
                        <section className="mx-auto mb-6 max-w-4xl" aria-labelledby="cauta-rez-orase">
                            <h2 id="cauta-rez-orase" className="mb-2 text-sm font-semibold text-gray-800">
                                Orașe
                            </h2>
                            <ul className="space-y-2" role="list">
                                {cityResults.map((c) => (
                                    <li key={c.slug}>
                                        <Link
                                            href={`/orase/${c.slug}`}
                                            className="block rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] text-[#0B2A3C] shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.99]"
                                        >
                                            {highlightPlaceTitle(c.name, normalizedQuery)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </div>
            ) : null}

            {pageMode === "empty_with_location" && activeCitySlug ? (
                <div className="mx-auto mt-1 max-w-lg">
                    <p className="text-center text-base font-medium tracking-tight text-gray-700">
                        În apropiere
                    </p>
                    {inputEmpty && recentPlaces.length > 0 ? (
                        <CautaRecentVisitedRow items={recentPlaces} disabled={isLoadingFeedback} />
                    ) : null}
                </div>
            ) : null}

            {pageMode === "empty_no_location" && inputEmpty && recentPlaces.length > 0 ? (
                <div className="mx-auto mt-1 max-w-lg">
                    <CautaRecentVisitedRow items={recentPlaces} disabled={isLoadingFeedback} />
                </div>
            ) : null}

            {pageMode === "results" &&
                cityResults.length === 0 &&
                places.length === 0 && (
                    <div
                        className={`mx-auto mt-2 max-w-lg transition-opacity duration-150 ${resultsOpacityClass}`}
                    >
                        <div className="rounded-2xl border border-black/10 bg-white px-4 py-5 text-center shadow-sm sm:px-5">
                            <p className="text-sm font-medium text-gray-800">
                                {`Nu am găsit rezultate pentru „${normalizedQuery}”.`}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                Încearcă un nume de oraș, o categorie sau o locație apropiată.
                            </p>
                        </div>
                    </div>
                )}

        </>
    );
}
