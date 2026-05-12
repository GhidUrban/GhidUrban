import type {
    GlobalSearchCategory,
    GlobalSearchCity,
    GlobalSearchPlace,
} from "@/lib/load-global-search-index";
import { haversineKm } from "@/lib/haversine-km";

export function stripDiacritics(s: string): string {
    return s.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeForSearch(raw: string): string {
    let s = stripDiacritics(raw.trim().toLowerCase());
    s = s.replace(/[^\p{L}\p{N}\s_-]+/gu, " ");
    s = s.replace(/[-_]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
}

function compactForSearch(raw: string): string {
    return normalizeForSearch(raw).replace(/\s+/g, "");
}

/**
 * Single-row DP Levenshtein with optional max-distance bound.
 * Returns Infinity when distance exceeds maxDist (allows early exit).
 */
function levenshtein(a: string, b: string, maxDist = Infinity): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    if (Math.abs(m - n) > maxDist) return Infinity;

    let prev = new Uint16Array(n + 1);
    let curr = new Uint16Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;

    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        let rowMin = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
            if (curr[j] < rowMin) rowMin = curr[j];
        }
        if (rowMin > maxDist) return Infinity;
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

/** 0..1, higher = more similar. Uses bounded Levenshtein for early exit. */
function stringSimilarity(a: string, b: string, minSim = 0): number {
    if (!a.length || !b.length) return 0;
    const maxLen = Math.max(a.length, b.length);
    const maxDist = minSim > 0 ? Math.ceil(maxLen * (1 - minSim)) : maxLen;
    const d = levenshtein(a, b, maxDist);
    if (d === Infinity) return 0;
    return 1 - d / maxLen;
}

function bestTokenSimilarity(query: string, normalizedText: string): number {
    const q = query.trim();
    if (!q.length) return 0;
    const nt = normalizedText;
    if (!nt.length) return 0;

    let best = stringSimilarity(q, nt, FUZZY_THRESHOLD);
    for (const token of nt.split(" ")) {
        if (token.length >= 2) {
            best = Math.max(best, stringSimilarity(q, token, best));
        }
    }
    if (nt.length >= q.length && nt.length <= q.length * 4) {
        for (let i = 0; i <= nt.length - q.length; i++) {
            const slice = nt.slice(i, i + q.length);
            best = Math.max(best, stringSimilarity(q, slice, best));
        }
    }
    return best;
}

type Tier = "exact" | "starts" | "includes" | "none";

function nameTier(normQuery: string, normField: string): Tier {
    if (!normQuery.length || !normField.length) {
        return "none";
    }
    if (normField === normQuery) {
        return "exact";
    }
    if (normField.startsWith(normQuery)) {
        return "starts";
    }
    if (normField.includes(normQuery)) {
        return "includes";
    }
    return "none";
}

function tolerantTier(normQuery: string, normField: string): Tier {
    const direct = nameTier(normQuery, normField);
    if (direct !== "none") {
        return direct;
    }
    const qCompact = compactForSearch(normQuery);
    const fCompact = compactForSearch(normField);
    if (!qCompact.length || !fCompact.length) {
        return "none";
    }
    if (fCompact === qCompact) {
        return "exact";
    }
    if (fCompact.startsWith(qCompact)) {
        return "starts";
    }
    if (fCompact.includes(qCompact)) {
        return "includes";
    }
    return "none";
}

function tierScore(tier: Tier, high: number, mid: number, low: number): number {
    if (tier === "exact") {
        return high;
    }
    if (tier === "starts") {
        return mid;
    }
    if (tier === "includes") {
        return low;
    }
    return 0;
}

const NAME_EXACT = 1000;
const NAME_STARTS = 800;
const NAME_INCLUDES = 600;
const CITY_EXACT = 400;
const CITY_STARTS = 350;
const CITY_INCLUDES = 300;
const CAT_EXACT = 380;
const CAT_STARTS = 330;
const CAT_INCLUDES = 280;
const ADDRESS_INCLUDES = 150;
const DESC_INCLUDES = 100;

const FUZZY_THRESHOLD = 0.62;
const FUZZY_SCORE_BASE = 220;

export type ScoredPlace = GlobalSearchPlace & {
    score: number;
    distanceKm?: number | null;
};

function strictScorePlace(p: GlobalSearchPlace, normQ: string): number {
    if (!normQ.length) return 0;

    const normName = p._n_name ?? normalizeForSearch(p.name);
    const nt = tolerantTier(normQ, normName);
    let score = tierScore(nt, NAME_EXACT, NAME_STARTS, NAME_INCLUDES);

    const normAddr = p._n_addr ?? normalizeForSearch(p.address ?? "");
    if (normAddr.length) {
        const at = tolerantTier(normQ, normAddr);
        score = Math.max(
            score,
            tierScore(at, ADDRESS_INCLUDES + 200, ADDRESS_INCLUDES + 80, ADDRESS_INCLUDES),
        );
    }

    return score;
}

function fuzzyScoreSingleField(field: string, normQ: string, preNormalized?: string): number {
    if (normQ.length < 2) return 0;
    const norm = preNormalized ?? normalizeForSearch(field);
    const compact = norm.replace(/\s+/g, "");
    const candidates = [norm, compact];
    let best = 0;
    const compactQ = normQ.replace(/\s+/g, "");
    for (const c of candidates) {
        if (!c.length) continue;
        best = Math.max(best, bestTokenSimilarity(normQ, c));
        if (compactQ.length) {
            best = Math.max(best, bestTokenSimilarity(compactQ, c));
        }
    }
    if (best < FUZZY_THRESHOLD) return 0;
    return Math.round(FUZZY_SCORE_BASE * best);
}

function fuzzyScorePlace(p: GlobalSearchPlace, normQ: string): number {
    const nameScore = fuzzyScoreSingleField(p.name, normQ, p._n_name);
    if (nameScore >= Math.round(FUZZY_SCORE_BASE * 0.9)) return nameScore;
    const addrScore = fuzzyScoreSingleField(p.address ?? "", normQ, p._n_addr);
    return Math.max(nameScore, addrScore);
}

function strictScoreCategoryRow(cat: GlobalSearchCategory, normQ: string): number {
    const nc = normalizeForSearch(cat.category_name);
    const nv = normalizeForSearch(cat.city_name);
    const ncomb = normalizeForSearch(`${cat.category_name} ${cat.city_name}`);
    const tCat = tolerantTier(normQ, nc);
    const tCity = tolerantTier(normQ, nv);
    const tComb = tolerantTier(normQ, ncomb);
    let best = 0;
    best = Math.max(best, tierScore(tCat, CAT_EXACT, CAT_STARTS, CAT_INCLUDES));
    best = Math.max(best, tierScore(tCity, CITY_EXACT, CITY_STARTS, CITY_INCLUDES));
    best = Math.max(best, tierScore(tComb, NAME_EXACT, NAME_STARTS, NAME_INCLUDES));
    return best;
}

function fuzzyScoreCategoryRow(cat: GlobalSearchCategory, normQ: string): number {
    const labels = [`${cat.category_name} ${cat.city_name}`, cat.category_name, cat.city_name];
    let best = 0;
    for (const label of labels) {
        best = Math.max(best, fuzzyScoreSingleField(label, normQ));
    }
    return best;
}

/** Orașe după query (fără filtru geografic). */
export function searchCitiesGlobal(cities: GlobalSearchCity[], rawQuery: string): GlobalSearchCity[] {
    const normQ = normalizeForSearch(rawQuery);
    if (!normQ.length) {
        return [];
    }

    type Scored = GlobalSearchCity & { score: number };
    const strict: Scored[] = [];
    for (const c of cities) {
        const normName = normalizeForSearch(c.name);
        const nt = tolerantTier(normQ, normName);
        const score = tierScore(nt, NAME_EXACT, NAME_STARTS, NAME_INCLUDES);
        if (score > 0) {
            strict.push({ ...c, score });
        }
    }
    strict.sort((a, b) => b.score - a.score);

    function dedupSlug(rows: Scored[], limit: number): GlobalSearchCity[] {
        const seen = new Set<string>();
        const out: GlobalSearchCity[] = [];
        for (const row of rows) {
            if (seen.has(row.slug)) continue;
            seen.add(row.slug);
            out.push({ slug: row.slug, name: row.name });
            if (out.length >= limit) break;
        }
        return out;
    }

    if (strict.length > 0) {
        return dedupSlug(strict, 20);
    }

    const fuzzy: Scored[] = [];
    for (const c of cities) {
        const score = fuzzyScoreSingleField(c.name, normQ);
        if (score > 0) fuzzy.push({ ...c, score });
    }
    fuzzy.sort((a, b) => b.score - a.score);
    return dedupSlug(fuzzy, 20);
}

/** Perechi oraș + categorie după nume categorie sau oraș. */
export function searchCategoriesGlobal(
    categories: GlobalSearchCategory[],
    rawQuery: string,
): GlobalSearchCategory[] {
    const normQ = normalizeForSearch(rawQuery);
    if (!normQ.length) {
        return [];
    }

    type Scored = GlobalSearchCategory & { score: number };
    const strict: Scored[] = [];
    for (const c of categories) {
        const score = strictScoreCategoryRow(c, normQ);
        if (score > 0) strict.push({ ...c, score });
    }
    strict.sort((a, b) => b.score - a.score);

    function dedupPair(rows: Scored[], limit: number): GlobalSearchCategory[] {
        const seen = new Set<string>();
        const out: GlobalSearchCategory[] = [];
        for (const row of rows) {
            const key = `${row.city_slug}:${row.category_slug}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({
                city_slug: row.city_slug,
                city_name: row.city_name,
                category_slug: row.category_slug,
                category_name: row.category_name,
            });
            if (out.length >= limit) break;
        }
        return out;
    }

    if (strict.length > 0) {
        return dedupPair(strict, 25);
    }

    const fuzzy: Scored[] = [];
    for (const c of categories) {
        const score = fuzzyScoreCategoryRow(c, normQ);
        if (score > 0) fuzzy.push({ ...c, score });
    }
    fuzzy.sort((a, b) => b.score - a.score);
    return dedupPair(fuzzy, 25);
}

export type GlobalSearchOutcome = {
    places: ScoredPlace[];
    usedFuzzyFallback: boolean;
};

type SearchUserLocation = {
    lat: number;
    lng: number;
};

function placeDistanceKm(
    p: GlobalSearchPlace,
    userLocation?: SearchUserLocation,
): number | null {
    if (!userLocation) return null;
    if (p.latitude == null || p.longitude == null) return null;
    const d = haversineKm(userLocation.lat, userLocation.lng, Number(p.latitude), Number(p.longitude));
    if (!Number.isFinite(d)) return null;
    return d;
}

/** Acelasi loc poate sta in mai multe categorii → acelasi index in flat list de două ori. */
function dedupePlacesByCityPlaceId<T extends GlobalSearchPlace>(rows: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const p of rows) {
        const key = `${p.city_slug}\0${p.place_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(p);
    }
    return out;
}

export function searchPlacesGlobal(
    places: GlobalSearchPlace[],
    rawQuery: string,
    userLocation?: SearchUserLocation,
): GlobalSearchOutcome {
    const normQ = normalizeForSearch(rawQuery);
    if (!normQ.length) {
        return { places: [], usedFuzzyFallback: false };
    }

    const strict: ScoredPlace[] = [];
    for (const p of places) {
        const distanceKm = placeDistanceKm(p, userLocation);
        const score = strictScorePlace(p, normQ);
        if (score > 0) {
            strict.push({ ...p, score, distanceKm });
        }
    }
    strict.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db;
    });
    if (strict.length > 0) {
        const deduped = dedupePlacesByCityPlaceId(strict);
        return { places: deduped.slice(0, 100), usedFuzzyFallback: false };
    }

    const FUZZY_ENOUGH = 30;
    const fuzzy: ScoredPlace[] = [];
    let minFuzzyScore = 0;
    for (const p of places) {
        const score = fuzzyScorePlace(p, normQ);
        if (score > 0) {
            const distanceKm = placeDistanceKm(p, userLocation);
            fuzzy.push({ ...p, score, distanceKm });
            if (fuzzy.length >= FUZZY_ENOUGH && score > minFuzzyScore) {
                minFuzzyScore = score;
            }
        }
    }
    fuzzy.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db;
    });
    if (fuzzy.length === 0) {
        return { places: [], usedFuzzyFallback: false };
    }

    const dedupedFuzzy = dedupePlacesByCityPlaceId(fuzzy);
    return {
        places: dedupedFuzzy.slice(0, 100),
        usedFuzzyFallback: dedupedFuzzy.length > 0,
    };
}
