"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";

import type { PlaceSubmissionRow } from "@/lib/place-submissions";

type ApiOk<T> = { success: true; message: string; data: T };
type ApiFail = { success: false; message: string; data?: unknown };

type EditFormState = {
    name: string;
    address: string;
    phone: string;
    website: string;
    description: string;
};

const emptyEditForm: EditFormState = {
    name: "",
    address: "",
    phone: "",
    website: "",
    description: "",
};

export default function SubmissionsReviewClient() {
    const [rows, setRows] = useState<PlaceSubmissionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
    const [actingId, setActingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);

    const load = useCallback(async () => {
        setListError("");
        setLoading(true);
        try {
            const res = await fetch("/api/admin/submissions", {
                credentials: "include",
                cache: "no-store",
            });
            const json = (await res.json()) as ApiOk<{ submissions: PlaceSubmissionRow[] }> | ApiFail;
            if (res.status === 401 || !json.success) {
                setRows([]);
                setListError(
                    !json.success && "message" in json ? json.message : "Nu ai acces sau a eșuat încărcarea.",
                );
                return;
            }
            if (!("data" in json) || !json.data?.submissions) {
                console.log(
                    "[admin/submissions] loaded pending submissions: 0 (missing data.submissions in response)",
                );
                setRows([]);
                return;
            }
            const list = json.data.submissions;
            console.log("[admin/submissions] loaded pending submissions:", list.length);
            setRows(list);
        } catch {
            setListError("Nu s-a putut contacta serverul.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function handleAction(id: string, action: "approve" | "reject") {
        setFeedback(null);
        setActingId(id);
        try {
            const res = await fetch("/api/admin/submissions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id, action }),
            });
            const json = (await res.json()) as
                | ApiOk<{ submission?: PlaceSubmissionRow; place_id?: string }>
                | ApiFail;
            if (!res.ok || !json.success) {
                setFeedback({
                    text:
                        !json.success && "message" in json ? json.message : "Acțiunea a eșuat.",
                    ok: false,
                });
                return;
            }
            let okText = json.message;
            if (
                action === "approve" &&
                json.data &&
                typeof json.data === "object" &&
                "place_id" in json.data &&
                typeof (json.data as { place_id?: string }).place_id === "string"
            ) {
                const pid = (json.data as { place_id: string }).place_id;
                okText = `${json.message} place_id: ${pid}`;
            }
            setFeedback({ text: okText, ok: true });
            await load();
        } catch {
            setFeedback({ text: "Nu s-a putut contacta serverul.", ok: false });
        } finally {
            setActingId(null);
        }
    }

    function setError(message: string) {
        setFeedback({ text: message, ok: false });
    }

    async function handleApproveWithEdits(id: string) {
        setFeedback(null);

        const name = editForm.name.trim();
        const phone = editForm.phone.trim();
        const address = editForm.address.trim();
        const website = editForm.website.trim();
        const description = editForm.description.trim();

        if (!name) {
            setError("name is required");
            return;
        }
        if (!phone) {
            setError("phone is required");
            return;
        }

        setActingId(id);
        try {
            const res = await fetch("/api/admin/submissions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({
                    id,
                    action: "approve",
                    overrides: {
                        name,
                        address,
                        phone,
                        website,
                        description,
                    },
                }),
            });
            const json = (await res.json()) as
                | ApiOk<{ submission?: PlaceSubmissionRow; place_id?: string }>
                | ApiFail;
            if (!res.ok || !json.success) {
                setError(
                    !json.success && "message" in json ? json.message : "Acțiunea a eșuat.",
                );
                return;
            }
            let okText = json.message;
            if (
                json.data &&
                typeof json.data === "object" &&
                "place_id" in json.data &&
                typeof (json.data as { place_id?: string }).place_id === "string"
            ) {
                const pid = (json.data as { place_id: string }).place_id;
                okText = `${json.message} place_id: ${pid}`;
            }
            setFeedback({ text: okText, ok: true });
            cancelEdit();
            await load();
        } catch {
            setError("Nu s-a putut contacta serverul.");
        } finally {
            setActingId(null);
        }
    }

    function cell(v: string | null | undefined): string {
        const t = v?.trim();
        return t ? t : "—";
    }

    function startEdit(submission: PlaceSubmissionRow) {
        setEditingId(submission.id);
        setEditForm({
            name: submission.name ?? "",
            address: submission.address ?? "",
            phone: submission.phone ?? "",
            website: submission.website ?? "",
            description: submission.description ?? "",
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditForm(emptyEditForm);
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto max-w-7xl">
                <Link
                    href="/admin"
                    className="mb-4 inline-block text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                    Înapoi la admin
                </Link>

                <h1 className="text-2xl font-semibold text-gray-900">Cereri locații</h1>
                <p className="mt-1 text-sm text-gray-600">Locații trimise spre verificare</p>

                {feedback ? (
                    <p
                        className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                            feedback.ok
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-red-200 bg-red-50 text-red-800"
                        }`}
                    >
                        {feedback.text}
                    </p>
                ) : null}

                <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {loading ? (
                        <p className="p-4 text-sm text-gray-600">Se încarcă…</p>
                    ) : listError ? (
                        <p className="p-4 text-sm text-red-700">{listError}</p>
                    ) : rows.length === 0 ? (
                        <p className="p-4 text-sm text-gray-600">Nu există cereri în așteptare.</p>
                    ) : (
                        <table className="min-w-full text-left text-sm text-gray-700">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-3 py-2">Nume</th>
                                    <th className="px-3 py-2">Oraș</th>
                                    <th className="px-3 py-2">Categorie</th>
                                    <th className="px-3 py-2">Adresă</th>
                                    <th className="px-3 py-2">Site</th>
                                    <th className="px-3 py-2">Telefon</th>
                                    <th className="px-3 py-2">De la</th>
                                    <th className="px-3 py-2">Email</th>
                                    <th className="px-3 py-2">Creat</th>
                                    <th className="px-3 py-2">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <Fragment key={r.id}>
                                        <tr className="border-t border-gray-200">
                                            <td className="px-3 py-2 align-top text-gray-900">{cell(r.name)}</td>
                                            <td className="px-3 py-2 align-top font-mono text-xs">{r.city_slug}</td>
                                            <td className="px-3 py-2 align-top font-mono text-xs">
                                                {r.category_slug}
                                            </td>
                                            <td className="max-w-[10rem] px-3 py-2 align-top break-words">
                                                {cell(r.address)}
                                            </td>
                                            <td className="max-w-[8rem] px-3 py-2 align-top break-all text-xs">
                                                {cell(r.website)}
                                            </td>
                                            <td className="px-3 py-2 align-top">{cell(r.phone)}</td>
                                            <td className="px-3 py-2 align-top">{cell(r.submitter_name)}</td>
                                            <td className="max-w-[8rem] px-3 py-2 align-top break-all text-xs">
                                                {cell(r.submitter_email)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-gray-600">
                                                {new Date(r.created_at).toLocaleString("ro-RO")}
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
                                                    <button
                                                        type="button"
                                                        disabled={editingId === r.id || actingId === r.id}
                                                        onClick={() => void handleAction(r.id, "approve")}
                                                        className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:bg-gray-400"
                                                    >
                                                        Aprobă
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={editingId === r.id || actingId === r.id}
                                                        onClick={() => void handleAction(r.id, "reject")}
                                                        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                                                    >
                                                        Respinge
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={editingId === r.id || actingId === r.id}
                                                        onClick={() => startEdit(r)}
                                                        className="rounded-md border border-gray-400 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                                                    >
                                                        Editează
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {editingId === r.id ? (
                                            <tr className="border-t border-gray-300 bg-gray-50">
                                                <td colSpan={10} className="px-3 py-4">
                                                    <div className="mx-auto max-w-2xl space-y-3 rounded-md border border-gray-300 bg-gray-50">
                                                        <p className="text-xs font-medium text-gray-600">
                                                            Editare locală (nu e salvată încă)
                                                        </p>
                                                        <div>
                                                            <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                                Nume
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={editForm.name}
                                                                onChange={(e) =>
                                                                    setEditForm((prev) => ({
                                                                        ...prev,
                                                                        name: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                                Adresă
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={editForm.address}
                                                                onChange={(e) =>
                                                                    setEditForm((prev) => ({
                                                                        ...prev,
                                                                        address: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                                Telefon
                                                            </label>
                                                            <input
                                                                type="tel"
                                                                value={editForm.phone}
                                                                onChange={(e) =>
                                                                    setEditForm((prev) => ({
                                                                        ...prev,
                                                                        phone: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                                Site web
                                                            </label>
                                                            <input
                                                                type="url"
                                                                value={editForm.website}
                                                                onChange={(e) =>
                                                                    setEditForm((prev) => ({
                                                                        ...prev,
                                                                        website: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-0.5 block text-xs font-medium text-gray-700">
                                                                Descriere
                                                            </label>
                                                            <textarea
                                                                value={editForm.description}
                                                                onChange={(e) =>
                                                                    setEditForm((prev) => ({
                                                                        ...prev,
                                                                        description: e.target.value,
                                                                    }))
                                                                }
                                                                rows={3}
                                                                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                                                            />
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                            <button
                                                                type="button"
                                                                onClick={cancelEdit}
                                                                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100"
                                                            >
                                                                Anulează
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={actingId === r.id}
                                                                onClick={() => void handleApproveWithEdits(r.id)}
                                                                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:bg-gray-400"
                                                            >
                                                                Salvează + aprobă
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </main>
    );
}
