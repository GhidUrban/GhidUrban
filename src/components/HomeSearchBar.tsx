"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { SearchField } from "@/components/ui/SearchField";
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
            <SearchField
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => prewarmGlobalSearchIndex()}
                onInput={() => prewarmGlobalSearchIndex()}
                placeholder="Caută un loc, categorie sau oraș..."
                disabled={showSpinner}
                loading={showSpinner}
                radius="2xl"
                variant="standalone"
                className="ring-1 ring-black/[0.06] focus-within:shadow-md"
            />
        </form>
    );
}
