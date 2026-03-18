import { headers } from "next/headers";

type ApiResponseEnvelope<T> = {
    success: boolean;
    message: string;
    data: T;
};

type ApiGetResult<T> = {
    status: number;
    success: boolean;
    message: string;
    data: T | null;
};

function getFallbackBaseUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function apiGet<T>(
    path: string,
    query: Record<string, string>
): Promise<ApiGetResult<T>> {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const protocol = h.get("x-forwarded-proto") ?? "http";
    const baseUrl = host ? `${protocol}://${host}` : getFallbackBaseUrl();

    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), { cache: "no-store" });
    const json = (await response.json()) as ApiResponseEnvelope<T>;

    return {
        status: response.status,
        success: json.success,
        message: json.message,
        data: json.data ?? null,
    };
}
