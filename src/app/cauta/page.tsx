import type { Metadata } from "next";
import {
    loadGlobalSearchIndex,
    type GlobalSearchIndex,
} from "@/lib/load-global-search-index";
import { PageShell } from "@/components/ui/PageShell";
import { GlobalSearchClient } from "./GlobalSearchClient";

export const metadata: Metadata = {
    title: "Caută | GhidUrban",
    description: "Caută orașe, categorii și locații în GhidUrban.",
};

export const revalidate = 120;

type CautaPageProps = {
    searchParams: Promise<{ q?: string | string[] }>;
};

function pickQueryParam(q: string | string[] | undefined): string {
    if (q === undefined) {
        return "";
    }
    const raw = Array.isArray(q) ? q[0] : q;
    if (typeof raw !== "string") {
        return "";
    }
    try {
        return decodeURIComponent(raw.replace(/\+/g, " ")).trim();
    } catch {
        return raw.trim();
    }
}

export default async function CautaPage({ searchParams }: CautaPageProps) {
    const sp = await searchParams;
    const initialQuery = pickQueryParam(sp.q);

    let index: GlobalSearchIndex = { cities: [], categories: [], places: [] };

    try {
        index = await loadGlobalSearchIndex();
    } catch (err) {
        console.error("[SearchIndex] load failed:", err);
        index = { cities: [], categories: [], places: [] };
    }

    return (
        <PageShell width="normal">
            <GlobalSearchClient
                index={index}
                initialQuery={initialQuery}
            />
        </PageShell>
    );
}
