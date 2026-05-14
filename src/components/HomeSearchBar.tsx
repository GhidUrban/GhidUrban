"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { prewarmGlobalSearchIndex } from "@/lib/prewarm-global-search-client";

export function HomeSearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [isPending, startTransition] = useTransition();

    const submit = useCallback(() => {
        const q = query.trim();
        if (!q) return;
        prewarmGlobalSearchIndex();
        startTransition(() => {
            router.push(`/cauta?q=${encodeURIComponent(q)}`);
        });
    }, [query, router]);

    const showSpinner = isPending;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                submit();
            }}
            aria-busy={showSpinner}
            className="min-w-0 w-full flex-1"
        >
            <div className="relative">
                <svg
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => prewarmGlobalSearchIndex()}
                    onInput={() => prewarmGlobalSearchIndex()}
                    placeholder="Caută un loc, categorie sau oraș..."
                    disabled={showSpinner}
                    className="h-11 w-full rounded-2xl border-0 bg-white pl-10 pr-10 text-[14px] text-gray-800 shadow-sm ring-1 ring-black/[0.06] outline-none transition-all placeholder:text-gray-400 focus:shadow-md focus:ring-2 focus:ring-indigo-400/30 enabled:opacity-100 sm:text-[15px] disabled:opacity-90"
                />
                {showSpinner ? (
                    <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center">
                        <span
                            className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-400"
                            aria-hidden
                        />
                    </span>
                ) : null}
            </div>
        </form>
    );
}
