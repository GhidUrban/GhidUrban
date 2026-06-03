import type { S3Client } from "@aws-sdk/client-s3";
import {
    buildPublicUrl,
    createR2Client,
    getR2Config,
    type R2Config,
    uploadToR2,
} from "./client";
import { extensionForContentType } from "./object-key";

export const R2_PLACE_PHOTOS_PREFIX = "supabase-places";

const FETCH_TIMEOUT_MS = 30_000;

let cachedR2: { config: R2Config; client: S3Client } | null = null;

function getR2(): { config: R2Config; client: S3Client } {
    if (!cachedR2) {
        const config = getR2Config();
        cachedR2 = { config, client: createR2Client(config) };
    }
    return cachedR2;
}

export function getR2PublicBase(): string {
    return getR2().config.publicUrl;
}

export function isR2PublicUrl(url: string | null | undefined, publicBase?: string): boolean {
    const u = url?.trim() ?? "";
    if (!u) return false;
    const base = (publicBase ?? getR2PublicBase()).replace(/\/+$/, "");
    return u === base || u.startsWith(`${base}/`);
}

export function buildPlacePhotoR2Key(params: {
    city_slug: string;
    category_slug: string;
    place_id: string;
    index: number;
    extension: string;
}): string {
    const ext = params.extension.startsWith(".") ? params.extension : `.${params.extension}`;
    return `${R2_PLACE_PHOTOS_PREFIX}/${params.city_slug}/${params.category_slug}/${params.place_id}_${params.index}${ext}`;
}

export function buildManualPlaceImageR2Key(params: {
    city_slug: string;
    category_slug: string;
    place_id: string;
    extension: string;
}): string {
    const ext = params.extension.startsWith(".") ? params.extension : `.${params.extension}`;
    return `${R2_PLACE_PHOTOS_PREFIX}/${params.city_slug}/${params.category_slug}/${params.place_id}${ext}`;
}

export function extensionFromMime(mime: string): string {
    return extensionForContentType(mime);
}

/** Validate buffer + content-type after a Google/media download. */
export function validateImageBuffer(
    body: Buffer,
    contentType: string,
): { ok: true; contentType: string } | { ok: false; reason: string } {
    if (body.length === 0) {
        return { ok: false, reason: "Empty body" };
    }
    const ct = contentType.split(";")[0]?.trim() ?? "";
    if (!ct.startsWith("image/")) {
        return { ok: false, reason: `content-type must be image/* (got ${ct || "empty"})` };
    }
    return { ok: true, contentType: ct };
}

export async function downloadImageStrict(
    url: string,
): Promise<
    | { ok: true; body: Buffer; contentType: string }
    | { ok: false; reason: string }
> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
        if (res.status !== 200) {
            return { ok: false, reason: `HTTP ${res.status}` };
        }

        const headerCt = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
        const body = Buffer.from(await res.arrayBuffer());
        const validated = validateImageBuffer(body, headerCt || "image/jpeg");
        if (!validated.ok) {
            return { ok: false, reason: validated.reason };
        }
        return { ok: true, body, contentType: validated.contentType };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: msg };
    } finally {
        clearTimeout(timeout);
    }
}

export async function uploadBufferToR2(params: {
    body: Buffer;
    contentType: string;
    key: string;
}): Promise<{ publicUrl: string; key: string }> {
    const { config, client } = getR2();
    await uploadToR2({
        client,
        config,
        key: params.key,
        body: params.body,
        contentType: params.contentType,
    });
    const publicUrl = buildPublicUrl(config.publicUrl, params.key);
    return { publicUrl, key: params.key };
}
