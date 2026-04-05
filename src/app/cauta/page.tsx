import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
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
    } catch {
        index = { cities: [], categories: [], places: [] };
    }

    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-4xl px-4">
                <header className="mb-8 min-w-0 space-y-3 sm:space-y-4">
                    <Breadcrumb
                        items={[{ label: "Acasă", href: "/" }, { label: "Caută" }]}
                    />
                    <h1 className="text-center text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                        Caută
                    </h1>
                </header>

                <GlobalSearchClient index={index} initialQuery={initialQuery} />
            </div>
        </main>
    );
}
