import type { GlobalSearchPlace } from "@/lib/load-global-search-index";

export function stripDiacritics(s: string): string {
    return s.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeForSearch(raw: string): string {
    let s = stripDiacritics(raw.trim().toLowerCase());
    s = s.replace(/[-_]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
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
};

function strictScorePlace(p: GlobalSearchPlace, normQ: string): number {
    if (!normQ.length) {
        return 0;
    }

    const normName = normalizeForSearch(p.name);
    const normCityName = normalizeForSearch(p.city_name);
    const normCitySlug = normalizeForSearch(p.city_slug.replace(/[-_]/g, " "));
    const normCatName = normalizeForSearch(p.category_name || "");
    const normCatSlug = normalizeForSearch(p.category_slug.replace(/[-_]/g, " "));
    const normAddr = normalizeForSearch(p.address || "");
    const normDesc = normalizeForSearch(p.description || "");

    let score = 0;

    const nt = nameTier(normQ, normName);
    score += tierScore(nt, NAME_EXACT, NAME_STARTS, NAME_INCLUDES);

    const cityBest = Math.max(
        tierScore(nameTier(normQ, normCityName), CITY_EXACT, CITY_STARTS, CITY_INCLUDES),
        tierScore(nameTier(normQ, normCitySlug), CITY_EXACT, CITY_STARTS, CITY_INCLUDES),
    );
    score += cityBest;

    const catBest = Math.max(
        tierScore(nameTier(normQ, normCatName), CAT_EXACT, CAT_STARTS, CAT_INCLUDES),
        tierScore(nameTier(normQ, normCatSlug), CAT_EXACT, CAT_STARTS, CAT_INCLUDES),
    );
    score += catBest;

    if (normAddr.includes(normQ)) {
        score += ADDRESS_INCLUDES;
    }
    if (normDesc.includes(normQ)) {
        score += DESC_INCLUDES;
    }

    return score;
}

function fuzzyScorePlace(p: GlobalSearchPlace, normQ: string): number {
    if (normQ.length < 2) {
        return 0;
    }
    const candidates = [
        normalizeForSearch(p.name),
        normalizeForSearch(p.city_name),
        normalizeForSearch(p.category_name || ""),
        normalizeForSearch(p.address || ""),
        normalizeForSearch(p.description || ""),
    ];
    let best = 0;
    for (const c of candidates) {
        if (!c.length) {
            continue;
        }
        best = Math.max(best, bestTokenSimilarity(normQ, c));
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

export function searchPlacesGlobal(
    places: GlobalSearchPlace[],
    rawQuery: string,
): GlobalSearchOutcome {
    const normQ = normalizeForSearch(rawQuery);
    if (!normQ.length) {
        return { places: [], usedFuzzyFallback: false };
    }

    const strict: ScoredPlace[] = [];
    for (const p of places) {
        const score = strictScorePlace(p, normQ);
        if (score > 0) {
            strict.push({ ...p, score });
        }
    }
    strict.sort((a, b) => b.score - a.score);

    if (strict.length > 0) {
        return { places: strict.slice(0, 100), usedFuzzyFallback: false };
    }

    const fuzzy: ScoredPlace[] = [];
    for (const p of places) {
        const score = fuzzyScorePlace(p, normQ);
        if (score > 0) {
            fuzzy.push({ ...p, score });
        }
    }
    fuzzy.sort((a, b) => b.score - a.score);

    return {
        places: fuzzy.slice(0, 100),
        usedFuzzyFallback: fuzzy.length > 0,
    };
}
