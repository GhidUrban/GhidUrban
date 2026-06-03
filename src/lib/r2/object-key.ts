const KNOWN_EXTENSIONS = [".jpg", ".jpeg", ".webp", ".png", ".gif", ".avif"];

export function normalizePhotoName(name: string): string {
    return name.trim().replace(/^\/+/, "");
}

export function extensionForContentType(contentType: string): string {
    const ct = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (ct === "image/jpeg" || ct === "image/jpg") return ".jpg";
    if (ct === "image/webp") return ".webp";
    if (ct === "image/png") return ".png";
    if (ct === "image/gif") return ".gif";
    if (ct === "image/avif") return ".avif";
    return ".jpg";
}

function hasKnownExtension(key: string): boolean {
    const lower = key.toLowerCase();
    return KNOWN_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Cheie R2 din google_photo_name + extensie derivată din content-type. */
export function buildR2ObjectKey(googlePhotoName: string, contentType: string): string {
    const base = normalizePhotoName(googlePhotoName);
    if (hasKnownExtension(base)) {
        return base;
    }
    return `${base}${extensionForContentType(contentType)}`;
}
