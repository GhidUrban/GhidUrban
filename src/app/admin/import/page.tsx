"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { IMPORT_CATEGORY_OSM_FILTERS } from "@/lib/import-categories";
import { CITY_COORDINATES } from "@/lib/import-cities";

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
};

const CITY_LABELS: Record<string, string> = {
    "baia-mare": "Baia Mare",
    brasov: "Brașov",
    bucuresti: "București",
    "cluj-napoca": "Cluj-Napoca",
    oradea: "Oradea",
    timisoara: "Timișoara",
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
    const [citySlug, setCitySlug] = useState("");
    const [categorySlug, setCategorySlug] = useState("");
    const [results, setResults] = useState<ImportDraftResult[] | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState("");
    const [importSummary, setImportSummary] = useState<null | { inserted: number; skipped: number }>(
        null
    );
    const [resultLimit, setResultLimit] = useState<20 | 50 | 100>(50);

    const cityOptions = useMemo(
        () =>
            Object.keys(CITY_COORDINATES)
                .sort()
                .map((slug) => ({
                    value: slug,
                    label: CITY_LABELS[slug] ?? slug,
                })),
        []
    );

    const categoryOptions = useMemo(
        () =>
            Object.keys(IMPORT_CATEGORY_OSM_FILTERS).map((slug) => ({
                value: slug,
                label: CATEGORY_LABELS[slug] ?? slug,
            })),
        []
    );

    const selectableCount = useMemo(
        () => results?.filter((r) => !r.already_imported).length ?? 0,
        [results]
    );

    const toggleOne = useCallback((id: string, checked: boolean, alreadyImported: boolean) => {
        if (alreadyImported) {
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
    }, []);

    const selectAll = useCallback(() => {
        if (!results) {
            return;
        }
        setSelectedIds(
            new Set(
                results.filter((r) => !r.already_imported).map((r) => r.external_place_id)
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
            .filter((r) => selectedIds.has(r.external_place_id) && !r.already_imported)
            .map(({ already_imported: _a, completenessScore: _c, ...draft }) => draft);
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
                }),
            });

            const json = (await response.json()) as {
                success?: boolean;
                message?: string;
                data?: { inserted?: number; skipped?: number };
            };

            if (!response.ok || !json.success) {
                setImportError(json.message || "Importul a eșuat.");
                return;
            }

            const inserted = json.data?.inserted ?? 0;
            const skipped = json.data?.skipped ?? 0;
            setImportSummary({ inserted, skipped });
            setSelectedIds(new Set());
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
        setSelectedIds(new Set());

        try {
            const response = await fetch("/api/admin/import/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    city_slug: citySlug,
                    category_slug: categorySlug,
                    result_limit: resultLimit,
                }),
            });

            const json = (await response.json()) as {
                success?: boolean;
                message?: string;
                data?: ImportDraftResult[];
            };

            if (!response.ok || !json.success) {
                setErrorMessage(json.message || "Căutarea a eșuat.");
                return;
            }

            const rawList = Array.isArray(json.data) ? json.data : [];
            const list: ImportDraftResult[] = rawList.map((r) => ({
                ...(r as ImportDraftResult),
                already_imported: Boolean((r as ImportDraftResult).already_imported),
                completenessScore: Number((r as ImportDraftResult).completenessScore) || 0,
            }));
            setResults(list);
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

                <h1 className="text-2xl font-semibold text-gray-900">Import locații (OSM)</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Caută locații după oraș și categorie, bifează ce vrei să imporți mai târziu.
                </p>

                <form
                    onSubmit={handleSearch}
                    className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
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
                    <div className="min-w-[8rem]">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Max. rezultate</label>
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
                    <button
                        type="submit"
                        disabled={loading}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
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

                {results && results.length > 0 ? (
                    <div className="mt-8 space-y-4">
                        <p className="text-sm text-gray-600">
                            Rezultatele sunt ordonate după completitudinea datelor.
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

                        <ul className="space-y-3">
                            {results.map((row) => {
                                const id = row.external_place_id;
                                const checked = selectedIds.has(id);
                                const imported = row.already_imported;
                                const quality = importQualityBadge(row.completenessScore);
                                return (
                                    <li
                                        key={`${citySlug}-${categorySlug}-${id}`}
                                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex gap-3">
                                            <input
                                                type="checkbox"
                                                disabled={imported}
                                                checked={checked}
                                                onChange={(e) =>
                                                    toggleOne(id, e.target.checked, imported)
                                                }
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                            <div className="min-w-0 flex-1 space-y-1 text-sm">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-semibold text-gray-900">{row.name || "—"}</p>
                                                    {imported ? (
                                                        <span className="inline-flex rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 ring-1 ring-inset ring-green-200">
                                                            Deja importat
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
                                                <p className="text-gray-600">
                                                    <span className="font-medium text-gray-700">Adresă: </span>
                                                    {row.address || "—"}
                                                </p>
                                                <p className="text-gray-600">
                                                    <span className="font-medium text-gray-700">Telefon: </span>
                                                    {row.phone || "—"}
                                                </p>
                                                <p className="text-gray-600">
                                                    <span className="font-medium text-gray-700">Site: </span>
                                                    {row.website ? (
                                                        <a
                                                            href={row.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 underline hover:text-blue-800"
                                                        >
                                                            {row.website}
                                                        </a>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </p>
                                                <p className="text-gray-600">
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
                                <p className="mt-3 text-sm text-green-800">
                                    Import finalizat: {importSummary.inserted} adăugate, {importSummary.skipped}{" "}
                                    sărite.
                                </p>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        </main>
    );
}
