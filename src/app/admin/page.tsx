"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminPlacesApiResponseData = {
    count: number;
    places: Array<{
        place_id: string;
        city_slug: string;
        category_slug: string;
        name: string;
        address: string | null;
        rating: number | null;
        status: string;
        featured?: boolean;
        featured_until?: string | null;
    }>;
    city_slugs: string[];
    category_slugs: string[];
};

type AdminPlacesResponse = {
    success: boolean;
    message: string;
    data: AdminPlacesApiResponseData | null;
};

export default function AdminPage() {
    const router = useRouter();
    const [places, setPlaces] = useState<AdminPlacesApiResponseData["places"]>([]);
    const [count, setCount] = useState(0);
    const [citySlugs, setCitySlugs] = useState<string[]>([]);
    const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
    const [hasError, setHasError] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [featuredTogglingId, setFeaturedTogglingId] = useState<string | null>(null);
    const [pendingReviewCount, setPendingReviewCount] = useState<number | null>(null);
    const [googleReviewCount, setGoogleReviewCount] = useState<number | null>(null);

    useEffect(() => {
        async function loadPendingSubmissionsCount() {
            try {
                const res = await fetch("/api/admin/submissions", {
                    credentials: "include",
                    cache: "no-store",
                });
                const json = (await res.json()) as {
                    success?: boolean;
                    data?: { count?: number };
                };
                if (res.ok && json.success && json.data && typeof json.data.count === "number") {
                    setPendingReviewCount(json.data.count);
                } else {
                    setPendingReviewCount(null);
                }
            } catch {
                setPendingReviewCount(null);
            }
        }
        async function loadGoogleReviewCount() {
            try {
                const res = await fetch("/api/admin/places/google-match-review", {
                    credentials: "include",
                    cache: "no-store",
                });
                const json = (await res.json()) as {
                    success?: boolean;
                    data?: { count?: number };
                };
                if (res.ok && json.success && json.data && typeof json.data.count === "number") {
                    setGoogleReviewCount(json.data.count);
                } else {
                    setGoogleReviewCount(null);
                }
            } catch {
                setGoogleReviewCount(null);
            }
        }
        void loadPendingSubmissionsCount();
        void loadGoogleReviewCount();
    }, []);

    useEffect(() => {
        async function loadPlaces() {
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
                const url = qs ? `/api/admin/places?${qs}` : "/api/admin/places";

                const response = await fetch(url, { cache: "no-store" });
                const json = (await response.json()) as AdminPlacesResponse;

                if (!response.ok || !json.success || !json.data) {
                    setHasError(true);
                    return;
                }

                setHasError(false);
                setPlaces(json.data.places);
                setCount(json.data.count);
                setCitySlugs(json.data.city_slugs ?? []);
                setCategorySlugs(json.data.category_slugs ?? []);
            } catch {
                setHasError(true);
            }
        }

        void loadPlaces();
    }, [search, selectedCity, selectedCategory]);

    function normalizeStatus(raw: string | undefined): "available" | "hidden" {
        return raw === "hidden" ? "hidden" : "available";
    }

    function isFeatured(raw: boolean | undefined): boolean {
        return raw === true;
    }

    function formatFeaturedUntil(iso: string | null | undefined): string {
        if (!iso) {
            return "-";
        }
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) {
            return "-";
        }
        return d.toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    async function handleToggleFeatured(
        place_id: string,
        city_slug: string,
        category_slug: string,
        currentlyFeatured: boolean | undefined
    ) {
        const next = !isFeatured(currentlyFeatured);
        setFeaturedTogglingId(place_id);

        try {
            const response = await fetch("/api/admin/places", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    place_id,
                    city_slug,
                    category_slug,
                    featured: next,
                    featured_only: true,
                }),
            });

            const json = await response.json();

            if (!response.ok || !json.success) {
                alert("Something went wrong");
                return;
            }

            setPlaces((prev) =>
                prev.map((p) =>
                    p.place_id === place_id ? { ...p, featured: next } : p
                )
            );
        } catch {
            alert("Something went wrong");
        } finally {
            setFeaturedTogglingId(null);
        }
    }

    async function handleToggleStatus(
        place_id: string,
        city_slug: string,
        category_slug: string,
        currentStatus: string | undefined
    ) {
        const next = normalizeStatus(currentStatus) === "hidden" ? "available" : "hidden";
        setTogglingId(place_id);

        try {
            const response = await fetch("/api/admin/places", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    place_id,
                    city_slug,
                    category_slug,
                    status: next,
                    status_only: true,
                }),
            });

            const json = await response.json();

            if (!response.ok || !json.success) {
                alert("Something went wrong");
                return;
            }

            setPlaces((prev) =>
                prev.map((p) =>
                    p.place_id === place_id ? { ...p, status: next } : p
                )
            );
        } catch {
            alert("Something went wrong");
        } finally {
            setTogglingId(null);
        }
    }

    async function handleDelete(place_id: string, city_slug: string, category_slug: string) {
        if (!confirm("Are you sure you want to delete this place?")) {
            return;
        }

        setDeletingId(place_id);

        try {
            const response = await fetch("/api/admin/places", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    place_id,
                    city_slug,
                    category_slug,
                }),
            });

            const json = await response.json();

            if (!response.ok || !json.success) {
                alert("Something went wrong");
                return;
            }

            alert("Completed successfully");
            window.location.reload();
        } catch {
            alert("Something went wrong");
        } finally {
            setDeletingId(null);
        }
    }

    async function handleLogout() {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
    }

    const cityOptions = citySlugs.length > 0 ? citySlugs : [];
    const categoryOptions = categorySlugs.length > 0 ? categorySlugs : [];

    const cereriVerificareLabel =
        pendingReviewCount === null
            ? "Cereri verificare"
            : `Cereri verificare (${pendingReviewCount})`;

    const reviewGoogleLabel =
        googleReviewCount === null ? "Review Google" : `Review Google (${googleReviewCount})`;

    if (hasError) {
        return (
            <main className="min-h-screen bg-gray-100 px-4 py-6">
                <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-3xl font-semibold text-gray-900">Admin panel</h1>
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            <Link
                                href="/admin/new"
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                                <span aria-hidden>+</span>
                                <span>Add place</span>
                            </Link>
                            <Link
                                href="/admin/import"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Import locații
                            </Link>
                            <Link
                                href="/admin/submissions"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-400 bg-gray-50 px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100"
                            >
                                {cereriVerificareLabel}
                            </Link>
                            <Link
                                href="/admin/google-match-review"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-950 transition hover:bg-amber-100"
                            >
                                {reviewGoogleLabel}
                            </Link>
                            <Link
                                href="/admin/cities"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Orașe
                            </Link>
                            <Link
                                href="/admin/categories"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Categorii
                            </Link>
                        </div>
                    </div>
                    <p className="mt-3 text-gray-600">Could not load places.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-3xl font-semibold text-gray-900">Admin panel</h1>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Link
                                href="/admin/new"
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                                <span aria-hidden>+</span>
                                <span>Add place</span>
                            </Link>
                            <Link
                                href="/admin/import"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Import locații
                            </Link>
                            <Link
                                href="/admin/submissions"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-400 bg-gray-50 px-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100"
                            >
                                {cereriVerificareLabel}
                            </Link>
                            <Link
                                href="/admin/google-match-review"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-950 transition hover:bg-amber-100"
                            >
                                {reviewGoogleLabel}
                            </Link>
                            <Link
                                href="/admin/cities"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Orașe
                            </Link>
                            <Link
                                href="/admin/categories"
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Categorii
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">Total places: {count}</p>
                </div>

                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                    <div className="w-full min-w-0 lg:max-w-md lg:flex-1">
                        <input
                            type="text"
                            placeholder="Search by name or address..."
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
                            <option value="">All cities</option>
                            {cityOptions.map((city) => (
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
                            <option value="">All categories</option>
                            {categoryOptions.map((category) => (
                                <option key={category} value={category}>
                                    {category}
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
                        Clear filters
                    </button>
                </div>
                <p className="mb-4 text-sm text-gray-500">
                    Search by name, city, category, or any combination.
                </p>

                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <table className="min-w-full text-left text-sm text-gray-700">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">City</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Address</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Featured</th>
                                <th className="px-4 py-3">Featured until</th>
                                <th className="min-w-[220px] px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {places.map((place) => (
                                <tr
                                    key={`${place.city_slug}-${place.category_slug}-${place.place_id}`}
                                    className="border-t border-gray-200"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900">{place.name}</td>
                                    <td className="px-4 py-3">{place.city_slug}</td>
                                    <td className="px-4 py-3">{place.category_slug}</td>
                                    <td className="px-4 py-3">{place.address ?? "-"}</td>
                                    <td className="px-4 py-3">
                                        {normalizeStatus(place.status) === "available" ? (
                                            <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
                                                available
                                            </span>
                                        ) : (
                                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200">
                                                hidden
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isFeatured(place.featured) ? (
                                            <span className="inline-flex rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-200">
                                                Featured
                                            </span>
                                        ) : (
                                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                                                Normal
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {place.featured_until
                                            ? formatFeaturedUntil(place.featured_until)
                                            : "-"}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex min-w-[200px] max-w-[280px] flex-col gap-2">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    disabled={togglingId === place.place_id}
                                                    onClick={() =>
                                                        handleToggleStatus(
                                                            place.place_id,
                                                            place.city_slug,
                                                            place.category_slug,
                                                            place.status
                                                        )
                                                    }
                                                    className={`inline-flex min-h-9 min-w-[7.5rem] flex-1 items-center justify-center rounded-md border px-3 text-sm font-medium transition sm:min-w-0 sm:flex-none ${
                                                        togglingId === place.place_id
                                                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
                                                            : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    {togglingId === place.place_id
                                                        ? "…"
                                                        : normalizeStatus(place.status) === "available"
                                                          ? "Ascunde"
                                                          : "Activează"}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={featuredTogglingId === place.place_id}
                                                    onClick={() =>
                                                        handleToggleFeatured(
                                                            place.place_id,
                                                            place.city_slug,
                                                            place.category_slug,
                                                            place.featured
                                                        )
                                                    }
                                                    className={`inline-flex min-h-9 min-w-[7.5rem] flex-1 items-center justify-center rounded-md border px-3 text-sm font-medium transition sm:min-w-0 sm:flex-none ${
                                                        featuredTogglingId === place.place_id
                                                            ? "cursor-not-allowed border-yellow-100 bg-yellow-50 text-yellow-400"
                                                            : "border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100"
                                                    }`}
                                                >
                                                    {featuredTogglingId === place.place_id
                                                        ? "…"
                                                        : isFeatured(place.featured)
                                                          ? "Scoate din featured"
                                                          : "Featurează"}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Link
                                                    href={`/admin/edit/${encodeURIComponent(place.place_id)}?city_slug=${encodeURIComponent(place.city_slug)}&category_slug=${encodeURIComponent(place.category_slug)}`}
                                                    className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700 sm:flex-none"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    disabled={deletingId === place.place_id}
                                                    onClick={() =>
                                                        handleDelete(
                                                            place.place_id,
                                                            place.city_slug,
                                                            place.category_slug
                                                        )
                                                    }
                                                    className={`inline-flex min-h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium transition sm:flex-none ${
                                                        deletingId === place.place_id
                                                            ? "cursor-not-allowed bg-gray-200 text-gray-500"
                                                            : "bg-red-600 text-white hover:bg-red-700"
                                                    }`}
                                                >
                                                    {deletingId === place.place_id ? "Deleting..." : "Delete"}
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {places.length === 0 && (
                    <p className="mt-4 text-sm text-gray-500">
                        No results found.
                    </p>
                )}
            </div>
        </main>
    );
}
