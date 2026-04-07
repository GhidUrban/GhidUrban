import type { ReactNode } from "react";
import { stripDiacritics } from "@/lib/global-place-search";

const MATCH_CLASS = "font-semibold text-gray-900";

/**
 * Highlights a single contiguous match in the place name when it appears as a plain substring.
 * Case-insensitive; optional diacritic-insensitive pass when string lengths stay aligned with `name`.
 * If there is no clean substring (e.g. fuzzy-only / spacing-compact match), returns the plain title.
 */
export function highlightPlaceTitle(name: string, rawQuery: string): ReactNode {
    const q = rawQuery.trim();
    if (!q.length) {
        return name;
    }

    const lowerName = name.toLowerCase();
    const lowerQ = q.toLowerCase();
    const rawIdx = lowerName.indexOf(lowerQ);
    if (rawIdx >= 0) {
        const end = rawIdx + lowerQ.length;
        return (
            <>
                {name.slice(0, rawIdx)}
                <span className={MATCH_CLASS}>{name.slice(rawIdx, end)}</span>
                {name.slice(end)}
            </>
        );
    }

    const nn = stripDiacritics(name);
    const nq = stripDiacritics(q);
    if (nn.length !== name.length || nq.length !== q.length) {
        return name;
    }

    const ln = nn.toLowerCase();
    const lq = nq.toLowerCase();
    if (!lq.length) {
        return name;
    }
    const diIdx = ln.indexOf(lq);
    if (diIdx < 0) {
        return name;
    }
    const diEnd = diIdx + lq.length;
    return (
        <>
            {name.slice(0, diIdx)}
            <span className={MATCH_CLASS}>{name.slice(diIdx, diEnd)}</span>
            {name.slice(diEnd)}
        </>
    );
}
