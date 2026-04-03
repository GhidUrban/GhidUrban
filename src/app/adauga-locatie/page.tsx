"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import Breadcrumb from "@/components/Breadcrumb";
import { slugToTitle } from "@/lib/slug";

type CityOption = { city_slug: string; city_name: string };
type CategoryOption = { category_slug: string; category_name: string };

type RequiredFieldKey =
    | "city_slug"
    | "category_slug"
    | "name"
    | "phone"
    | "submitter_name"
    | "submitter_email";

type FormState = {
    city_slug: string;
    category_slug: string;
    name: string;
    address: string;
    website: string;
    phone: string;
    description: string;
    maps_url: string;
    submitter_name: string;
    submitter_email: string;
};

const emptyForm: FormState = {
    city_slug: "",
    category_slug: "",
    name: "",
    address: "",
    website: "",
    phone: "",
    description: "",
    maps_url: "",
    submitter_name: "",
    submitter_email: "",
};

function cityLabel(c: CityOption): string {
    const n = c.city_name?.trim();
    return n || slugToTitle(c.city_slug);
}

function isValidEmail(value: string): boolean {
    const t = value.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export default function AdaugaLocatiePage() {
    const [cities, setCities] = useState<CityOption[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [citiesError, setCitiesError] = useState("");
    const [categoriesError, setCategoriesError] = useState("");
    const [form, setForm] = useState<FormState>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<RequiredFieldKey, string>>>({});

    const loadCities = useCallback(async () => {
        setCitiesError("");
        try {
            const res = await fetch("/api/cities");
            const json = (await res.json()) as {
                success?: boolean;
                data?: { cities?: CityOption[] };
                message?: string;
            };
            if (!res.ok || !json.success || !json.data?.cities) {
                setCities([]);
                setCitiesError(json.message || "Nu s-au putut încărca orașele.");
                return;
            }
            setCities(json.data.cities);
        } catch {
            setCities([]);
            setCitiesError("Nu s-a putut contacta serverul.");
        }
    }, []);

    const loadCategories = useCallback(async (city_slug: string) => {
        setCategoriesError("");
        setCategories([]);
        if (!city_slug) {
            setCategoriesLoading(false);
            return;
        }
        setCategoriesLoading(true);
        try {
            const res = await fetch(
                `/api/categories?city_slug=${encodeURIComponent(city_slug)}`,
            );
            const json = (await res.json()) as {
                success?: boolean;
                data?: { categories?: CategoryOption[] };
                message?: string;
            };
            if (!res.ok || !json.success || !json.data?.categories) {
                setCategoriesError(json.message || "Nu s-au putut încărca categoriile.");
                return;
            }
            setCategories(json.data.categories);
        } catch {
            setCategoriesError("Nu s-a putut contacta serverul.");
        } finally {
            setCategoriesLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadCities();
    }, [loadCities]);

    useEffect(() => {
        void loadCategories(form.city_slug);
    }, [form.city_slug, loadCategories]);

    function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => {
            const next = { ...prev, [key]: value };
            if (key === "city_slug") {
                next.category_slug = "";
            }
            return next;
        });
        setSubmitSuccess("");
        setSubmitError("");
        if (
            key === "city_slug" ||
            key === "category_slug" ||
            key === "name" ||
            key === "phone" ||
            key === "submitter_name" ||
            key === "submitter_email"
        ) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                if (key === "city_slug") {
                    delete next.city_slug;
                    delete next.category_slug;
                } else if (key === "category_slug") {
                    delete next.category_slug;
                } else if (key === "name") {
                    delete next.name;
                } else if (key === "phone") {
                    delete next.phone;
                } else if (key === "submitter_name") {
                    delete next.submitter_name;
                } else {
                    delete next.submitter_email;
                }
                return next;
            });
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitError("");
        setSubmitSuccess("");
        setFieldErrors({});
        const nextFieldErrors: Partial<Record<RequiredFieldKey, string>> = {};
        if (!form.city_slug) {
            nextFieldErrors.city_slug = "Selectează orașul.";
        }
        if (!form.category_slug) {
            nextFieldErrors.category_slug = "Selectează categoria.";
        }
        if (!form.name.trim()) {
            nextFieldErrors.name = "Introdu numele locației.";
        }
        if (!form.phone.trim()) {
            nextFieldErrors.phone = "Introdu numărul de telefon.";
        }
        if (!form.submitter_name.trim()) {
            nextFieldErrors.submitter_name = "Introdu numele tău.";
        }
        if (!form.submitter_email.trim()) {
            nextFieldErrors.submitter_email = "Introdu adresa de email.";
        } else if (!isValidEmail(form.submitter_email)) {
            nextFieldErrors.submitter_email = "Introdu un email valid.";
        }
        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                city_slug: form.city_slug,
                category_slug: form.category_slug,
                name: form.name.trim(),
                address: form.address.trim() || undefined,
                website: form.website.trim() || undefined,
                phone: form.phone.trim(),
                description: form.description.trim() || undefined,
                maps_url: form.maps_url.trim() || undefined,
                submitter_name: form.submitter_name.trim(),
                submitter_email: form.submitter_email.trim(),
            };
            console.log("[adauga-locatie] submit payload:", payload);

            const res = await fetch("/api/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = (await res.json()) as {
                success?: boolean;
                message?: string;
            };
            console.log("[adauga-locatie] response JSON:", json);
            if (!res.ok || !json.success) {
                setSubmitError(typeof json.message === "string" ? json.message : "");
                return;
            }
            setFieldErrors({});
            setSubmitSuccess(json.message || "Trimis cu succes.");
            setForm(emptyForm);
        } catch {
            setSubmitError("Nu s-a putut contacta serverul.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 py-6">
            <div className="mx-auto max-w-2xl px-4">
                <div className="mb-4">
                    <Breadcrumb
                        items={[
                            { label: "Acasă", href: "/" },
                            { label: "Adaugă o locație" },
                        ]}
                    />
                </div>
                <Link
                    href="/orase"
                    className="mb-4 inline-block text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                    ← Înapoi la orașe
                </Link>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold text-gray-900">Adaugă o locație</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Trimite o locație spre verificare. După aprobare, poate fi adăugată în
                        aplicație.
                    </p>

                    {citiesError ? (
                        <p className="mt-4 text-sm text-red-700">{citiesError}</p>
                    ) : null}

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Oraș
                            </label>
                            <select
                                value={form.city_slug}
                                onChange={(e) => updateField("city_slug", e.target.value)}
                                required
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">— Alege orașul —</option>
                                {cities.map((c) => (
                                    <option key={c.city_slug} value={c.city_slug}>
                                        {cityLabel(c)}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.city_slug ? (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.city_slug}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Categorie
                            </label>
                            <select
                                value={form.category_slug}
                                onChange={(e) => updateField("category_slug", e.target.value)}
                                required
                                disabled={!form.city_slug || categoriesLoading}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                <option value="">
                                    {!form.city_slug
                                        ? "Alege mai întâi orașul"
                                        : categoriesLoading
                                          ? "Se încarcă…"
                                          : "— Alege categoria —"}
                                </option>
                                {categories.map((c) => (
                                    <option key={c.category_slug} value={c.category_slug}>
                                        {c.category_name?.trim() || c.category_slug}
                                    </option>
                                ))}
                            </select>
                            {categoriesError ? (
                                <p className="mt-1 text-xs text-red-600">{categoriesError}</p>
                            ) : null}
                            {fieldErrors.category_slug ? (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.category_slug}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Nume locație
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => updateField("name", e.target.value)}
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="ex. Restaurant Casa Veche"
                            />
                            {fieldErrors.name ? (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Adresă
                            </label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={(e) => updateField("address", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Site web
                            </label>
                            <input
                                type="url"
                                value={form.website}
                                onChange={(e) => updateField("website", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="https://"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Telefon
                            </label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => updateField("phone", e.target.value)}
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            {fieldErrors.phone ? (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Descriere
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) => updateField("description", e.target.value)}
                                rows={4}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Link Google Maps
                            </label>
                            <input
                                type="url"
                                value={form.maps_url}
                                onChange={(e) => updateField("maps_url", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="https://maps.google.com/..."
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Numele tău
                            </label>
                            <input
                                type="text"
                                value={form.submitter_name}
                                onChange={(e) => updateField("submitter_name", e.target.value)}
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            {fieldErrors.submitter_name ? (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.submitter_name}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                type="email"
                                value={form.submitter_email}
                                onChange={(e) => updateField("submitter_email", e.target.value)}
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            {fieldErrors.submitter_email ? (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.submitter_email}</p>
                            ) : null}
                        </div>

                        {submitError ? (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {submitError}
                            </div>
                        ) : null}
                        {submitSuccess ? (
                            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                                {submitSuccess}
                            </div>
                        ) : null}

                        <button
                            type="submit"
                            disabled={submitting || cities.length === 0}
                            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                                submitting || cities.length === 0
                                    ? "bg-gray-400"
                                    : "bg-[#008fa8] hover:bg-[#007a90]"
                            }`}
                        >
                            {submitting ? "Se trimite…" : "Trimite spre verificare"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
