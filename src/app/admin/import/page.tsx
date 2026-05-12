"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminCitiesForSelect, type AdminCitySelectRow } from "@/lib/admin-load-cities";
import { GOOGLE_IMPORT_PREVIEW_TOP_N } from "@/lib/google-import";
import { GOOGLE_IMPORT_SUPPORTED_CATEGORIES } from "@/lib/google-import-categories";
import type { GoogleImportCoverageRow } from "@/lib/place-repository";
import { IMPORT_CATEGORY_OSM_FILTERS } from "@/lib/import-categories";

type ImportDraftResult = {
    name: string;
    address: string;
    phone: string;
    website: string;
    schedule: string;
    maps_url: string;
    image: string;
    external_source: string;
    external_place_id: string;
    already_imported: boolean;
    completenessScore: number;
    likely_duplicate?: boolean;
    rating?: number | null;
};

type GoogleImportMeta = {
    strategy: string;
    raw_candidate_count: number;
    after_dedupe: number;
    after_location_filter: number;
    after_category_filters: number;
    after_scoring_sort: number;
    top_n: number;
    details_fetched: number;
};

const CATEGORY_LABELS: Record<string, string> = {
    restaurante: "Restaurante",
    cafenele: "Cafenele",
    natura: "Natură",
    cultural: "Cultură",
    institutii: "Instituții",
    cazare: "Cazare",
    baruri: "Baruri",
    spitale: "Spitale / clinică",
    fitness: "Fitness",
    "locuri-de-joaca": "Locuri de joacă",
    cinematografe: "Cinematografe",
    evenimente: "Evenimente",
};

function importQualityBadge(score: number): { label: string; className: string } {
    if (score >= 7) {
        return {
            label: "Bun",
            className:
                "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200",
        };
    }
    if (score >= 4) {
        return {
            label: "Mediu",
            className:
                "inline-flex rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-200",
        };
    }
    return {
        label: "Slab",
        className:
            "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200",
    };
}

export default function AdminImportPage() {
    const [importSource, setImportSource] = useState<"osm" | "google">("osm");
    const [citySlug, setCitySlug] = useState("");
    const [categorySlug, setCategorySlug] = useState("");
    const [results, setResults] = useState<ImportDraftResult[] | null>(null);
    const [googleMeta, setGoogleMeta] = useState<GoogleImportMeta | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState("");
    const [importSummary, setImportSummary] = useState<
        null | {
            inserted: number;
            merged: number;
            skipped: number;
            server_message: string;
            google_photos_max?: number;
            inserts_with_photo_ok?: number;
            inserts_photo_failed?: number;
        }
    >(null);
    const [uploadUpTo3Photos, setUploadUpTo3Photos] = useState(false);
    const [resultLimit, setResultLimit] = useState<20 | 50 | 100>(50);
    const [adminCityRows, setAdminCityRows] = useState<AdminCitySelectRow[]>([]);
    const [googleCoverageRows, setGoogleCoverageRows] = useState<GoogleImportCoverageRow[] | null>(
        null,
    );
    const [googleCoverageLoading, setGoogleCoverageLoading] = useState(false);
    const [googleCoverageError, setGoogleCoverageError] = useState("");

    useEffect(() => {
        let cancelled = false;
        fetchAdminCitiesForSelect().then((rows) => {
            if (!cancelled) {
                setAdminCityRows(rows);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (importSource !== "google") {
            return;
        }
        let cancelled = false;
        setGoogleCoverageLoading(true);
        setGoogleCoverageError("");
        void (async () => {
            try {
                const res = await fetch("/api/admin/import/google-coverage", {
                    credentials: "include",
                    cache: "no-store",
                });
                const json = (await res.json()) as {
                    success?: boolean;
                    message?: string;
                    data?: { rows?: GoogleImportCoverageRow[] };
                };
                if (cancelled) {
                    return;
                }
                if (!res.ok || !json.success) {
                    setGoogleCoverageRows(null);
                    setGoogleCoverageError(json.message || "Nu s-a putut încărca lista.");
                    return;
                }
                setGoogleCoverageRows(Array.isArray(json.data?.rows) ? json.data!.rows! : []);
            } catch {
                if (!cancelled) {
                    setGoogleCoverageRows(null);
                    setGoogleCoverageError("Nu s-a putut contacta serverul.");
                }
            } finally {
                if (!cancelled) {
                    setGoogleCoverageLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [importSource]);

    const cityOptions = useMemo(
        () =>
            adminCityRows.map((c) => ({
                value: c.slug,
                label: c.name?.trim() || c.slug,
            })),
        [adminCityRows],
    );

    const categoryOptions = useMemo(() => {
        if (importSource === "google") {
            return GOOGLE_IMPORT_SUPPORTED_CATEGORIES.map((slug) => ({
                value: slug,
                label: CATEGORY_LABELS[slug] ?? slug,
            }));
        }
        return Object.keys(IMPORT_CATEGORY_OSM_FILTERS).map((slug) => ({
            value: slug,
            label: CATEGORY_LABELS[slug] ?? slug,
        }));
    }, [importSource]);

    useEffect(() => {
        setResults(null);
        setGoogleMeta(null);
        setSelectedIds(new Set());
    }, [importSource]);

    const selectableCount = useMemo(
        () =>
            results?.filter((r) => !r.already_imported && !r.likely_duplicate).length ?? 0,
        [results]
    );

    const toggleOne = useCallback(
        (id: string, checked: boolean, alreadyImported: boolean, likelyDup?: boolean) => {
        if (alreadyImported || likelyDup) {
            return;
        }
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    },
    []
    );

    const selectAll = useCallback(() => {
        if (!results) {
            return;
        }
        setSelectedIds(
            new Set(
                results
                    .filter((r) => !r.already_imported && !r.likely_duplicate)
                    .map((r) => r.external_place_id)
            )
        );
    }, [results]);

    const deselectAll = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    function getSelectedResultItems(): Omit<ImportDraftResult, "already_imported" | "completenessScore">[] {
        if (!results) {
            return [];
        }
        return results
            .filter(
                (r) =>
                    selectedIds.has(r.external_place_id) &&
                    !r.already_imported &&
                    !r.likely_duplicate
            )
            .map(
                ({
                    already_imported: _a,
                    completenessScore: _c,
                    likely_duplicate: _l,
                    ...draft
                }) => draft
            );
    }

    async function handleImportSelected() {
        setImportError("");
        setImportSummary(null);

        if (!citySlug || !categorySlug) {
            setImportError("Selectează orașul și categoria.");
            return;
        }

        const selectedItems = getSelectedResultItems();
        if (selectedItems.length === 0) {
            setImportError("Selectează cel puțin o locație.");
            return;
        }

        setIsImporting(true);

        try {
            const response = await fetch("/api/admin/import/commit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    city_slug: citySlug,
                    category_slug: categorySlug,
                    items: selectedItems,
                    upload_up_to_3_photos: uploadUpTo3Photos,
                }),
            });

            const json = (await response.json()) as {
                success?: boolean;
                message?: string;
                data?: {
                    inserted?: number;
                    merged?: number;
                    skipped?: number;
                    google_photos_max?: number;
                    inserts_with_photo_ok?: number;
                    inserts_photo_failed?: number;
                    code?: string;
                    detail?: string;
                };
            };

            if (!response.ok || !json.success) {
                let err = json.message || "Importul a eșuat.";
                if (response.status === 401) {
                    err = json.message || "Sesiunea admin a expirat. Intră din nou.";
                }
                setImportError(err);
                return;
            }

            const inserted = json.data?.inserted ?? 0;
            const merged = json.data?.merged ?? 0;
            const skipped = json.data?.skipped ?? 0;
            setImportSummary({
                inserted,
                merged,
                skipped,
                server_message: json.message || "",
                google_photos_max: json.data?.google_photos_max,
                inserts_with_photo_ok: json.data?.inserts_with_photo_ok,
                inserts_photo_failed: json.data?.inserts_photo_failed,
            });
            setSelectedIds(new Set());
            setResults(null);
            setGoogleMeta(null);
        } catch {
            setImportError("Nu s-a putut contacta serverul.");
        } finally {
            setIsImporting(false);
        }
    }

    async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setImportError("");
        setImportSummary(null);
        if (!citySlug || !categorySlug) {
            setErrorMessage("Alege orașul și categoria.");
            return;
        }

        setLoading(true);
        setResults(null);
        setGoogleMeta(null);
        setSelectedIds(new Set());

        try {
            const isGoogle = importSource === "google";
            const response = await fetch(
                isGoogle ? "/api/admin/import/google/search" : "/api/admin/import/search",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        city_slug: citySlug,
                        category_slug: categorySlug,
                        ...(isGoogle ? {} : { result_limit: resultLimit }),
                    }),
                }
            );

            const json = (await response.json()) as {
                success?: boolean;
                message?: string;
                data?: ImportDraftResult[] | { items?: ImportDraftResult[]; meta?: GoogleImportMeta };
            };

            if (!response.ok || !json.success) {
                setErrorMessage(json.message || "Căutarea a eșuat.");
                return;
            }

            if (importSource === "google" && json.data && typeof json.data === "object" && !Array.isArray(json.data)) {
                const payload = json.data as { items?: ImportDraftResult[]; meta?: GoogleImportMeta };
                setGoogleMeta(payload.meta ?? null);
                const rawList = Array.isArray(payload.items) ? payload.items : [];
                const list: ImportDraftResult[] = rawList.map((r) => ({
                    ...(r as ImportDraftResult),
                    already_imported: Boolean((r as ImportDraftResult).already_imported),
                    completenessScore: Number((r as ImportDraftResult).completenessScore) || 0,
                    likely_duplicate: Boolean((r as ImportDraftResult).likely_duplicate),
                }));
                setResults(list);
            } else {
                const rawList = Array.isArray(json.data) ? json.data : [];
                const list: ImportDraftResult[] = rawList.map((r) => ({
                    ...(r as ImportDraftResult),
                    already_imported: Boolean((r as ImportDraftResult).already_imported),
                    completenessScore: Number((r as ImportDraftResult).completenessScore) || 0,
                }));
                setResults(list);
            }
        } catch {
            setErrorMessage("Nu s-a putut contacta serverul.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto max-w-6xl">
                <Link
                    href="/admin"
                    className="mb-4 inline-block text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                    Back
                </Link>

                <h1 className="text-2xl font-semibold text-gray-900">Import locații</h1>
                <p className="mt-1 text-sm text-gray-600">
                    OSM: date comunitare. Google: top {GOOGLE_IMPORT_PREVIEW_TOP_N} după scor (Places API New),
                    previzualizare înainte de salvare.
                </p>

                <div className="mb-4 mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                                importSource === "osm"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                            }`}
                            onClick={() => setImportSource("osm")}
                        >
                            OpenStreetMap
                        </button>
                        <button
                            type="button"
                            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                                importSource === "google"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                            }`}
                            onClick={() => setImportSource("google")}
                        >
                            Google (Top {GOOGLE_IMPORT_PREVIEW_TOP_N})
                        </button>
                    </div>
                    {importSource === "google" ? (
                        <p className="text-xs text-gray-600 sm:max-w-md">
                            Google import folosește mereu top {GOOGLE_IMPORT_PREVIEW_TOP_N} după scor (un apel
                            Place Details per rând).
                        </p>
                    ) : null}
                </div>

                {importSource === "google" ? (
                    <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-gray-800">
                        <p className="font-medium text-gray-900">Loturi mici, după acoperire</p>
                        <p className="mt-1 text-xs text-gray-600">
                            Categorii Google vs orașe din admin. Sortare: cele mai puține locuri
                            primele. Alege o combinație, apoi „Caută locații” (aceeași logică ca înainte).
                        </p>
                        {googleCoverageLoading ? (
                            <p className="mt-2 text-xs text-gray-500">Se încarcă acoperirea…</p>
                        ) : googleCoverageError ? (
                            <p className="mt-2 text-xs text-red-700">{googleCoverageError}</p>
                        ) : googleCoverageRows && googleCoverageRows.length > 0 ? (
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {googleCoverageRows.slice(0, 18).map((r) => {
                                    const active =
                                        citySlug === r.city_slug && categorySlug === r.category_slug;
                                    const catLabel = CATEGORY_LABELS[r.category_slug] ?? r.category_slug;
                                    const cityLabel = r.city_name?.trim() || r.city_slug;
                                    return (
                                        <li key={`${r.city_slug}-${r.category_slug}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCitySlug(r.city_slug);
                                                    setCategorySlug(r.category_slug);
                                                }}
                                                className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition ${
                                                    active
                                                        ? "border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-400"
                                                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                            >
                                                <span className="font-medium">{cityLabel}</span>
                                                <span className="text-gray-500"> · </span>
                                                <span>{catLabel}</span>
                                                <span className="ml-1 tabular-nums text-gray-500">
                                                    ({r.place_count})
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="mt-2 text-xs text-gray-500">Nu sunt date de acoperire.</p>
                        )}
                    </div>
                ) : null}

                <form
                    onSubmit={handleSearch}
                    className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:flex-wrap lg:items-end"
                >
                    <div className="min-w-[12rem] flex-1">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Oraș</label>
                        <select
                            value={citySlug}
                            onChange={(e) => setCitySlug(e.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        >
                            <option value="">Selectează orașul</option>
                            {cityOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-[12rem] flex-1">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Categorie</label>
                        <select
                            value={categorySlug}
                            onChange={(e) => setCategorySlug(e.target.value)}
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        >
                            <option value="">Selectează categoria</option>
                            {categoryOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {importSource === "osm" ? (
                        <div className="min-w-[8rem] flex-1 sm:max-w-[10rem]">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Max. rezultate
                            </label>
                            <select
                                value={resultLimit}
                                onChange={(e) =>
                                    setResultLimit(Number(e.target.value) as 20 | 50 | 100)
                                }
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    ) : null}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium text-white lg:self-end ${
                            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        Caută locații
                    </button>
                </form>

                {loading ? (
                    <p className="mt-6 text-sm text-gray-600">Se caută…</p>
                ) : null}

                {errorMessage ? (
                    <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                {!loading && results === null && !errorMessage ? (
                    <p className="mt-6 text-sm text-gray-500">
                        Alege orașul și categoria, apoi apasă „Caută locații”.
                    </p>
                ) : null}

                {!loading && results !== null && results.length === 0 && !errorMessage ? (
                    <p className="mt-6 text-sm text-gray-500">
                        Nu s-au găsit locații pentru filtrele alese.
                    </p>
                ) : null}

                {googleMeta && importSource === "google" ? (
                    <p className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                        Google: strategie {googleMeta.strategy} · brut (înainte dedupe) {googleMeta.raw_candidate_count}{" "}
                        · după dedupe {googleMeta.after_dedupe} · după filtru locație {googleMeta.after_location_filter}{" "}
                        · după filtre categorie {googleMeta.after_category_filters} · după scor (pool){" "}
                        {googleMeta.after_scoring_sort} · detalii API {googleMeta.details_fetched} · previzualizare{" "}
                        {googleMeta.top_n}
                    </p>
                ) : null}

                {results && results.length > 0 ? (
                    <div className="mt-8 space-y-4">
                        <p className="text-sm text-gray-600">
                            {importSource === "google"
                                ? "Rezultatele sunt sortate după scorul de import (relevantă, distanță, rating, date)."
                                : "Rezultatele sunt ordonate după completitudinea datelor."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={selectAll}
                                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Selectează tot
                            </button>
                            <button
                                type="button"
                                onClick={deselectAll}
                                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Deselectează tot
                            </button>
                            <span className="self-center text-sm text-gray-500">
                                {selectedIds.size} / {selectableCount} selectate (din {results.length} rezultate)
                            </span>
                        </div>

                        <ul className="list-none p-0">
                            {results.map((row) => {
                                const id = row.external_place_id;
                                const checked = selectedIds.has(id);
                                const imported = row.already_imported;
                                const dupHint = row.likely_duplicate === true;
                                const quality = importQualityBadge(row.completenessScore);
                                const thumbSrc =
                                    row.image?.trim() &&
                                    !row.image.includes("place-placeholder")
                                        ? row.image.trim()
                                        : null;
                                return (
                                    <li
                                        key={`${citySlug}-${categorySlug}-${id}`}
                                        className="border border-gray-200 rounded p-3 mb-3 bg-white"
                                    >
                                        <div className="flex gap-3">
                                            {thumbSrc ? (
                                                <img
                                                    src={thumbSrc}
                                                    alt={row.name || ""}
                                                    className="w-32 h-24 shrink-0 rounded object-cover"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                    }}
                                                />
                                            ) : null}
                                            <div className="min-w-0 flex-1 text-sm">
                                                <p className="font-semibold text-gray-900">{row.name || "—"}</p>
                                                <p className="mt-1 text-gray-600">
                                                    <span className="font-medium text-gray-700">Adresă: </span>
                                                    {row.address || "—"}
                                                </p>
                                                {row.rating != null && Number.isFinite(Number(row.rating)) ? (
                                                    <p className="mt-1 text-gray-600">
                                                        <span className="font-medium text-gray-700">Rating: </span>
                                                        {String(row.rating)}
                                                    </p>
                                                ) : null}
                                                {row.phone?.trim() ? (
                                                    <p className="mt-1 text-gray-600">
                                                        <span className="font-medium text-gray-700">Telefon: </span>
                                                        {row.phone}
                                                    </p>
                                                ) : null}
                                                {row.website?.trim() ? (
                                                    <p className="mt-1 text-gray-600">
                                                        <span className="font-medium text-gray-700">Site: </span>
                                                        <a
                                                            href={row.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 underline hover:text-blue-800"
                                                        >
                                                            {row.website}
                                                        </a>
                                                    </p>
                                                ) : null}
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    {imported ? (
                                                        <span className="inline-flex rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 ring-1 ring-inset ring-green-200">
                                                            Deja importat
                                                        </span>
                                                    ) : dupHint ? (
                                                        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
                                                            Posibil duplicat
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                                                            Nou
                                                        </span>
                                                    )}
                                                    <span className={quality.className}>{quality.label}</span>
                                                    <span className="text-xs font-medium text-gray-500 tabular-nums">
                                                        Scor: {row.completenessScore}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        disabled={imported || dupHint}
                                                        checked={checked}
                                                        onChange={(e) =>
                                                            toggleOne(
                                                                id,
                                                                e.target.checked,
                                                                imported,
                                                                dupHint,
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                        aria-label="Selectează pentru import"
                                                    />
                                                </div>
                                                <p className="mt-2 text-gray-600">
                                                    <span className="font-medium text-gray-700">Program: </span>
                                                    {row.schedule || "—"}
                                                </p>
                                                <p className="text-gray-600">
                                                    <span className="font-medium text-gray-700">Hărți: </span>
                                                    {row.maps_url ? (
                                                        <a
                                                            href={row.maps_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 underline hover:text-blue-800"
                                                        >
                                                            Deschide în Maps
                                                        </a>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    <span className="font-medium text-gray-600">Sursă: </span>
                                                    {row.external_source || "—"} ·{" "}
                                                    <span className="font-medium text-gray-600">ID: </span>
                                                    <span className="font-mono">{row.external_place_id}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="border-t border-gray-200 pt-4">
                            <label className="mb-2 flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                                <input
                                    type="checkbox"
                                    checked={uploadUpTo3Photos}
                                    onChange={(e) => setUploadUpTo3Photos(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>
                                    Încarcă <strong className="font-medium">până la 3 poze</strong> din Google în
                                    Supabase Storage. Debifat: cel mult{" "}
                                    <strong className="font-medium">1</strong> poză pentru fiecare loc nou (cu Google
                                    ID).
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={handleImportSelected}
                                disabled={isImporting}
                                className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                                    isImporting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                {isImporting ? "Import în curs..." : "Importă selectatele"}
                            </button>
                            {importError ? (
                                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {importError}
                                </div>
                            ) : null}
                            {importSummary ? (
                                <div className="mt-3 space-y-2 text-sm">
                                    <p className="text-green-900">{importSummary.server_message}</p>
                                    {(importSummary.inserts_photo_failed ?? 0) > 0 ? (
                                        <p className="text-amber-800">
                                            Unele locuri noi sunt salvate dar pozele nu au putut fi încărcate pentru
                                            toate; verifică cheia Google și bucket-ul Storage în mediu.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* --- Repara poze lipsa --- */}
            <FixMissingPhotosSection citiesForSelect={adminCityRows} />
        </main>
    );
}

/* ------------------------------------------------------------------ */
/* Sectiune separata: Repara poze lipsa                               */
/* ------------------------------------------------------------------ */

function FixMissingPhotosSection({ citiesForSelect }: { citiesForSelect: AdminCitySelectRow[] }) {
    const [citySlug, setCitySlug] = useState("");
    const [maxPhotos, setMaxPhotos] = useState(1);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFix = useCallback(async () => {
        setRunning(true);
        setResult(null);
        setError(null);
        try {
            const res = await fetch("/api/admin/fix-missing-photos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    city_slug: citySlug || undefined,
                    max_photos: maxPhotos,
                }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                setError(json.message ?? "Eroare necunoscuta.");
            } else {
                setResult(json.message);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Eroare de rețea.");
        } finally {
            setRunning(false);
        }
    }, [citySlug, maxPhotos]);

    return (
        <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h2 className="mb-2 text-base font-semibold text-amber-900">Repara poze lipsa</h2>
            <p className="mb-4 text-sm text-amber-800">
                Descarca poze din Google Places API pentru locurile care nu au imagine salvata in
                Supabase Storage (image_storage_path = null) dar au Google match.
            </p>

            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                        Oras (optional)
                    </label>
                    <select
                        value={citySlug}
                        onChange={(e) => setCitySlug(e.target.value)}
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    >
                        <option value="">Toate orasele</option>
                        {citiesForSelect.map((c) => (
                            <option key={c.slug} value={c.slug}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                        Poze / loc
                    </label>
                    <select
                        value={maxPhotos}
                        onChange={(e) => setMaxPhotos(Number(e.target.value))}
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                    </select>
                </div>

                <button
                    type="button"
                    onClick={handleFix}
                    disabled={running}
                    className={`h-9 rounded-md px-4 text-sm font-medium text-white ${
                        running ? "bg-gray-400" : "bg-amber-600 hover:bg-amber-700"
                    }`}
                >
                    {running ? "Se repara..." : "Repara pozele"}
                </button>
            </div>

            {error ? (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            ) : null}
            {result ? (
                <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    {result}
                </div>
            ) : null}
        </div>
    );
}
