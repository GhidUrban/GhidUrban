import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { generateToken } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Username and password are required",
                    data: null,
                },
                { status: 400 }
            );
        }

        const expectedUsername = process.env.ADMIN_USERNAME;
        const expectedPassword = process.env.ADMIN_PASSWORD;
        const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;

        let passwordIsValid = false;

        if (expectedPasswordHash) {
            passwordIsValid = await bcrypt.compare(password, expectedPasswordHash);
        } else if (expectedPassword) {
            passwordIsValid = password === expectedPassword;
        }

        if (username !== expectedUsername || !passwordIsValid) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid credentials",
                    data: null,
                },
                { status: 401 }
            );
        }

        const token = generateToken();

        const response = NextResponse.json({
            success: true,
            message: "Login successful",
            data: null,
        });

        response.cookies.set("admin_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 2,
        });

        return response;
    } catch (error) {
        console.error("Admin login failed", error);

        return NextResponse.json(
            {
                success: false,
                message: "Login failed",
                data: null,
            },
            { status: 500 }
        );
    }
}
