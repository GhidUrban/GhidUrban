import { verifyToken } from "@/lib/auth";
import {
    buildManualPlaceImageR2Key,
    extensionFromMime,
    uploadBufferToR2,
} from "@/lib/r2/upload-place-photo-to-r2";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFromMime(mime: string): string {
    const e = extensionFromMime(mime);
    return e.startsWith(".") ? e.slice(1) : e;
}

function isSafeSlug(s: string): boolean {
    return typeof s === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length > 0 && s.length <= 128;
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;
        if (!token || verifyToken(token) === null) {
            return NextResponse.json(
                { success: false, message: "Unauthorized", data: null },
                { status: 401 },
            );
        }

        const formData = await req.formData();
        const file = formData.get("file");
        const city_slug = String(formData.get("city_slug") ?? "").trim();
        const category_slug = String(formData.get("category_slug") ?? "").trim();
        const place_id = String(formData.get("place_id") ?? "").trim();

        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json(
                { success: false, message: "Missing file", data: null },
                { status: 400 },
            );
        }

        if (!isSafeSlug(city_slug) || !isSafeSlug(category_slug) || !isSafeSlug(place_id)) {
            return NextResponse.json(
                { success: false, message: "Invalid city_slug, category_slug, or place_id", data: null },
                { status: 400 },
            );
        }

        if (file.size > MAX_BYTES) {
            return NextResponse.json(
                { success: false, message: "File too large (max 5 MB)", data: null },
                { status: 400 },
            );
        }

        const mime = file.type || "application/octet-stream";
        if (!ALLOWED_MIME.has(mime)) {
            return NextResponse.json(
                { success: false, message: "Only JPEG, PNG, WebP, or GIF allowed", data: null },
                { status: 400 },
            );
        }

        const ext = extFromMime(mime);
        const objectKey = buildManualPlaceImageR2Key({
            city_slug,
            category_slug,
            place_id,
            extension: ext,
        });

        const buffer = Buffer.from(await file.arrayBuffer());

        const uploaded = await uploadBufferToR2({
            body: buffer,
            contentType: mime,
            key: objectKey,
        });

        return NextResponse.json({
            success: true,
            message: "Image uploaded",
            data: { publicUrl: uploaded.publicUrl, path: objectKey },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Upload failed";
        console.error("upload-place-image:", error);
        return NextResponse.json(
            { success: false, message: msg.includes("Missing required env") ? "R2 not configured" : "Upload failed", data: null },
            { status: 500 },
        );
    }
}
