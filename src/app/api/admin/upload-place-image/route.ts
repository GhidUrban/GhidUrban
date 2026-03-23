import { verifyToken } from "@/lib/auth";
import { getSupabaseStorageEnv } from "@/lib/supabase-storage-env";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFromMime(mime: string): string {
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    return "bin";
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

        const { url: supabaseUrl, serviceRoleKey: serviceKey } = getSupabaseStorageEnv();
        const bucket =
            process.env["SUPABASE_PLACE_IMAGES_BUCKET"]?.trim() || "places";

        if (!supabaseUrl) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Storage not configured: missing NEXT_PUBLIC_SUPABASE_URL",
                    data: null,
                },
                { status: 503 },
            );
        }
        if (!serviceKey) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Storage not configured: missing SUPABASE_SERVICE_ROLE_KEY (server-only; restart dev after adding it)",
                    data: null,
                },
                { status: 503 },
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
        const objectPath = `${city_slug}/${category_slug}/${place_id}.${ext}`;

        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const buffer = Buffer.from(await file.arrayBuffer());

        console.log("Supabase URL:", supabaseUrl);
        console.log("Service key exists:", serviceKey ? "YES" : "NO");
        console.log("Using bucket:", bucket);
        console.log("Upload path:", objectPath);

        const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
            contentType: mime,
            upsert: true,
        });

        if (uploadError) {
            console.error("Supabase storage upload error FULL:", uploadError);
            return NextResponse.json(
                { success: false, message: uploadError.message || "Upload failed", data: null },
                { status: 500 },
            );
        }

        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);

        return NextResponse.json({
            success: true,
            message: "Image uploaded",
            data: { publicUrl: pub.publicUrl, path: objectPath },
        });
    } catch (error) {
        console.error("upload-place-image:", error);
        return NextResponse.json(
            { success: false, message: "Upload failed", data: null },
            { status: 500 },
        );
    }
}
