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
    /** Optional thumbnail (e.g. `/images/...` from place listing). */
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
            const rawThumb =
                (typeof r.image_url === "string" && r.image_url.length > 0 ? r.image_url : null) ??
                (typeof r.image === "string" && r.image.length > 0 ? r.image : null);
            const image_url = rawThumb;
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
                image_url,
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
