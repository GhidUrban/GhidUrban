/**
 * Legacy DB rows used paths like `/images/places/{slug}/city.jpg` without real files.
 * Normalize to null so `/api/cities` and UI use the placeholder unless a real URL is stored.
 *
 * Matches: `.jpg` / `.jpeg` / `.png` / `.webp`, optional query/hash, nested slug segments.
 */
const LEGACY_CITY_RELATIVE_PATTERN =
    /^\/images\/places\/.+\/city\.(jpe?g|png|webp)$/i;

export function normalizePublicCityImageUrl(stored: string | null | undefined): string | null {
    const t = typeof stored === "string" ? stored.trim() : "";
    if (!t) return null;

    const pathOnly = t.replace(/[?#].*$/u, "").replace(/\/+$/u, "").trim();
    if (LEGACY_CITY_RELATIVE_PATTERN.test(pathOnly)) return null;

    return t;
}
