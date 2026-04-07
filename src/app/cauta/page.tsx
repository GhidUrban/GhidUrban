import type { Metadata } from "next";
import {
    loadGlobalSearchIndex,
    type GlobalSearchIndex,
} from "@/lib/load-global-search-index";
import { GlobalSearchClient } from "./GlobalSearchClient";

export const metadata: Metadata = {
    title: "Caută | GhidUrban",
    description: "Caută orașe, categorii și locații în GhidUrban.",
};

export const revalidate = 120;

type CautaPageProps = {
    searchParams: Promise<{ q?: string | string[] }>;
};

export type CautaServerTiming = {
    indexLoadMs: number;
    totalServerMs: number;
    indexPlacesCount: number;
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
    const serverStart = Date.now();
    const sp = await searchParams;
    const initialQuery = pickQueryParam(sp.q);

    let index: GlobalSearchIndex = { cities: [], categories: [], places: [] };
    let indexLoadMs = 0;

    try {
        const indexStart = Date.now();
        index = await loadGlobalSearchIndex();
        indexLoadMs = Date.now() - indexStart;
    } catch {
        index = { cities: [], categories: [], places: [] };
    }

    const serverTiming: CautaServerTiming = {
        indexLoadMs,
        totalServerMs: Date.now() - serverStart,
        indexPlacesCount: index.places.length,
    };

    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-4xl px-4">
                <GlobalSearchClient
                    index={index}
                    initialQuery={initialQuery}
                    serverTiming={serverTiming}
                />
            </div>
        </main>
    );
}
