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
    }>;
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
    const [hasError, setHasError] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        async function loadPlaces() {
            try {
                const response = await fetch("/api/admin/places");
                const json = (await response.json()) as AdminPlacesResponse;

                if (!response.ok || !json.success || !json.data) {
                    setHasError(true);
                    return;
                }

                setPlaces(json.data.places);
                setCount(json.data.count);
            } catch {
                setHasError(true);
            }
        }

        loadPlaces();
    }, []);

    async function handleDelete(place_id: string, city_slug: string, category_slug: string) {
        if (!confirm("Ești sigur că vrei să ștergi acest loc?")) {
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
                alert("A apărut o eroare");
                return;
            }

            alert("Operațiune realizată cu succes");
            window.location.reload();
        } catch {
            alert("A apărut o eroare");
        } finally {
            setDeletingId(null);
        }
    }

    async function handleLogout() {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
    }

    const cityOptions = Array.from(new Set(places.map((place) => place.city_slug))).sort();
    const categoryOptions = Array.from(new Set(places.map((place) => place.category_slug))).sort();

    const searchTokens = search
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const filteredPlaces = places.filter((place) => {
        const matchesCity = selectedCity ? place.city_slug === selectedCity : true;
        const matchesCategory = selectedCategory ? place.category_slug === selectedCategory : true;

        const haystack = [
            place.name,
            place.city_slug,
            place.category_slug,
            place.address ?? "",
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            searchTokens.length === 0
                ? true
                : searchTokens.every((token) => haystack.includes(token));

        return matchesCity && matchesCategory && matchesSearch;
    });

    if (hasError) {
        return (
            <main className="min-h-screen bg-gray-100 px-4 py-6">
                <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <h1 className="text-3xl font-semibold text-gray-900">Admin panel</h1>
                        <Link
                            href="/admin/new"
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                        >
                            <span>+</span>
                            <span>Adaugă loc</span>
                        </Link>
                    </div>
                    <p className="mt-3 text-gray-600">Nu am putut incarca locurile.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <h1 className="text-3xl font-semibold text-gray-900">Admin panel</h1>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/admin/new"
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                            >
                                <span>+</span>
                                <span>Adaugă loc</span>
                            </Link>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">Total locuri: {count}</p>
                </div>

                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="w-full md:max-w-md">
                        <input
                            type="text"
                            placeholder="Caută după nume sau adresă..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="w-full md:max-w-xs">
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Toate orașele</option>
                            {cityOptions.map((city) => (
                                <option key={city} value={city}>
                                    {city}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:max-w-xs">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Toate categoriile</option>
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
                        className="px-4 py-2 rounded-md text-sm font-medium border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition"
                    >
                        Resetează filtrele ✕
                    </button>
                </div>
                <p className="mb-4 text-sm text-gray-500">
                    Poți căuta după nume, oraș, categorie sau combinații între ele.
                </p>

                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <table className="min-w-full text-left text-sm text-gray-700">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Nume</th>
                                <th className="px-4 py-3">Oraș</th>
                                <th className="px-4 py-3">Categorie</th>
                                <th className="px-4 py-3">Adresă</th>
                                <th className="px-4 py-3">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlaces.map((place) => (
                                <tr key={place.place_id} className="border-t border-gray-200">
                                    <td className="px-4 py-3 font-medium text-gray-900">{place.name}</td>
                                    <td className="px-4 py-3">{place.city_slug}</td>
                                    <td className="px-4 py-3">{place.category_slug}</td>
                                    <td className="px-4 py-3">{place.address ?? "-"}</td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/admin/edit/${place.place_id}`}
                                            className="mr-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                                        >
                                            Editează
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
                                            className={`px-3 py-1 rounded-md text-sm ${
                                                deletingId === place.place_id
                                                    ? "bg-gray-300 text-gray-600"
                                                    : "bg-red-500 text-white hover:bg-red-600"
                                            }`}
                                        >
                                            {deletingId === place.place_id ? "Se șterge..." : "Șterge"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredPlaces.length === 0 && (
                    <p className="mt-4 text-sm text-gray-500">
                        Nu s-au găsit rezultate.
                    </p>
                )}
            </div>
        </main>
    );
}
