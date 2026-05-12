"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { accentAddPlaceCtaCompactClassName } from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
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
    searchCategoriesGlobal,
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
import { CITY_HUB_CATEGORY_ROWS, topPlacesPerCategoriesForCity } from "@/lib/city-search-spotlight";

/** Link compact la hub oraș — același stil pentru hub pe query și oraș contextual după Locuri. */
function CityChipLink({
    citySlug,
    cityDisplayName,
    highlightQuery,
}: {
    citySlug: string;
    cityDisplayName: string;
    highlightQuery?: string;
}) {
    return (
        <Link
            href={`/orase/${citySlug}`}
            className="mb-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.99]"
            aria-label={`${cityDisplayName} — vezi orașul`}
        >
            <span className="min-w-0 truncate font-medium text-[#0B2A3C]">
                {highlightQuery?.length
                    ? highlightPlaceTitle(cityDisplayName, highlightQuery)
                    : cityDisplayName}
            </span>
            <span className="shrink-0 text-xs font-medium text-[#008fa8]">Vezi</span>
        </Link>
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

/** Pills categorii pentru un oraș. */
function CityCategoryPillsSection({
    citySlug,
    cityName,
    categories,
}: {
    citySlug: string;
    cityName: string;
    categories: GlobalSearchCategory[];
}) {
    if (categories.length === 0) return null;
    return (
        <div className="mt-8 border-t border-black/10 pt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Explorează după categorie în {cityName}
            </h3>
            <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                    <Link
                        key={cat.category_slug}
                        href={`/orase/${citySlug}/${cat.category_slug}`}
                        className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-[#0B2A3C] shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.98]"
                    >
                        {cat.category_name}
                    </Link>
                ))}
            </div>
        </div>
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

    const quickSuggestions = [
        { label: "Cafenele", slug: "cafenele" },
        { label: "Restaurante", slug: "restaurante" },
        { label: "Cazare", slug: "cazare" },
    ] as const;

    function runDiscoveryShortcut(categorySlug: string) {
        if (!activeCitySlug) return;
        if (isRoutePending) return;
        setPendingDiscoverySlug(categorySlug);
        startRouteTransition(() => {
            router.push(`/orase/${activeCitySlug}/${categorySlug}`);
        });
    }

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
    const categoryResults = useMemo(
        () => searchCategoriesGlobal(index.categories, committedQuery),
        [index.categories, committedQuery],
    );

    const cityHubActive = pageMode === "results" && cityResults.length === 1;
    const primaryCitySlug = cityHubActive ? cityResults[0]!.slug : null;
    const primaryCityName = cityHubActive ? cityResults[0]!.name : "";

    const spotlightByCategory = useMemo(() => {
        if (!primaryCitySlug) return null;
        const slugs = CITY_HUB_CATEGORY_ROWS.map((row) => row.slug);
        return topPlacesPerCategoriesForCity(index.places, primaryCitySlug, slugs, 4);
    }, [index.places, primaryCitySlug]);

    const categoriesForHubCity = useMemo(() => {
        if (!primaryCitySlug) return [];
        const dedup = new Map<string, GlobalSearchCategory>();
        for (const row of index.categories) {
            if (row.city_slug !== primaryCitySlug) continue;
            dedup.set(row.category_slug, row);
        }
        return [...dedup.values()].sort((a, b) =>
            a.category_name.localeCompare(b.category_name, "ro"),
        );
    }, [index.categories, primaryCitySlug]);

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

    const categoriesForContextCity = useMemo(() => {
        if (!contextCitySlug) return [];
        const dedup = new Map<string, GlobalSearchCategory>();
        for (const row of index.categories) {
            if (row.city_slug !== contextCitySlug) continue;
            dedup.set(row.category_slug, row);
        }
        return [...dedup.values()].sort((a, b) =>
            a.category_name.localeCompare(b.category_name, "ro"),
        );
    }, [index.categories, contextCitySlug]);

    return (
        <>
            <header className="mb-4 min-w-0 space-y-3 sm:space-y-4">
                <div className="flex min-h-[32px] min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <Breadcrumb
                            items={[{ label: "Acasă", href: "/" }, { label: "Caută" }]}
                            muted
                        />
                    </div>
                </div>
                <h1 className="sr-only">Caută</h1>
            </header>

            <div className="mx-auto mb-4 w-full max-w-2xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label htmlFor="global-search" className="sr-only">
                        Caută locații
                    </label>
                    <form
                        className="min-w-0 w-full flex-1"
                        onSubmit={(e) => {
                            e.preventDefault();
                            commitQuery(inputValue);
                        }}
                    >
                        <div className="relative rounded-xl focus-within:ring-2 focus-within:ring-[#2EC4B6]/25">
                            <input
                                ref={inputRef}
                                id="global-search"
                                type="search"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Caută oraș, categorie sau locație..."
                                className="h-10 w-full appearance-none rounded-xl border border-black/10 bg-white px-4 pr-10 text-[15px] text-[#0B2A3C] caret-[#0B2A3C] outline-none shadow-none transition-colors duration-200 placeholder:text-gray-400 focus:border-black/10 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none md:text-sm"
                                autoComplete="off"
                                enterKeyHint="search"
                                aria-busy={showSpinner}
                            />
                            {showSpinner ? (
                                <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center">
                                    <span
                                        className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400/80 border-t-[#0B2A3C]"
                                        aria-hidden
                                    />
                                </span>
                            ) : null}
                        </div>
                    </form>
                    <Link
                        href="/adauga-locatie"
                        className={`${accentAddPlaceCtaCompactClassName} w-full justify-center sm:w-auto`}
                    >
                        Adaugă locație
                    </Link>
                </div>
                {showSpinner && showSearchingText ? (
                    <p className="mt-2 text-xs text-gray-400">Se caută...</p>
                ) : null}
            </div>

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
                            <h2
                                id="cauta-context-spotlight"
                                className="mb-2 text-sm font-semibold text-gray-800"
                            >
                                Top în {contextCityName}
                            </h2>
                            <CityChipLink
                                citySlug={contextCitySlug}
                                cityDisplayName={contextCityName}
                            />
                            <CitySpotlightStrips
                                spotlightByCategory={spotlightForContextCity}
                                activeCoords={activeCoords}
                            />
                            <CityCategoryPillsSection
                                citySlug={contextCitySlug}
                                cityName={contextCityName}
                                categories={categoriesForContextCity}
                            />
                        </section>
                    ) : null}

                    {cityHubActive && primaryCitySlug && spotlightByCategory ? (
                        <section className="mx-auto mb-6 max-w-4xl" aria-labelledby="cauta-rez-orase">
                            <h2 id="cauta-rez-orase" className="mb-2 text-sm font-semibold text-gray-800">
                                Oraș
                            </h2>
                            <CityChipLink
                                citySlug={primaryCitySlug}
                                cityDisplayName={primaryCityName}
                                highlightQuery={normalizedQuery}
                            />
                            <CitySpotlightStrips
                                spotlightByCategory={spotlightByCategory}
                                activeCoords={activeCoords}
                            />
                            <CityCategoryPillsSection
                                citySlug={primaryCitySlug}
                                cityName={primaryCityName}
                                categories={categoriesForHubCity}
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

                    {!cityHubActive && categoryResults.length > 0 ? (
                        <section className="mx-auto mb-6 max-w-4xl" aria-labelledby="cauta-rez-categorii">
                            <h2 id="cauta-rez-categorii" className="mb-2 text-sm font-semibold text-gray-800">
                                Categorii în oraș
                            </h2>
                            <ul className="space-y-2" role="list">
                                {categoryResults.map((row) => (
                                    <li key={`${row.city_slug}:${row.category_slug}`}>
                                        <Link
                                            href={`/orase/${row.city_slug}/${row.category_slug}`}
                                            className="flex flex-col gap-0.5 rounded-xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.99]"
                                        >
                                            <span className="text-[15px] font-medium text-[#0B2A3C]">
                                                {highlightPlaceTitle(row.category_name, normalizedQuery)}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {highlightPlaceTitle(row.city_name, normalizedQuery)}
                                            </span>
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
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        {quickSuggestions.map((suggestion) => (
                            <button
                                key={suggestion.slug}
                                type="button"
                                onClick={() => runDiscoveryShortcut(suggestion.slug)}
                                disabled={isRoutePending}
                                className={discoveryClassName(suggestion.slug)}
                            >
                                {suggestion.label}
                            </button>
                        ))}
                    </div>
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
                categoryResults.length === 0 &&
                places.length === 0 && (
                    <div className={`transition-opacity duration-150 ${resultsOpacityClass}`}>
                        <p className="text-center text-sm text-gray-500">
                            {`Nu am găsit rezultate pentru „${normalizedQuery}”.`}
                        </p>
                    </div>
                )}

        </>
    );
}
