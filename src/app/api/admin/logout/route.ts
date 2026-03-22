import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({
        success: true,
        message: "Logout successful",
        data: null,
    });

    response.cookies.set("admin_token", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
    });

    return response;
}
