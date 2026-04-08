"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import type { GlobalSearchIndex } from "@/lib/load-global-search-index";
import type { CautaServerTiming } from "./page";
import {
    readRecentPlaces,
    RECENT_PLACES_STORAGE_KEY,
    type RecentPlaceVisit,
} from "@/lib/cauta-recent-places";
import { highlightPlaceTitle } from "@/lib/highlight-place-title";
import {
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
import {
    LOCATION_PILL_ACTIVE,
    LOCATION_PILL_DOT,
    LOCATION_PILL_IDLE,
    LOCATION_PILL_LOADING,
    locationPillBaseClass,
} from "@/components/location-pill-style";
import { CautaRecentVisitedRow } from "@/components/CautaRecentVisitedRow";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";

export function GlobalSearchClient({
    index,
    initialQuery = "",
    serverTiming,
}: {
    index: GlobalSearchIndex;
    initialQuery?: string;
    serverTiming?: CautaServerTiming;
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
    const [geoBusy, setGeoBusy] = useState(false);
    const [recentPlaces, setRecentPlaces] = useState<RecentPlaceVisit[]>([]);
    const mountStartRef = useRef<number>(0);
    const searchCycleStartRef = useRef<number | null>(null);
    const lastSearchDurationRef = useRef<number | null>(null);
    const hasLoggedReadyForQueryRef = useRef<string>("");

    useEffect(() => {
        mountStartRef.current = performance.now();
        if (process.env.NODE_ENV !== "production") {
            console.log("[cauta/perf] mount", {
                initialQuery,
                indexPlaces: index.places.length,
                serverTiming,
            });
        }
        const el = inputRef.current;
        if (!el) return;
        try {
            el.focus({ preventScroll: true });
        } catch {
            el.focus();
        }
        // Place caret at the end after autofocus (safe for empty value too).
        try {
            const end = el.value.length;
            el.setSelectionRange(end, end);
        } catch {
            /* some mobile browsers may ignore selection APIs */
        }
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
        // URL query param is the source of truth for displayed results.
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
            const t0 = performance.now();
            const nextOutcome = searchPlacesGlobal(index.places, committedQuery, activeCoords ?? undefined);
            const searchMs = performance.now() - t0;
            lastSearchDurationRef.current = searchMs;
            if (process.env.NODE_ENV !== "production") {
                console.log("[cauta/perf] search", {
                    query: committedQuery,
                    searchMs: Number(searchMs.toFixed(2)),
                    resultCount: nextOutcome.places.length,
                    usedFuzzyFallback: nextOutcome.usedFuzzyFallback,
                    hasLocation: Boolean(activeCoords),
                });
            }
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
    const locationLabel = geoBusy
        ? "Se solicită..."
        : activeCitySlug
          ? "Dezactivează locația"
          : "Folosește locația mea";

    function commitQuery(nextRaw: string) {
        const next = nextRaw.trim();
        if (next === committedQuery.trim()) return;
        searchCycleStartRef.current = performance.now();
        setCommittedQuery(next);
        if (!next.length) {
            // Empty query should switch to empty mode immediately without search-loading feedback.
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

    function toggleLocation() {
        if (geoBusy) return;
        if (activeCitySlug) {
            clearSessionUserLocation();
            dispatchSessionLocationChanged();
            setActiveCitySlug(null);
            return;
        }
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        setGeoBusy(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const citySlug = inferNearestCitySlug(latitude, longitude);
                if (!citySlug) {
                    setGeoBusy(false);
                    return;
                }
                saveSessionUserLocation({
                    lat: latitude,
                    lng: longitude,
                    citySlug,
                });
                dispatchSessionLocationChanged();
                setActiveCitySlug(citySlug);
                setGeoBusy(false);
            },
            () => {
                setGeoBusy(false);
            },
            { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 },
        );
    }

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
        if (!hasQuery) {
            hasLoggedReadyForQueryRef.current = "";
            searchCycleStartRef.current = null;
            return;
        }
        if (isLoadingFeedback || hasPendingSearch) {
            return;
        }
        const queryKey = committedQuery.trim();
        if (!queryKey.length || hasLoggedReadyForQueryRef.current === queryKey) {
            return;
        }
        hasLoggedReadyForQueryRef.current = queryKey;
        const totalFromMountMs = performance.now() - mountStartRef.current;
        const totalFromSubmitMs =
            searchCycleStartRef.current != null
                ? performance.now() - searchCycleStartRef.current
                : null;

        if (process.env.NODE_ENV !== "production") {
            console.log("[cauta/perf] results-ready", {
                query: queryKey,
                totalFromMountMs: Number(totalFromMountMs.toFixed(2)),
                totalFromSubmitMs:
                    totalFromSubmitMs == null ? null : Number(totalFromSubmitMs.toFixed(2)),
                lastSearchMs:
                    lastSearchDurationRef.current == null
                        ? null
                        : Number(lastSearchDurationRef.current.toFixed(2)),
                resultCount: places.length,
            });
        }
        searchCycleStartRef.current = null;
    }, [committedQuery, hasPendingSearch, hasQuery, isLoadingFeedback, places.length]);

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

    return (
        <>
            <header className="mb-6 min-w-0 space-y-3 sm:space-y-4">
                <div className="flex min-h-[32px] min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <Breadcrumb
                            items={[{ label: "Acasă", href: "/" }, { label: "Caută" }]}
                            muted
                        />
                    </div>
                    <div className="m-0 flex shrink-0 items-center p-0">
                        <button
                            type="button"
                            onClick={toggleLocation}
                            disabled={geoBusy}
                            aria-busy={geoBusy}
                            aria-pressed={Boolean(activeCitySlug)}
                        className={`${locationPillBaseClass("compact")} ${geoBusy
                            ? LOCATION_PILL_LOADING
                            : activeCitySlug
                                ? LOCATION_PILL_ACTIVE
                                : LOCATION_PILL_IDLE}`}
                        >
                            {activeCitySlug ? (
                            <span className={LOCATION_PILL_DOT} aria-hidden />
                            ) : null}
                            {locationLabel}
                        </button>
                    </div>
                </div>
                <h1 className="text-center text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                    Caută
                </h1>
            </header>

            <div className="mx-auto mb-4 w-full max-w-lg">
                <label htmlFor="global-search" className="sr-only">
                    Caută locații
                </label>
                <form
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
                            className="w-full appearance-none rounded-xl border border-black/10 bg-white px-4 py-2.5 pr-10 text-[16px] text-[#0B2A3C] caret-[#0B2A3C] outline-none shadow-none transition-colors duration-200 placeholder:text-gray-400 focus:border-black/10 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none md:text-sm"
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
                {showSpinner && showSearchingText ? (
                    <p className="mt-1 text-xs text-gray-400">Se caută...</p>
                ) : null}
            </div>

            {pageMode === "results" ? (
                <p className="mx-auto mb-3 w-full max-w-lg text-sm text-gray-500">
                    Rezultate pentru <span className="text-gray-600">„{normalizedQuery}”</span>
                </p>
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

            {pageMode === "results" && places.length === 0 && (
                <div className={`transition-opacity duration-150 ${resultsOpacityClass}`}>
                    <p className="text-center text-sm text-gray-500">
                        {activeCoords
                            ? "Nu am găsit rezultate aproape de tine."
                            : `Nu am găsit rezultate pentru „${normalizedQuery}”.`}
                    </p>
                </div>
            )}

            {pageMode === "results" && places.length > 0 && (
                <div className={`mx-auto max-w-4xl transition-opacity duration-150 ${resultsOpacityClass}`}>
                    {usedFuzzyFallback && (
                        <p className="mb-3 text-center text-xs text-gray-500">
                            Nu am găsit rezultate exacte. Îți arătăm cele mai apropiate potriviri.
                        </p>
                    )}
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
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
                                            google_match_status: p.google_match_status ?? null,
                                            google_photo_uri: p.google_photo_uri ?? null,
                                            google_hours_raw: p.google_hours_raw ?? null,
                                            ...(ratingNum != null && ratingNum > 0
                                                ? { rating: ratingNum }
                                                : {}),
                                        }}
                                        citySlug={p.city_slug}
                                        categorySlug={p.category_slug}
                                        activeFeatured={p.active_featured === true}
                                        activePromoted={p.active_promoted === true}
                                        distanceKm={
                                            activeCoords && p.distanceKm != null ? p.distanceKm : undefined
                                        }
                                        href={`/orase/${p.city_slug}/${p.category_slug}/${p.place_id}`}
                                        titleContent={highlightPlaceTitle(p.name, normalizedQuery)}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </>
    );
}
