"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { GlobalSearchIndex } from "@/lib/load-global-search-index";
import { searchPlacesGlobal } from "@/lib/global-place-search";

export function GlobalSearchClient({
    index,
    initialQuery = "",
}: {
    index: GlobalSearchIndex;
    initialQuery?: string;
}) {
    const [searchTerm, setSearchTerm] = useState(initialQuery);

    useEffect(() => {
        setSearchTerm(initialQuery);
    }, [initialQuery]);

    const outcome = useMemo(
        () => searchPlacesGlobal(index.places, searchTerm),
        [index.places, searchTerm],
    );

    const hasQuery = searchTerm.trim().length > 0;
    const { places, usedFuzzyFallback } = outcome;

    return (
        <>
            <div className="mx-auto mb-8 w-full max-w-lg">
                <label htmlFor="global-search" className="sr-only">
                    Caută locații
                </label>
                <input
                    id="global-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Caută oraș, categorie sau locație..."
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors duration-200 placeholder:text-gray-400 focus:border-black/20 focus:ring-2 focus:ring-gray-300/30"
                    autoComplete="off"
                    enterKeyHint="search"
                />
            </div>

            {hasQuery && places.length === 0 && (
                <p className="text-center text-sm text-gray-500">Nu am găsit rezultate.</p>
            )}

            {hasQuery && places.length > 0 && (
                <div className="mx-auto max-w-lg">
                    {usedFuzzyFallback && (
                        <p className="mb-3 text-center text-xs text-gray-500">
                            Nu am găsit rezultate exacte. Îți arătăm cele mai apropiate potriviri.
                        </p>
                    )}
                    <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white">
                        {places.map((p) => (
                            <li key={`${p.city_slug}-${p.category_slug}-${p.place_id}`}>
                                <Link
                                    href={`/orase/${p.city_slug}/${p.category_slug}/${p.place_id}`}
                                    className="block px-3 py-2 text-sm text-gray-900 transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300/40"
                                >
                                    <span className="font-medium">{p.name}</span>
                                    <span className="mt-0.5 block text-xs text-gray-500">
                                        {p.category_name || p.category_slug} · {p.city_name}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}
