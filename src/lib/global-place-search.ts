import type { GlobalSearchPlace } from "@/lib/load-global-search-index";
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

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) {
        return n;
    }
    if (n === 0) {
        return m;
    }
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            );
        }
    }
    return dp[m][n];
}

/** 0..1, higher = more similar */
function stringSimilarity(a: string, b: string): number {
    if (!a.length || !b.length) {
        return 0;
    }
    const d = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return 1 - d / maxLen;
}

function bestTokenSimilarity(query: string, text: string): number {
    const q = query.trim();
    if (!q.length) {
        return 0;
    }
    const nt = normalizeForSearch(text);
    if (!nt.length) {
        return 0;
    }
    let best = stringSimilarity(q, nt);
    for (const token of nt.split(" ")) {
        if (token.length >= 2) {
            best = Math.max(best, stringSimilarity(q, token));
        }
    }
    if (nt.length >= q.length) {
        for (let i = 0; i <= nt.length - q.length; i++) {
            const slice = nt.slice(i, i + q.length);
            best = Math.max(best, stringSimilarity(q, slice));
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
const LOCAL_RADIUS_KM = 20;

export type ScoredPlace = GlobalSearchPlace & {
    score: number;
    distanceKm?: number | null;
};

function strictScorePlace(p: GlobalSearchPlace, normQ: string): number {
    if (!normQ.length) {
        return 0;
    }

    const normName = normalizeForSearch(p.name);
    const nt = tolerantTier(normQ, normName);
    return tierScore(nt, NAME_EXACT, NAME_STARTS, NAME_INCLUDES);
}

function fuzzyScorePlace(p: GlobalSearchPlace, normQ: string): number {
    if (normQ.length < 2) {
        return 0;
    }
    const candidates = [normalizeForSearch(p.name), compactForSearch(p.name)];
    let best = 0;
    const compactQ = compactForSearch(normQ);
    for (const c of candidates) {
        if (!c.length) {
            continue;
        }
        best = Math.max(best, bestTokenSimilarity(normQ, c));
        if (compactQ.length) {
            best = Math.max(best, bestTokenSimilarity(compactQ, c));
        }
    }
    if (best < FUZZY_THRESHOLD) {
        return 0;
    }
    return Math.round(FUZZY_SCORE_BASE * best);
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

function applyLocalRadius(
    scored: ScoredPlace[],
    userLocation?: SearchUserLocation,
): ScoredPlace[] {
    if (!userLocation) return scored;
    // Location-active mode: keep only local, distance-known results.
    return scored.filter((p) => p.distanceKm != null && p.distanceKm <= LOCAL_RADIUS_KM);
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
        const strictLocal = applyLocalRadius(strict, userLocation);
        return { places: strictLocal.slice(0, 100), usedFuzzyFallback: false };
    }

    const fuzzy: ScoredPlace[] = [];
    for (const p of places) {
        const distanceKm = placeDistanceKm(p, userLocation);
        const score = fuzzyScorePlace(p, normQ);
        if (score > 0) {
            fuzzy.push({ ...p, score, distanceKm });
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

    const fuzzyLocal = applyLocalRadius(fuzzy, userLocation);
    return {
        places: fuzzyLocal.slice(0, 100),
        usedFuzzyFallback: fuzzyLocal.length > 0,
    };
}
