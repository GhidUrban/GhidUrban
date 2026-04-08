export const RECENT_PLACES_STORAGE_KEY = "ghidurban-cauta-recent-places";
const MAX_ITEMS = 5;

export type RecentPlaceVisit = {
    place_id: string;
    name: string;
    city_slug: string;
    city_name: string;
    category_slug: string;
    category_name: string;
    href: string;
    /** Raw DB path / URL; used with `resolvePlaceImageSrc`. */
    image?: string | null;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
    /** Legacy: pre-resolved thumb only (before raw fields were stored). */
    image_url?: string | null;
    address?: string | null;
    rating?: number | null;
};

function placeKey(p: Pick<RecentPlaceVisit, "city_slug" | "category_slug" | "place_id">): string {
    return `${p.city_slug}/${p.category_slug}/${p.place_id}`;
}

function safeRead(): RecentPlaceVisit[] {
    if (typeof window === "undefined") {
        return [];
    }
    try {
        const raw = localStorage.getItem(RECENT_PLACES_STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const out: RecentPlaceVisit[] = [];
        for (const row of parsed) {
            if (!row || typeof row !== "object") continue;
            const r = row as Record<string, unknown>;
            const place_id = typeof r.place_id === "string" ? r.place_id : "";
            const name = typeof r.name === "string" ? r.name : "";
            const city_slug = typeof r.city_slug === "string" ? r.city_slug : "";
            const city_name = typeof r.city_name === "string" ? r.city_name : "";
            const category_slug = typeof r.category_slug === "string" ? r.category_slug : "";
            const category_name = typeof r.category_name === "string" ? r.category_name : "";
            const href = typeof r.href === "string" ? r.href : "";
            const image =
                typeof r.image === "string" ? r.image : undefined;
            const google_match_status =
                typeof r.google_match_status === "string"
                    ? r.google_match_status.trim() || null
                    : null;
            const google_photo_uri =
                typeof r.google_photo_uri === "string"
                    ? r.google_photo_uri.trim() || null
                    : null;
            const image_url =
                typeof r.image_url === "string" && r.image_url.length > 0 ? r.image_url : null;
            const address = typeof r.address === "string" ? r.address : null;
            let rating: number | null = null;
            if (typeof r.rating === "number" && Number.isFinite(r.rating)) {
                rating = r.rating;
            }
            if (!place_id || !name || !href) continue;
            out.push({
                place_id,
                name,
                city_slug,
                city_name,
                category_slug,
                category_name,
                href,
                ...(image !== undefined ? { image } : {}),
                ...(google_match_status != null ? { google_match_status } : {}),
                ...(google_photo_uri != null ? { google_photo_uri } : {}),
                ...(image_url != null ? { image_url } : {}),
                address,
                rating,
            });
        }
        return out.slice(0, MAX_ITEMS);
    } catch {
        return [];
    }
}

export function readRecentPlaces(): RecentPlaceVisit[] {
    return safeRead();
}

/** Newest first, deduped by city + category + place id, max 5. Re-opening moves to top. */
export function addRecentPlace(entry: RecentPlaceVisit): RecentPlaceVisit[] {
    const prev = safeRead();
    const k = placeKey(entry);
    const rest = prev.filter((p) => placeKey(p) !== k);
    const next = [entry, ...rest].slice(0, MAX_ITEMS);
    try {
        localStorage.setItem(RECENT_PLACES_STORAGE_KEY, JSON.stringify(next));
    } catch {
        /* ignore */
    }
    return next;
}
