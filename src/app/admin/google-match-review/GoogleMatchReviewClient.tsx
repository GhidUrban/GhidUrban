"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { AdminGoogleMatchReviewRow } from "@/lib/place-repository";

type ApiOk<T> = { success: true; message: string; data: T };
type ApiFail = { success: false; message: string; data?: unknown };

type GoogleMatchReviewListData = {
    places?: AdminGoogleMatchReviewRow[];
    city_slugs?: string[];
    category_slugs?: string[];
};

export default function GoogleMatchReviewClient() {
    const [rows, setRows] = useState<AdminGoogleMatchReviewRow[]>([]);
    const [citySlugs, setCitySlugs] = useState<string[]>([]);
    const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
    const [actingKey, setActingKey] = useState<string | null>(null);

    const rowKey = (r: AdminGoogleMatchReviewRow) =>
        `${r.city_slug}-${r.category_slug}-${r.place_id}`;

    const load = useCallback(async () => {
        setListError("");
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) {
                params.set("search", search.trim());
            }
            if (selectedCity) {
                params.set("city_slug", selectedCity);
            }
            if (selectedCategory) {
                params.set("category_slug", selectedCategory);
            }
            const qs = params.toString();
            const url = qs
                ? `/api/admin/places/google-match-review?${qs}`
                : "/api/admin/places/google-match-review";

            const res = await fetch(url, {
                credentials: "include",
                cache: "no-store",
            });
            const json = (await res.json()) as ApiOk<GoogleMatchReviewListData> | ApiFail;
            if (res.status === 401 || !json.success) {
                setRows([]);
                setCitySlugs([]);
                setCategorySlugs([]);
                setListError(
                    !json.success && "message" in json ? json.message : "Nu ai acces sau a eșuat încărcarea.",
                );
                return;
            }
            const list = json.data?.places ?? [];
            setRows(list);
            setCitySlugs(json.data?.city_slugs ?? []);
            setCategorySlugs(json.data?.category_slugs ?? []);
        } catch {
            setListError("Nu s-a putut contacta serverul.");
            setRows([]);
            setCitySlugs([]);
            setCategorySlugs([]);
        } finally {
            setLoading(false);
        }
    }, [search, selectedCity, selectedCategory]);

    useEffect(() => {
        void load();
    }, [load]);

    async function handleAction(
        row: AdminGoogleMatchReviewRow,
        action: "matched" | "clear_match",
    ) {
        setFeedback(null);
        setActingKey(rowKey(row));
        try {
            const res = await fetch("/api/admin/places/google-match-review", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    place_id: row.place_id,
                    city_slug: row.city_slug,
                    category_slug: row.category_slug,
                    action,
                }),
            });
            const json = (await res.json()) as ApiOk<unknown> | ApiFail;
            if (!res.ok || !json.success) {
                setFeedback({
                    text: !json.success && "message" in json ? json.message : "Acțiunea a eșuat.",
                    ok: false,
                });
                return;
            }
            setFeedback({ text: json.message, ok: true });
            await load();
        } catch {
            setFeedback({ text: "Nu s-a putut contacta serverul.", ok: false });
        } finally {
            setActingKey(null);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Review Google (sync)</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Locuri cu <code className="rounded bg-gray-200 px-1">google_match_status = review</code>
                            . Aprobă ca matched sau golește legătura Google.
                        </p>
                    </div>
                    <Link
                        href="/admin"
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        ← Admin
                    </Link>
                </div>

                {feedback ? (
                    <div
                        className={`mb-4 rounded-md border px-3 py-2 text-sm ${
                            feedback.ok
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-red-200 bg-red-50 text-red-800"
                        }`}
                    >
                        {feedback.text}
                    </div>
                ) : null}

                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                    <div className="w-full min-w-0 lg:max-w-md lg:flex-1">
                        <input
                            type="text"
                            placeholder="Caută după nume…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:max-w-2xl lg:flex-1 lg:grid-cols-2">
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Toate orașele</option>
                            {citySlugs.map((city) => (
                                <option key={city} value={city}>
                                    {city}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Toate categoriile</option>
                            {categorySlugs.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setSearch("");
                            setSelectedCity("");
                            setSelectedCategory("");
                        }}
                        className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 transition hover:bg-red-100 lg:w-auto"
                    >
                        Resetează filtrele
                    </button>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-600">Se încarcă…</p>
                ) : listError ? (
                    <p className="text-sm text-red-700">{listError}</p>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-gray-600">
                        {search.trim() || selectedCity || selectedCategory
                            ? "Niciun rezultat pentru filtrele curente."
                            : "Niciun loc în review Google."}
                    </p>
                ) : (
                    <div className="space-y-4">
                        {rows.map((row) => {
                            const key = rowKey(row);
                            const busy = actingKey === key;
                            return (
                                <article
                                    key={key}
                                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                                        <div className="min-w-0 flex-1 space-y-1 text-sm text-gray-800">
                                            {row.conflict_check_failed ? (
                                                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">
                                                    Conflictul nu a putut fi verificat acum.
                                                </div>
                                            ) : null}
                                            {row.has_google_conflict === true && row.conflict ? (
                                                <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                                                    <p className="font-medium">
                                                        Acest Google place este deja legat de altă locație.
                                                    </p>
                                                    <p className="mt-1 text-xs text-red-800">
                                                        <span className="font-medium">{row.conflict.conflicting_name}</span>
                                                        <span className="text-red-700">
                                                            {" "}
                                                            · {row.conflict.conflicting_city_slug} /{" "}
                                                            {row.conflict.conflicting_category_slug}
                                                        </span>
                                                    </p>
                                                    {row.conflict.conflicting_address?.trim() ? (
                                                        <p className="mt-0.5 text-xs text-red-800">
                                                            Adresă: {row.conflict.conflicting_address}
                                                        </p>
                                                    ) : null}
                                                    <Link
                                                        href={`/admin/edit/${row.conflict.conflicting_place_id}`}
                                                        className="mt-2 inline-block text-xs font-medium text-red-950 underline"
                                                    >
                                                        Deschide locul canonic în editare
                                                    </Link>
                                                </div>
                                            ) : null}
                                            <p className="text-base font-semibold text-gray-900">{row.name}</p>
                                            <p>
                                                <span className="text-gray-500">Oraș:</span> {row.city_slug}{" "}
                                                <span className="text-gray-500">· Categorie:</span>{" "}
                                                {row.category_slug}
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Adresă:</span>{" "}
                                                {row.address?.trim() ? row.address : "—"}
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Scor match:</span>{" "}
                                                {row.google_match_score ?? "—"}
                                            </p>
                                            <p className="break-all">
                                                <span className="text-gray-500">google_place_id:</span>{" "}
                                                {row.google_place_id ?? "—"}
                                            </p>
                                            {row.google_maps_uri ? (
                                                <p>
                                                    <a
                                                        href={row.google_maps_uri}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 underline"
                                                    >
                                                        Deschide în Google Maps
                                                    </a>
                                                </p>
                                            ) : null}
                                            {row.google_photo_uri ? (
                                                <div className="relative pt-2">
                                                    <Image
                                                        src={row.google_photo_uri}
                                                        alt=""
                                                        width={320}
                                                        height={160}
                                                        unoptimized
                                                        className="max-h-40 w-auto max-w-xs rounded-md border border-gray-200 object-cover"
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                                            <Link
                                                href={`/admin/edit/${row.place_id}`}
                                                className="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Editează loc
                                            </Link>
                                            <button
                                                type="button"
                                                disabled={
                                                    busy ||
                                                    row.has_google_conflict === true ||
                                                    row.conflict_check_failed
                                                }
                                                title={
                                                    row.conflict_check_failed
                                                        ? "Verificarea conflictului a eșuat; nu aprobăm până nu știm sigur."
                                                        : row.has_google_conflict === true
                                                          ? "Rezolvă conflictul google_place_id înainte de matched."
                                                          : undefined
                                                }
                                                onClick={() => void handleAction(row, "matched")}
                                                className="inline-flex h-9 items-center justify-center rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {busy ? "…" : "Aprobă ca matched"}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => void handleAction(row, "clear_match")}
                                                className="inline-flex h-9 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                            >
                                                {busy ? "…" : "Golește legătura Google"}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
