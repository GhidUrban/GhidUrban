"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getImageByCategory } from "@/lib/image";

const CITY_OPTIONS = [
    { value: "", label: "Selectează oraș" },
    { value: "baia-mare", label: "Baia Mare" },
    { value: "brasov", label: "Brașov" },
    { value: "bucuresti", label: "București" },
    { value: "cluj-napoca", label: "Cluj-Napoca" },
    { value: "oradea", label: "Oradea" },
    { value: "timisoara", label: "Timișoara" },
];

const CATEGORY_OPTIONS = [
    { value: "", label: "Selectează categoria" },
    { value: "restaurante", label: "Restaurante" },
    { value: "cafenele", label: "Cafenele" },
    { value: "institutii", label: "Instituții" },
    { value: "cultural", label: "Cultural" },
    { value: "natura", label: "Natură" },
    { value: "evenimente", label: "Evenimente" },
];

type NewPlaceFormData = {
    name: string;
    city_slug: string;
    category_slug: string;
    address: string;
    schedule: string;
    image: string;
    rating: string;
    phone: string;
    website: string;
    maps_url: string;
    description: string;
};

const initialFormData: NewPlaceFormData = {
    name: "",
    city_slug: "",
    category_slug: "",
    address: "",
    schedule: "",
    image: "/images/place-placeholder.jpg",
    rating: "",
    phone: "",
    website: "",
    maps_url: "",
    description: "",
};

export default function NewAdminPlacePage() {
    const router = useRouter();
    const [formData, setFormData] = useState<NewPlaceFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    function handleChange(
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value } = event.target;

        if (name === "category_slug") {
            setFormData((current) => ({
                ...current,
                category_slug: value,
                image: getImageByCategory(value),
            }));
            return;
        }

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setLoading(true);

        try {
            const response = await fetch("/api/admin/places", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...formData,
                }),
            });

            const json = await response.json();

            if (!response.ok || !json.success) {
                setErrorMessage(json.message || "Nu am putut salva locul.");
                alert("A apărut o eroare");
                return;
            }

            alert("Operațiune realizată cu succes");
            router.push("/admin");
            router.refresh();
        } catch {
            setErrorMessage("Nu am putut salva locul.");
            alert("A apărut o eroare");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto max-w-2xl">
                <Link
                    href="/admin"
                    className="mb-4 inline-block text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                    Înapoi
                </Link>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h1 className="text-3xl font-semibold text-gray-900">Adaugă loc</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Completează informațiile pentru un loc nou
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Nume
                            </label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Nume"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Oraș
                            </label>
                            <select
                                name="city_slug"
                                value={formData.city_slug}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                {CITY_OPTIONS.map((c) => (
                                    <option key={c.value} value={c.value}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Categorie
                            </label>
                            <select
                                name="category_slug"
                                value={formData.category_slug}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                {CATEGORY_OPTIONS.map((category) => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Adresă
                            </label>
                            <input
                                type="text"
                                name="address"
                                placeholder="Adresă"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Program
                            </label>
                            <textarea
                                name="schedule"
                                placeholder="Ex: L-V 09:00 - 18:00, S 10:00 - 14:00, D Închis"
                                value={formData.schedule}
                                onChange={handleChange}
                                rows={3}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Scrie programul simplu, într-o singură descriere.
                            </p>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Imagine
                            </label>
                            <select
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                disabled
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                <option value="/images/place-placeholder.jpg">Placeholder default</option>
                                <option value="/images/place-placeholder.jpg">Restaurant</option>
                                <option value="/images/place-placeholder.jpg">Cafenea</option>
                                <option value="/images/place-placeholder.jpg">Cultural</option>
                                <option value="/images/place-placeholder.jpg">Instituție</option>
                                <option value="/images/place-placeholder.jpg">Evenimente</option>
                            </select>
                            <p className="text-xs text-gray-500">
                                Imaginea se setează automat în funcție de categorie.
                            </p>
                            <div>
                                <img
                                    src={formData.image || getImageByCategory(formData.category_slug)}
                                    alt="Preview imagine"
                                    onError={(e) => {
                                        e.currentTarget.src = getImageByCategory(formData.category_slug);
                                    }}
                                    className="mt-3 h-24 w-full max-w-xs rounded-lg border border-gray-200 object-cover"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Rating
                            </label>
                            <select
                                name="rating"
                                value={formData.rating}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white"
                            >
                                <option value="">Selectează rating</option>
                                <option value="5">★★★★★ (5.0)</option>
                                <option value="4.5">★★★★☆ (4.5)</option>
                                <option value="4">★★★★☆ (4.0)</option>
                                <option value="3.5">★★★☆☆ (3.5)</option>
                                <option value="3">★★★☆☆ (3.0)</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Telefon
                            </label>
                            <input
                                type="text"
                                name="phone"
                                placeholder="Telefon"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Website
                            </label>
                            <input
                                type="text"
                                name="website"
                                placeholder="Website"
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Maps URL
                            </label>
                            <input
                                type="text"
                                name="maps_url"
                                placeholder="Maps URL"
                                value={formData.maps_url}
                                onChange={handleChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Descriere
                            </label>
                            <textarea
                                name="description"
                                placeholder="Descriere"
                                value={formData.description}
                                onChange={handleChange}
                                rows={5}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {errorMessage ? (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {errorMessage}
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 py-2 rounded-md text-white ${
                                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {loading ? "Se salvează..." : "Salvează"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
