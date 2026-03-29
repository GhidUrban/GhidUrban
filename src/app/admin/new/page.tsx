"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminImageFieldThumb } from "@/components/AdminImageFieldThumb";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import { adminImagePreviewSrc } from "@/lib/admin-form-image-preview";
import {
    adminCitiesToSelectOptions,
    fetchAdminCitiesForSelect,
    type AdminCitySelectOption,
} from "@/lib/admin-load-cities";
import { uploadPlaceImageFile } from "@/lib/admin-upload-place-image";
import { isActiveFeatured } from "@/lib/is-active-featured";
import { placeIdSlugFromName } from "@/lib/slug";

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

const CATEGORY_OPTIONS = [
    { value: "", label: "Select category" },
    { value: "restaurante", label: "Restaurants" },
    { value: "cafenele", label: "Cafes" },
    { value: "institutii", label: "Institutions" },
    { value: "cultural", label: "Culture" },
    { value: "natura", label: "Nature" },
    { value: "evenimente", label: "Events" },
    { value: "cazare", label: "Accommodation" },
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
    status: "available" | "hidden";
    featured: boolean;
    featured_until: string;
};

const initialFormData: NewPlaceFormData = {
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

type MapsAutofillApiData = {
    name: string;
    address: string;
    website: string;
    phone: string;
    maps_url: string;
    schedule: string;
};

type MapsAutofillApiOk = { success: true; message: string; data: MapsAutofillApiData };
type MapsAutofillApiFail = { success: false; message: string; data?: unknown };

export default function NewAdminPlacePage() {
    const router = useRouter();
    const [formData, setFormData] = useState<NewPlaceFormData>(initialFormData);
    const [mapsUrlInput, setMapsUrlInput] = useState("");
    const [autofillLoading, setAutofillLoading] = useState(false);
    const [autofillNotice, setAutofillNotice] = useState<{
        tone: "ok" | "err";
        text: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUploadError, setImageUploadError] = useState("");
    // Refetch previews when upload overwrites the same Storage URL string.
    const [imagePreviewRevision, setImagePreviewRevision] = useState(0);
    const [citySelectOptions, setCitySelectOptions] = useState<AdminCitySelectOption[]>([
        { value: "", label: "Select city" },
    ]);

    useEffect(() => {
        let cancelled = false;
        fetchAdminCitiesForSelect().then((rows) => {
            if (!cancelled) {
                setCitySelectOptions(adminCitiesToSelectOptions(rows));
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleAutofillFromMaps() {
        setAutofillNotice(null);
        if (!formData.city_slug || !formData.category_slug) {
            alert("Select city and category first.");
            return;
        }
        const mapsUrl = mapsUrlInput.trim();
        if (!mapsUrl) {
            alert("Introdu un URL Google Maps.");
            return;
        }
        setAutofillLoading(true);
        try {
            const response = await fetch("/api/admin/places/autofill-from-maps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    maps_url: mapsUrl,
                    city_slug: formData.city_slug,
                }),
            });
            const json = (await response.json()) as MapsAutofillApiOk | MapsAutofillApiFail;
            if (!response.ok || !json.success || !("data" in json) || !json.data) {
                setAutofillNotice({
                    tone: "err",
                    text:
                        !json.success && "message" in json && json.message
                            ? json.message
                            : "Nu s-a putut completa formularul.",
                });
                return;
            }
            const d = json.data;
            const nameTrim = d.name.trim();
            const placeId = placeIdSlugFromName(nameTrim);
            setFormData((prev) => {
                const nextImage =
                    prev.city_slug && prev.category_slug && placeId
                        ? `/images/places/${prev.city_slug}/${prev.category_slug}/${placeId}.jpg`
                        : prev.image;
                return {
                    ...prev,
                    name: d.name.trim() || prev.name,
                    address: d.address.trim() || prev.address,
                    website: d.website.trim() || prev.website,
                    phone: d.phone.trim() || prev.phone,
                    maps_url: d.maps_url.trim() || prev.maps_url,
                    schedule: d.schedule.trim() || prev.schedule,
                    image: nextImage,
                    status: "available",
                    featured: false,
                    featured_until: "",
                };
            });
            setAutofillNotice({
                tone: "ok",
                text: "Datele au fost puse în formular; le poți edita înainte de Save.",
            });
        } catch {
            setAutofillNotice({ tone: "err", text: "Nu s-a putut contacta serverul." });
        } finally {
            setAutofillLoading(false);
        }
    }

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

        if (name === "image") {
            setImageUploadError("");
        }

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

        if (!formData.city_slug || !formData.category_slug) {
            setImageUploadError("Select city and category first.");
            return;
        }

        const draftPlaceId = placeIdSlugFromName(formData.name);
        if (!draftPlaceId) {
            setImageUploadError("Enter a name first (used to build the place id for the file path).");
            return;
        }

        setImageUploading(true);
        const result = await uploadPlaceImageFile({
            file,
            city_slug: formData.city_slug,
            category_slug: formData.category_slug,
            place_id: draftPlaceId,
        });
        setImageUploading(false);

        if (!result.ok) {
            setImageUploadError(result.message);
            return;
        }

        setFormData((current) => ({ ...current, image: result.publicUrl }));
        setImagePreviewRevision((n) => n + 1);
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

            const json = (await response.json()) as {
                success?: boolean;
                message?: string;
                data?: { reason?: string } | null;
            };

            if (!response.ok || !json.success) {
                let msg = json.message || "Could not save place.";
                const r = json.data?.reason;
                if (
                    response.status === 409 &&
                    r &&
                    (r === "external_place_id" || r === "place_id")
                ) {
                    msg = `${json.message} (${r})`;
                }
                setErrorMessage(msg);
                alert(msg);
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

    const imagePreviewSrc = useMemo(
        () => adminImagePreviewSrc(formData.image),
        [formData.image]
    );

    const previewPlace = useMemo(() => {
        return {
            id: "admin-preview-new",
            image: imagePreviewSrc,
            name: formData.name.trim() || "Nume locație",
            address: formData.address.trim() || "Adresă",
        };
    }, [formData.name, formData.address, imagePreviewSrc]);

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
                            <h1 className="text-3xl font-semibold text-gray-900">Add place</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Fill in the details for a new place
                            </p>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Completează automat din Google Maps
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Alege orașul și categoria, lipește linkul locului din Google Maps, apoi
                                completează formularul de mai jos (fără salvare automată).
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
                                        {citySelectOptions.map((c) => (
                                            <option key={c.value} value={c.value}>
                                                {c.label}
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
                                        Google Maps URL
                                    </label>
                                    <input
                                        type="text"
                                        value={mapsUrlInput}
                                        onChange={(e) => setMapsUrlInput(e.target.value)}
                                        placeholder="https://maps.google.com/... sau maps.app.goo.gl/..."
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            {autofillNotice ? (
                                <p
                                    className={`mt-2 text-xs ${
                                        autofillNotice.tone === "ok"
                                            ? "text-green-800"
                                            : "text-red-700"
                                    }`}
                                >
                                    {autofillNotice.text}
                                </p>
                            ) : null}
                            <button
                                type="button"
                                disabled={autofillLoading}
                                onClick={() => void handleAutofillFromMaps()}
                                className={`mt-3 rounded-md px-4 py-2 text-sm font-medium text-white transition ${
                                    autofillLoading
                                        ? "bg-gray-400"
                                        : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                {autofillLoading ? "Se încarcă…" : "Completează formularul"}
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
                            {formData.name.trim() ? (
                                <p className="mt-1 text-xs text-gray-600">
                                    Place ID (slug) when saved:{" "}
                                    <span className="font-mono text-gray-800">
                                        {placeIdSlugFromName(formData.name.trim())}
                                    </span>
                                </p>
                            ) : null}
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
                                placeholder="/images/places/baia-mare/restaurante/pressco.jpg"
                                value={formData.image}
                                onChange={handleChange}
                                autoComplete="off"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Path relative to <code className="rounded bg-gray-100 px-1">public</code> or a full URL. Empty saves the default placeholder.
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
                                <AdminImageFieldThumb
                                    imagePreviewSrc={imagePreviewSrc}
                                    imagePreviewRevision={imagePreviewRevision}
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
                                id="new-featured"
                                type="checkbox"
                                name="featured"
                                checked={formData.featured}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="new-featured" className="text-sm font-medium text-gray-700">
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
                        </div>
                    </div>

                    <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[340px]">
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-900">Public card preview</h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Updates as you type. Save when you are happy with it.
                            </p>
                            <div className="mt-4 max-w-sm">
                                <PublicPlaceCard
                                    key={`admin-card-${imagePreviewRevision}-${imagePreviewSrc}`}
                                    place={previewPlace}
                                    citySlug={previewCitySlug}
                                    categorySlug={previewCategorySlug}
                                    activeFeatured={previewActiveFeatured}
                                    statusLabel={formData.status}
                                />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
