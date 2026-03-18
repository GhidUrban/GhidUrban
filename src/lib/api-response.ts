import { NextResponse } from "next/server";

type ApiPayload<T> = {
    success: boolean;
    message: string;
    data: T;
};

export function ok<T>(message: string, data: T, status = 200) {
    const payload: ApiPayload<T> = {
        success: true,
        message,
        data,
    };

    return NextResponse.json(payload, { status });
}

export function fail(message: string, status: number, data: Record<string, unknown> = {}) {
    const payload: ApiPayload<Record<string, unknown>> = {
        success: false,
        message,
        data,
    };

    return NextResponse.json(payload, { status });
}
