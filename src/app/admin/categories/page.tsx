"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AdminCityRow = {
    slug: string;
    name: string;
    image: string | null;
    is_active: boolean;
    sort_order: number;
};

type AdminCategoryRow = {
    city_slug: string;
    category_slug: string;
    category_name: string;
    image: string | null;
    icon: string | null;
    is_active: boolean;
    sort_order: number;
};

type CategoryDraft = AdminCategoryRow & { key_category_slug: string };

type ApiOk<T> = { success: true; message: string; data: T };
type ApiFail = { success: false; message: string; data?: unknown };

export default function AdminCategoriesPage() {
    const [cities, setCities] = useState<AdminCityRow[]>([]);
    const [citySlug, setCitySlug] = useState("");
    const [citiesError, setCitiesError] = useState("");
    const [rows, setRows] = useState<CategoryDraft[]>([]);
    const [listError, setListError] = useState("");
    const [listLoading, setListLoading] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const loadCities = useCallback(async () => {
        setCitiesError("");
        try {
            const response = await fetch("/api/admin/cities", { credentials: "include" });
            const json = (await response.json()) as ApiOk<{ cities: AdminCityRow[] }> | ApiFail;
            if (!response.ok || !json.success || !("data" in json) || !json.data?.cities) {
                setCitiesError(
                    !json.success && "message" in json ? json.message : "Nu s-au putut încărca orașele.",
                );
                setCities([]);
                return;
            }
            const list = json.data.cities;
            setCities(list);
            setCitySlug((prev) => {
                if (prev) {
                    return prev;
                }
                return list[0]?.slug ?? "";
            });
        } catch {
            setCitiesError("Nu s-a putut contacta serverul.");
            setCities([]);
        }
    }, []);

    useEffect(() => {
        void loadCities();
    }, []);

    const loadCategories = useCallback(async (slug: string) => {
        if (!slug) {
            setRows([]);
            return;
        }
        setListError("");
        setListLoading(true);
        try {
            const response = await fetch(
                `/api/admin/categories?city_slug=${encodeURIComponent(slug)}`,
                { credentials: "include" },
            );
            const json = (await response.json()) as
                | ApiOk<{ categories: AdminCategoryRow[] }>
                | ApiFail;
            if (!response.ok || !json.success || !("data" in json) || !json.data?.categories) {
                setListError(
                    !json.success && "message" in json
                        ? json.message
                        : "Nu s-au putut încărca categoriile.",
                );
                setRows([]);
                return;
            }
            setRows(
                json.data.categories.map((c) => ({
                    ...c,
                    key_category_slug: c.category_slug,
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
        if (citySlug) {
            void loadCategories(citySlug);
        }
    }, [citySlug, loadCategories]);

    function updateRow(key: string, patch: Partial<AdminCategoryRow>) {
        setRows((prev) =>
            prev.map((r) => (r.key_category_slug === key ? { ...r, ...patch } : r)),
        );
    }

    async function saveRow(row: CategoryDraft) {
        const key = `${row.city_slug}:${row.key_category_slug}`;
        setSavingKey(key);
        setListError("");
        const slugChanged = row.category_slug !== row.key_category_slug;
        try {
            const body: Record<string, unknown> = {
                city_slug: row.city_slug,
                category_slug: row.key_category_slug,
                category_name: row.category_name,
                image: row.image ?? "",
                icon: row.icon ?? "",
                is_active: row.is_active,
                sort_order: row.sort_order,
            };
            if (slugChanged) {
                body.category_slug_new = row.category_slug;
            }
            const response = await fetch("/api/admin/categories", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            const json = (await response.json()) as
                | ApiOk<{ category_slug: string }>
                | ApiFail;
            if (!response.ok || !json.success) {
                alert(!json.success && "message" in json ? json.message : "Eroare la salvare.");
                return;
            }
            await loadCategories(row.city_slug);
        } catch {
            alert("Nu s-a putut contacta serverul.");
        } finally {
            setSavingKey(null);
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

                <h1 className="text-2xl font-semibold text-gray-900">Categorii</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Alege orașul, apoi editează nume, slug, imagine, iconiță (text sau emoji), activ și
                    ordine. Schimbarea slug-ului categoriei actualizează locurile din acea categorie.
                </p>

                {citiesError ? (
                    <p className="mt-4 text-sm text-red-700">{citiesError}</p>
                ) : (
                    <div className="mt-4">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Oraș</label>
                        <select
                            value={citySlug}
                            onChange={(e) => setCitySlug(e.target.value)}
                            className="h-10 max-w-md rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">— alege —</option>
                            {cities.map((c) => (
                                <option key={c.slug} value={c.slug}>
                                    {c.name} ({c.slug})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {!citySlug ? (
                        <p className="p-4 text-sm text-gray-600">Selectează un oraș.</p>
                    ) : listLoading ? (
                        <p className="p-4 text-sm text-gray-600">Se încarcă…</p>
                    ) : listError ? (
                        <p className="p-4 text-sm text-red-700">{listError}</p>
                    ) : rows.length === 0 ? (
                        <p className="p-4 text-sm text-gray-600">Nu există categorii pentru acest oraș.</p>
                    ) : (
                        <table className="min-w-full text-left text-sm text-gray-700">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-3 py-2">Nume</th>
                                    <th className="px-3 py-2">Slug</th>
                                    <th className="px-3 py-2">Imagine</th>
                                    <th className="px-3 py-2">Icon</th>
                                    <th className="px-3 py-2">Activ</th>
                                    <th className="px-3 py-2">Ordine</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const saveKey = `${row.city_slug}:${row.key_category_slug}`;
                                    return (
                                        <tr
                                            key={row.key_category_slug}
                                            className="border-t border-gray-200"
                                        >
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="text"
                                                    value={row.category_name}
                                                    onChange={(e) =>
                                                        updateRow(row.key_category_slug, {
                                                            category_name: e.target.value,
                                                        })
                                                    }
                                                    className="w-36 min-w-[8rem] rounded-md border border-gray-300 px-2 py-1 text-gray-900 sm:w-44"
                                                />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="text"
                                                    value={row.category_slug}
                                                    onChange={(e) =>
                                                        updateRow(row.key_category_slug, {
                                                            category_slug: e.target.value,
                                                        })
                                                    }
                                                    className="w-32 min-w-[7rem] rounded-md border border-gray-300 px-2 py-1 font-mono text-xs text-gray-900 sm:w-40"
                                                />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="text"
                                                    value={row.image ?? ""}
                                                    onChange={(e) =>
                                                        updateRow(row.key_category_slug, {
                                                            image: e.target.value || null,
                                                        })
                                                    }
                                                    placeholder="URL"
                                                    className="w-40 min-w-[9rem] rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900"
                                                />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="text"
                                                    value={row.icon ?? ""}
                                                    onChange={(e) =>
                                                        updateRow(row.key_category_slug, {
                                                            icon: e.target.value || null,
                                                        })
                                                    }
                                                    placeholder="emoji"
                                                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-gray-900"
                                                />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <input
                                                    type="checkbox"
                                                    checked={row.is_active}
                                                    onChange={(e) =>
                                                        updateRow(row.key_category_slug, {
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
                                                        updateRow(row.key_category_slug, {
                                                            sort_order: Number(e.target.value),
                                                        })
                                                    }
                                                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-gray-900"
                                                />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <button
                                                    type="button"
                                                    disabled={savingKey === saveKey}
                                                    onClick={() => void saveRow(row)}
                                                    className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                                                        savingKey === saveKey
                                                            ? "bg-gray-400"
                                                            : "bg-blue-600 hover:bg-blue-700"
                                                    }`}
                                                >
                                                    {savingKey === saveKey ? "…" : "Salvează"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </main>
    );
}
