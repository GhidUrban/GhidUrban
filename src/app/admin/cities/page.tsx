"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ROMANIAN_MAJOR_CITIES_ADMIN } from "@/lib/romanian-major-cities-admin";
import { placeIdSlugFromName } from "@/lib/slug";

type AdminCityRow = {
    slug: string;
    name: string;
    image: string | null;
    is_active: boolean;
    sort_order: number;
};

type CityDraft = AdminCityRow & { key_slug: string };

type ApiOk<T> = { success: true; message: string; data: T };
type ApiFail = { success: false; message: string; data?: unknown };

export default function AdminCitiesPage() {
    const [rows, setRows] = useState<CityDraft[]>([]);
    const [listError, setListError] = useState("");
    const [listLoading, setListLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);

    const [cityName, setCityName] = useState("");
    const [citySlug, setCitySlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [addPresetValue, setAddPresetValue] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState("");
    const [addSummary, setAddSummary] = useState<null | {
        city_slug: string;
        categories_created: number;
    }>(null);

    const loadCities = useCallback(async () => {
        setListError("");
        setListLoading(true);
        try {
            const response = await fetch("/api/admin/cities", { credentials: "include" });
            const json = (await response.json()) as ApiOk<{ cities: AdminCityRow[] }> | ApiFail;
            if (!response.ok || !json.success || !("data" in json) || !json.data?.cities) {
                setListError(
                    !json.success && "message" in json ? json.message : "Nu s-au putut încărca orașele.",
                );
                setRows([]);
                return;
            }
            setRows(
                json.data.cities.map((c) => ({
                    ...c,
                    key_slug: c.slug,
                })),
            );
        } catch {
            setListError("Nu s-a putut contacta serverul.");
            setRows([]);
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCities();
    }, [loadCities]);

    function updateRow(key_slug: string, patch: Partial<AdminCityRow>) {
        setRows((prev) =>
            prev.map((r) => (r.key_slug === key_slug ? { ...r, ...patch } : r)),
        );
    }

    async function saveRow(row: CityDraft) {
        setSavingKey(row.key_slug);
        setListError("");
        try {
            const response = await fetch("/api/admin/cities", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    city_slug: row.key_slug,
                    name: row.name,
                    slug: row.slug,
                    image: row.image ?? "",
                    is_active: row.is_active,
                    sort_order: row.sort_order,
                }),
            });
            const json = (await response.json()) as ApiOk<{ city_slug: string }> | ApiFail;
            if (!response.ok || !json.success) {
                alert(!json.success && "message" in json ? json.message : "Eroare la salvare.");
                return;
            }
            await loadCities();
        } catch {
            alert("Nu s-a putut contacta serverul.");
        } finally {
            setSavingKey(null);
        }
    }

    async function handleDeleteCity(citySlug: string) {
        if (
            !confirm(
                "Sigur vrei să ștergi acest oraș? Vor fi șterse și categoriile lui.",
            )
        ) {
            return;
        }

        setDeletingKey(citySlug);
        try {
            const response = await fetch(
                `/api/admin/cities?slug=${encodeURIComponent(citySlug)}`,
                { method: "DELETE", credentials: "include" },
            );
            const json = (await response.json()) as
                | { success: true; message: string }
                | ApiFail;

            if (!response.ok || !json.success) {
                alert(
                    !json.success && "message" in json && json.message
                        ? json.message
                        : "Nu s-a putut șterge orașul.",
                );
                return;
            }

            setRows((prev) => prev.filter((r) => r.key_slug !== citySlug));
        } catch {
            alert("Nu s-a putut contacta serverul.");
        } finally {
            setDeletingKey(null);
        }
    }

    function onNameChange(value: string) {
        setAddPresetValue("");
        setCityName(value);
        if (!slugTouched) {
            setCitySlug(placeIdSlugFromName(value));
        }
    }

    function onAddPresetSelect(value: string) {
        setAddPresetValue(value);
        if (!value) {
            return;
        }
        setCityName(value);
        if (!slugTouched) {
            setCitySlug(placeIdSlugFromName(value));
        }
    }

    async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setAddError("");
        setAddSummary(null);
        setAddLoading(true);

        try {
            const response = await fetch("/api/admin/cities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    name: cityName.trim(),
                    slug: citySlug.trim() || undefined,
                }),
            });

            const json = (await response.json()) as ApiOk<{
                city_slug?: string;
                categories_created?: number;
            }> | ApiFail;

            if (!response.ok || !json.success) {
                setAddError(
                    !json.success && "message" in json ? json.message : "Nu s-a putut crea orașul.",
                );
                return;
            }

            const data = "data" in json ? json.data : undefined;
            setAddSummary({
                city_slug: data?.city_slug ?? "",
                categories_created: data?.categories_created ?? 0,
            });
            setCityName("");
            setCitySlug("");
            setSlugTouched(false);
            setAddPresetValue("");
            await loadCities();
        } catch {
            setAddError("Nu s-a putut contacta serverul.");
        } finally {
            setAddLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto max-w-5xl">
                <Link
                    href="/admin"
                    className="mb-4 inline-block text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                    Back
                </Link>

                <h1 className="text-2xl font-semibold text-gray-900">Orașe</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Editează imaginea, ordinea și vizibilitatea. Schimbarea slug-ului actualizează și
                    locurile și categoriile legate.
                </p>

                <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {listLoading ? (
                        <p className="p-4 text-sm text-gray-600">Se încarcă…</p>
                    ) : listError ? (
                        <p className="p-4 text-sm text-red-700">{listError}</p>
                    ) : rows.length === 0 ? (
                        <p className="p-4 text-sm text-gray-600">Nu există orașe.</p>
                    ) : (
                        <table className="min-w-full text-left text-sm text-gray-700">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-3 py-2">Nume</th>
                                    <th className="px-3 py-2">Slug</th>
                                    <th className="px-3 py-2">Imagine (URL)</th>
                                    <th className="px-3 py-2">Activ</th>
                                    <th className="px-3 py-2">Ordine</th>
                                    <th className="px-3 py-2" />
                                    <th className="px-3 py-2">Ștergere</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.key_slug} className="border-t border-gray-200">
                                        <td className="px-3 py-2 align-top">
                                            <input
                                                type="text"
                                                value={row.name}
                                                onChange={(e) =>
                                                    updateRow(row.key_slug, { name: e.target.value })
                                                }
                                                className="w-36 min-w-[8rem] rounded-md border border-gray-300 px-2 py-1 text-gray-900 sm:w-44"
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <input
                                                type="text"
                                                value={row.slug}
                                                onChange={(e) =>
                                                    updateRow(row.key_slug, { slug: e.target.value })
                                                }
                                                className="w-32 min-w-[7rem] rounded-md border border-gray-300 px-2 py-1 font-mono text-xs text-gray-900 sm:w-40"
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <input
                                                type="text"
                                                value={row.image ?? ""}
                                                onChange={(e) =>
                                                    updateRow(row.key_slug, {
                                                        image: e.target.value || null,
                                                    })
                                                }
                                                placeholder="/images/..."
                                                className="w-44 min-w-[10rem] rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 sm:w-56"
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <input
                                                type="checkbox"
                                                checked={row.is_active}
                                                onChange={(e) =>
                                                    updateRow(row.key_slug, {
                                                        is_active: e.target.checked,
                                                    })
                                                }
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <input
                                                type="number"
                                                value={row.sort_order}
                                                onChange={(e) =>
                                                    updateRow(row.key_slug, {
                                                        sort_order: Number(e.target.value),
                                                    })
                                                }
                                                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-gray-900"
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <button
                                                type="button"
                                                disabled={savingKey === row.key_slug}
                                                onClick={() => void saveRow(row)}
                                                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                                                    savingKey === row.key_slug
                                                        ? "bg-gray-400"
                                                        : "bg-blue-600 hover:bg-blue-700"
                                                }`}
                                            >
                                                {savingKey === row.key_slug ? "…" : "Salvează"}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <button
                                                type="button"
                                                disabled={
                                                    deletingKey === row.key_slug ||
                                                    savingKey === row.key_slug
                                                }
                                                onClick={() => void handleDeleteCity(row.key_slug)}
                                                className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
                                            >
                                                {deletingKey === row.key_slug ? "…" : "Șterge"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <h2 className="mt-10 text-lg font-semibold text-gray-900">Adaugă oraș</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Se creează orașul și cele 6 categorii standard. Pentru import OSM, adaugă
                    coordonatele în <code className="rounded bg-gray-200 px-1">src/lib/import-cities.ts</code>.
                </p>

                <form
                    onSubmit={handleAddSubmit}
                    className="mt-4 max-w-lg space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Oraș din listă
                        </label>
                        <select
                            value={addPresetValue}
                            onChange={(e) => onAddPresetSelect(e.target.value)}
                            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">— Alege din listă —</option>
                            {ROMANIAN_MAJOR_CITIES_ADMIN.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            Sau scrie manual mai jos dacă orașul nu este în listă.
                        </p>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Nume oraș</label>
                        <input
                            type="text"
                            value={cityName}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder="ex. Sibiu"
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Slug (opțional)
                        </label>
                        <input
                            type="text"
                            value={citySlug}
                            onChange={(e) => {
                                setSlugTouched(true);
                                setCitySlug(e.target.value);
                            }}
                            placeholder="lăsați gol pentru generare automată"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {addError ? (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {addError}
                        </div>
                    ) : null}

                    {addSummary ? (
                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                            Oraș <span className="font-mono">{addSummary.city_slug}</span> creat.
                            Categorii adăugate: {addSummary.categories_created}.
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={addLoading}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                            addLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {addLoading ? "Se salvează…" : "Adaugă oraș"}
                    </button>
                </form>
            </div>
        </main>
    );
}
