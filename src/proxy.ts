import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // allow login page
    if (pathname.startsWith("/admin/login")) {
        return NextResponse.next();
    }

    // protect admin routes
    if (pathname.startsWith("/admin")) {
        const token = request.cookies.get("admin_token")?.value;

        if (!token) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
