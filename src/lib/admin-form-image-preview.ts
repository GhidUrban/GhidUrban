import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";

/**
 * Preview URL for admin image field. Single source is formData.image (trimmed).
 * Empty → PLACE_IMAGE_PLACEHOLDER. Does not upload or mutate saved value.
 * Pair with imagePreviewRevision: increment after upload if the public URL string might not change.
 */
export function adminImagePreviewSrc(formImage: string): string {
    const t = formImage.trim();
    if (!t) {
        return PLACE_IMAGE_PLACEHOLDER;
    }
    return t;
}
