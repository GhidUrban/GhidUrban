"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
    success: boolean;
    message: string;
    data: null;
};

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage("");
        setLoading(true);

        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const json = (await response.json()) as LoginResponse;

            if (!response.ok || !json.success) {
                setErrorMessage(json.message || "Autentificare eșuată");
                setLoading(false);
                return;
            }

            router.push("/admin");
            router.refresh();
        } catch {
            setErrorMessage("Autentificare eșuată");
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-6">
            <div className="mx-auto mt-16 max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h1 className="text-3xl font-semibold text-gray-900">Admin Login</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Autentificare pentru panoul de administrare
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        className={`w-full rounded-md px-4 py-2 text-white ${
                            loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {loading ? "Se autentifică..." : "Intră în admin"}
                    </button>
                </form>
            </div>
        </main>
    );
}
