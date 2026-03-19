import { headers } from "next/headers";

type ApiResponseEnvelope<T> = {
    success: boolean;
    message: string;
    data: T | null;
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

function getErrorResult<T>(status: number, message: string): ApiGetResult<T> {
    return {
        status,
        success: false,
        message,
        data: null,
    };
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

    let response: Response;

    try {
        response = await fetch(url.toString(), {
            next: { revalidate: 60 },
        });
    } catch (error) {
        console.error("apiGet fetch failed", { path, error });
        return getErrorResult<T>(500, "Internal API request failed.");
    }

    let json: ApiResponseEnvelope<T>;

    try {
        json = (await response.json()) as ApiResponseEnvelope<T>;
    } catch (error) {
        console.error("apiGet json parse failed", { path, status: response.status, error });
        return getErrorResult<T>(response.status, "Internal API returned an invalid JSON response.");
    }

    if (typeof json.success !== "boolean" || typeof json.message !== "string") {
        console.error("apiGet invalid response shape", { path, status: response.status });
        return getErrorResult<T>(response.status, "Internal API returned an invalid response shape.");
    }

    return {
        status: response.status,
        success: json.success,
        message: json.message,
        data: json.data ?? null,
    };
}
