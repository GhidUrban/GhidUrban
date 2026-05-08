import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyToken } from "@/lib/auth";

const PUBLIC_API_PATHS = ["/api/admin/login", "/api/admin/logout"];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/admin/login")) {
        return NextResponse.next();
    }

    if (PUBLIC_API_PATHS.includes(pathname)) {
        return NextResponse.next();
    }

    if (pathname.startsWith("/api/admin")) {
        const token = request.cookies.get("admin_token")?.value;
        if (!token || !verifyToken(token)) {
            return NextResponse.json(
                { success: false, message: "Unauthorized", data: null },
                { status: 401 },
            );
        }
        return NextResponse.next();
    }

    if (pathname.startsWith("/admin")) {
        const token = request.cookies.get("admin_token")?.value;
        if (!token || !verifyToken(token)) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/api/admin/:path*"],
};
