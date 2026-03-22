"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import { uploadPlaceImageFile } from "@/lib/admin-upload-place-image";
import { isActiveFeatured } from "@/lib/is-active-featured";
import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";

function featuredUntilToIso(local: string): string | null {
    if (!local?.trim()) {
        return null;
    }
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) {
        return null;
    }
    return d.toISOString();
}

function isoToDatetimeLocalValue(iso: string | null | undefined): string {
    if (!iso) {
        return "";
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return "";
    }
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${day}T${h}:${mi}`;
}

function placeIdSlugFromName(rawName: string): string {
    return rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

const CITY_OPTIONS = [
    { value: "", label: "Select city" },
    { value: "baia-mare", label: "Baia Mare" },
    { value: "brasov", label: "Brașov" },
    { value: "bucuresti", label: "București" },
    { value: "cluj-napoca", label: "Cluj-Napoca" },
    { value: "oradea", label: "Oradea" },
    { value: "timisoara", label: "Timișoara" },
];

const CATEGORY_OPTIONS = [
    { value: "", label: "Select category" },
    { value: "restaurante", label: "Restaurants" },
    { value: "cafenele", label: "Cafes" },
    { value: "institutii", label: "Institutions" },
    { value: "cultural", label: "Culture" },
    { value: "natura", label: "Nature" },
    { value: "evenimente", label: "Events" },
];


type EditPlaceFormData = {
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
    status: "available" | "hidden";
    featured: boolean;
    featured_until: string;
};

type AdminPlaceDetailsResponse = {
    success: boolean;
    message: string;
    data: {
        place_id: string;
        city_slug: string;
        category_slug: string;
        name: string;
        description: string | null;
        address: string | null;
        schedule: string | null;
        image: string | null;
        rating: number | null;
        phone: string | null;
        website: string | null;
        maps_url: string | null;
        status?: string;
        featured?: boolean;
        featured_until?: string | null;
    } | null;
};

const initialFormData: EditPlaceFormData = {
    name: "",
    city_slug: "",
    category_slug: "",
    address: "",
    schedule: "",
    image: "",
    rating: "",
    phone: "",
    website: "",
    maps_url: "",
    description: "",
    status: "available",
    featured: false,
    featured_until: "",
};

type QuickImportDraft = {
    name: string;
    address: string;
    website: string;
    phone: string;
    maps_url: string;
};

const emptyQuickImport: QuickImportDraft = {
    name: "",
    address: "",
    website: "",
    phone: "",
    maps_url: "",
};

export default function EditAdminPlacePage() {
    const params = useParams<{ placeId: string }>();
    const router = useRouter();
    const placeId = typeof params.placeId === "string" ? params.placeId : "";

    const [formData, setFormData] = useState<EditPlaceFormData>(initialFormData);
    const [quickImport, setQuickImport] = useState<QuickImportDraft>(emptyQuickImport);
    const [isLoading, setIsLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUploadError, setImageUploadError] = useState("");

    function setQuickField<K extends keyof QuickImportDraft>(key: K, value: QuickImportDraft[K]) {
        setQuickImport((q) => ({ ...q, [key]: value }));
    }

    function applyQuickDraft() {
        if (!placeId) {
            alert("Could not read place id.");
            return;
        }
        if (!formData.city_slug || !formData.category_slug) {
            alert("Select city and category first.");
            return;
        }
        const name = quickImport.name.trim();
        if (!name) {
            alert("Enter a name in Import rapid.");
            return;
        }
        const address = quickImport.address.trim();
        if (!address) {
            alert("Enter an address in Import rapid.");
            return;
        }
        const imagePath = `/images/places/${formData.city_slug}/${formData.category_slug}/${placeId}.jpg`;
        setFormData((prev) => ({
            ...prev,
            name,
            address,
            website: quickImport.website.trim(),
            phone: quickImport.phone.trim(),
            maps_url: quickImport.maps_url.trim(),
            image: imagePath,
            status: "available",
            featured: false,
            featured_until: "",
        }));
    }

    useEffect(() => {
        async function loadPlace() {
            if (!placeId) {
                setErrorMessage("Could not load place.");
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/admin/places/${encodeURIComponent(placeId)}`);
                const json = (await response.json()) as AdminPlaceDetailsResponse;

                if (!response.ok || !json.success || !json.data) {
                    setErrorMessage("Could not load place.");
                    setIsLoading(false);
                    return;
                }

                setFormData({
                    name: json.data.name ?? "",
                    city_slug: json.data.city_slug ?? "",
                    category_slug: json.data.category_slug ?? "",
                    address: json.data.address ?? "",
                    schedule: json.data.schedule ?? "",
                    image: json.data.image?.trim() ?? "",
                    rating: json.data.rating ? String(json.data.rating) : "",
                    phone: json.data.phone ?? "",
                    website: json.data.website ?? "",
                    maps_url: json.data.maps_url ?? "",
                    description: json.data.description ?? "",
                    status: json.data.status === "hidden" ? "hidden" : "available",
                    featured: json.data.featured === true,
                    featured_until: isoToDatetimeLocalValue(json.data.featured_until),
                });
                setIsLoading(false);
            } catch {
                setErrorMessage("Could not load place.");
                setIsLoading(false);
            }
        }

        loadPlace();
    }, [placeId]);

    function handleChange(
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const target = event.target;

        if (target instanceof HTMLInputElement && target.type === "checkbox") {
            const { name, checked } = target;
            setFormData((current) => ({
                ...current,
                [name]: checked,
            }));
            return;
        }

        const { name, value } = target;

        if (name === "category_slug") {
            setFormData((current) => ({
                ...current,
                category_slug: value,
            }));
            return;
        }

        setFormData((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }

        setImageUploadError("");

        if (!placeId) {
            setImageUploadError("Missing place id.");
            return;
        }
        if (!formData.city_slug || !formData.category_slug) {
            setImageUploadError("Select city and category first.");
            return;
        }

        setImageUploading(true);
        const result = await uploadPlaceImageFile({
            file,
            city_slug: formData.city_slug,
            category_slug: formData.category_slug,
            place_id: placeId,
        });
        setImageUploading(false);

        if (!result.ok) {
            setImageUploadError(result.message);
            return;
        }

        setFormData((current) => ({ ...current, image: result.publicUrl }));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setLoading(true);

        try {
            const response = await fetch("/api/admin/places", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    place_id: placeId,
                    ...formData,
                }),
            });

            const json = await response.json();

            if (!response.ok || !json.success) {
                setErrorMessage(json.message || "Could not save place.");
                alert("Something went wrong");
                return;
            }

            alert("Completed successfully");
            router.push("/admin");
            router.refresh();
        } catch {
            setErrorMessage("Could not save place.");
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const previewPlace = useMemo(() => {
        const img = formData.image?.trim() || PLACE_IMAGE_PLACEHOLDER;
        return {
            id: placeId || "admin-preview-edit",
            image: img,
            name: formData.name.trim() || "Nume locație",
            address: formData.address.trim() || "Adresă",
        };
    }, [placeId, formData.name, formData.address, formData.image]);

    const previewActiveFeatured = useMemo(
        () =>
            isActiveFeatured({
                featured: formData.featured,
                featured_until: featuredUntilToIso(formData.featured_until),
            }),
        [formData.featured, formData.featured_until]
    );

    const previewCitySlug = formData.city_slug || "baia-mare";
    const previewCategorySlug = formData.category_slug || "restaurante";

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto max-w-6xl">
                <Link
                    href="/admin"
                    className="mb-4 inline-block text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                    Back
                </Link>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h1 className="text-3xl font-semibold text-gray-900">Edit place</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Update the details for this place
                            </p>

                            {isLoading ? (
                                <p className="mt-6 text-sm text-gray-600">Loading...</p>
                            ) : (
                                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
                                <h2 className="text-sm font-semibold text-gray-900">Import rapid</h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Choose city and category in this box, then fill the fields below. Draft overwrites
                                    matching fields; image path uses this place&apos;s id ({placeId}). Not saved until
                                    you press Save.
                                </p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            City
                                        </label>
                                        <select
                                            name="city_slug"
                                            value={formData.city_slug}
                                            onChange={handleChange}
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        >
                                            {CITY_OPTIONS.map((city) => (
                                                <option key={city.value} value={city.value}>
                                                    {city.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            Category
                                        </label>
                                        <select
                                            name="category_slug"
                                            value={formData.category_slug}
                                            onChange={handleChange}
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        >
                                            {CATEGORY_OPTIONS.map((category) => (
                                                <option key={category.value} value={category.value}>
                                                    {category.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={quickImport.name}
                                            onChange={(e) => setQuickField("name", e.target.value)}
                                            placeholder="e.g. Pressco Restaurant"
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            Address
                                        </label>
                                        <input
                                            type="text"
                                            value={quickImport.address}
                                            onChange={(e) => setQuickField("address", e.target.value)}
                                            placeholder="Street, city"
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            Website (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={quickImport.website}
                                            onChange={(e) => setQuickField("website", e.target.value)}
                                            placeholder="https://..."
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            Phone (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={quickImport.phone}
                                            onChange={(e) => setQuickField("phone", e.target.value)}
                                            placeholder="+40 ..."
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-xs font-medium text-gray-600">
                                            Google Maps URL (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={quickImport.maps_url}
                                            onChange={(e) => setQuickField("maps_url", e.target.value)}
                                            placeholder="https://maps.google.com/..."
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={applyQuickDraft}
                                    className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                >
                                    Generează draft
                                </button>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-600">
                                    Place ID (fixed):{" "}
                                    <span className="font-mono text-gray-800">{placeId || "—"}</span>
                                </p>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    placeholder="Address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Hours
                                </label>
                                <textarea
                                    name="schedule"
                                    placeholder="e.g. Mon–Fri 09:00–18:00, Sat 10:00–14:00, Sun closed"
                                    value={formData.schedule}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Enter opening hours as a single plain-text line.
                                </p>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Imagine
                                </label>
                                <input
                                    type="text"
                                    name="image"
                                    placeholder="/images/place-placeholder.jpg"
                                    value={formData.image}
                                    onChange={handleChange}
                                    autoComplete="off"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Local path under <code className="rounded bg-gray-100 px-1">public</code> or a full image URL. Leave empty to save the default placeholder when you Save.
                                </p>
                                <div className="mt-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Încarcă imagine
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        disabled={imageUploading}
                                        onChange={handleImageFileChange}
                                        className="block w-full max-w-xs text-sm text-gray-600 file:mr-2 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1"
                                    />
                                    {imageUploading ? (
                                        <p className="mt-1 text-xs text-gray-500">Uploading…</p>
                                    ) : null}
                                    {imageUploadError ? (
                                        <p className="mt-1 text-xs text-red-600">{imageUploadError}</p>
                                    ) : null}
                                </div>
                                <div className="mt-3">
                                    <img
                                        key={formData.image.trim() || PLACE_IMAGE_PLACEHOLDER}
                                        src={formData.image.trim() || PLACE_IMAGE_PLACEHOLDER}
                                        alt=""
                                        onError={(e) => {
                                            e.currentTarget.src = PLACE_IMAGE_PLACEHOLDER;
                                        }}
                                        className="h-28 w-full max-w-xs rounded-lg border border-gray-200 object-cover"
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
                                    <option value="">Select rating</option>
                                    <option value="5">★★★★★ (5.0)</option>
                                    <option value="4.5">★★★★☆ (4.5)</option>
                                    <option value="4">★★★★☆ (4.0)</option>
                                    <option value="3.5">★★★☆☆ (3.5)</option>
                                    <option value="3">★★★☆☆ (3.0)</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Phone
                                </label>
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="Phone"
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
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    placeholder="Description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={5}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="available">available</option>
                                    <option value="hidden">hidden</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="edit-featured"
                                    type="checkbox"
                                    name="featured"
                                    checked={formData.featured}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="edit-featured" className="text-sm font-medium text-gray-700">
                                    Featured listing
                                </label>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Featured until (optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    name="featured_until"
                                    value={formData.featured_until}
                                    onChange={handleChange}
                                    disabled={!formData.featured}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave empty for no expiry. Only applies when featured is on.
                                </p>
                            </div>

                            {errorMessage ? (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {errorMessage}
                                </div>
                            ) : null}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`rounded-md px-4 py-2 text-white ${
                                            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                                        }`}
                                    >
                                        {loading ? "Saving..." : "Save"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[340px]">
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-900">Public card preview</h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Updates as you type. Save when you are happy with it.
                            </p>
                            <div className="mt-4 max-w-sm">
                                {isLoading ? (
                                    <p className="text-sm text-gray-500">Loading preview…</p>
                                ) : (
                                    <PublicPlaceCard
                                        place={previewPlace}
                                        citySlug={previewCitySlug}
                                        categorySlug={previewCategorySlug}
                                        activeFeatured={previewActiveFeatured}
                                        statusLabel={formData.status}
                                    />
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
