/** Compact grouped program lines (L–V / S–D / Închis / non-stop) from weekday lines or DB `google_hours_raw`. */

export const EN_DASH = "\u2013";

/** Short labels Mon–Sun (Romanian). */
const WEEKDAY_SHORT = ["L", "Ma", "Mi", "J", "V", "S", "D"] as const;

type ParsedScheduleDay = { idx: number; value: string };

const DAY_LINE_PREFIXES: { re: RegExp; idx: number }[] = [
    { re: /^(luni|monday|mon\.?)\b/i, idx: 0 },
    { re: /^(mar[tț]i|tuesday|tue\.?)\b/i, idx: 1 },
    { re: /^(miercuri|wednesday|wed\.?)\b/i, idx: 2 },
    { re: /^(joi|thursday|thu\.?|thur\.?)\b/i, idx: 3 },
    { re: /^(vineri|friday|fri\.?)\b/i, idx: 4 },
    { re: /^(s[âa]mb[ăa]t[ăa]|saturday|sat\.?)\b/i, idx: 5 },
    { re: /^(duminic[ăa]|sunday|sun\.?)\b/i, idx: 6 },
];

function pad2(n: number): string {
    return n.toString().padStart(2, "0");
}

function parseTimeTo24(h: number, m: number, ap?: string): { h: number; m: number } | null {
    if (m < 0 || m > 59) return null;
    const a = ap?.toLowerCase();
    if (a === "pm") {
        if (h < 1 || h > 12) return null;
        return { h: h === 12 ? 12 : h + 12, m };
    }
    if (a === "am") {
        if (h < 1 || h > 12) return null;
        return { h: h === 12 ? 0 : h, m };
    }
    if (h < 0 || h > 23) return null;
    return { h, m };
}

/** Normalize hours fragment to `Închis` or `HH:MM–HH:MM` (24h). Returns null if unsafe. */
function normalizeScheduleHoursPart(rest: string): string | null {
    const t = rest.replace(/\u00a0/g, " ").trim();
    if (/^(închis|inchis|closed|inactiv)\b/i.test(t)) {
        return "Închis";
    }
    if (
        /non\s*stop|24\s*\/\s*7|24h|non-stop/i.test(t) ||
        /open\s+24\s*hours?|24\s+hours?\s+open/i.test(t) ||
        /\b24\s*hours?\b/i.test(t)
    ) {
        return `00:00${EN_DASH}24:00`;
    }

    const timeRe = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi;
    const found = [...t.matchAll(timeRe)];
    if (found.length >= 2) {
        const h1 = parseInt(found[0][1], 10);
        const m1 = parseInt(found[0][2], 10);
        const h2 = parseInt(found[1][1], 10);
        const m2 = parseInt(found[1][2], 10);
        const ap1 = found[0][3];
        const ap2 = found[1][3];
        const a = parseTimeTo24(h1, m1, ap1);
        const b = parseTimeTo24(h2, m2, ap2);
        if (!a || !b) return null;
        return `${pad2(a.h)}:${pad2(a.m)}${EN_DASH}${pad2(b.h)}:${pad2(b.m)}`;
    }
    if (found.length === 1) {
        return null;
    }

    const simple = /\b(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\b/;
    const sm = t.match(simple);
    if (sm) {
        const a = parseTimeTo24(parseInt(sm[1], 10), parseInt(sm[2], 10));
        const b = parseTimeTo24(parseInt(sm[3], 10), parseInt(sm[4], 10));
        if (!a || !b) return null;
        return `${pad2(a.h)}:${pad2(a.m)}${EN_DASH}${pad2(b.h)}:${pad2(b.m)}`;
    }

    return null;
}

function parseScheduleDayLine(line: string): ParsedScheduleDay | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    for (const { re, idx } of DAY_LINE_PREFIXES) {
        const match = trimmed.match(re);
        if (!match) continue;
        const rest = trimmed.slice(match[0].length).replace(/^[\s:–—-]+/, "").trim();
        if (!rest) return null;
        const value = normalizeScheduleHoursPart(rest);
        if (value === null) return null;
        return { idx, value };
    }
    return null;
}

function rangeLabelForGroup(startIdx: number, endIdx: number): string {
    if (startIdx === 0 && endIdx === 4) return `L${EN_DASH}V`;
    if (startIdx === 5 && endIdx === 6) return `S${EN_DASH}D`;
    if (startIdx === 0 && endIdx === 6) return `L${EN_DASH}D`;
    if (startIdx === endIdx) return WEEKDAY_SHORT[startIdx];
    return `${WEEKDAY_SHORT[startIdx]}${EN_DASH}${WEEKDAY_SHORT[endIdx]}`;
}

function groupParsedDays(sorted: ParsedScheduleDay[]): string[] {
    const out: string[] = [];
    let i = 0;
    while (i < sorted.length) {
        const start = i;
        const val = sorted[i].value;
        let j = i + 1;
        while (
            j < sorted.length &&
            sorted[j].idx === sorted[j - 1].idx + 1 &&
            sorted[j].value === val
        ) {
            j++;
        }
        const a = sorted[start].idx;
        const b = sorted[j - 1].idx;
        out.push(`${rangeLabelForGroup(a, b)}: ${val}`);
        i = j;
    }
    return out;
}

function format247AsNonStop(line: string): string {
    const sep = ": ";
    const idx = line.indexOf(sep);
    if (idx < 0) return line;
    const label = line.slice(0, idx);
    const val = line.slice(idx + sep.length);
    if (val === `00:00${EN_DASH}24:00`) {
        return `${label}: Deschis non-stop`;
    }
    return line;
}

function buildCompactLinesFromWeekdayLines(lines: string[]): string[] | null {
    const parsed: ParsedScheduleDay[] = [];
    for (const line of lines) {
        const d = parseScheduleDayLine(line);
        if (!d) return null;
        parsed.push(d);
    }

    parsed.sort((a, b) => a.idx - b.idx);
    for (let k = 1; k < parsed.length; k++) {
        if (parsed[k].idx === parsed[k - 1].idx) {
            return null;
        }
    }

    return groupParsedDays(parsed).map(format247AsNonStop);
}

/**
 * Uses `weekdayDescriptions` from Google `google_hours_raw` only (not `google_hours_text`).
 */
export function formatGoogleHoursRawToCompactLines(raw: unknown): string[] | null {
    if (raw == null || typeof raw !== "object") return null;
    const wd = (raw as { weekdayDescriptions?: unknown }).weekdayDescriptions;
    if (!Array.isArray(wd)) return null;
    const lines = wd
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.replace(/\u00a0/g, " ").trim())
        .filter((s) => s.length > 0);
    if (lines.length === 0) return null;
    return buildCompactLinesFromWeekdayLines(lines);
}

/**
 * Same compact grouping as before, but from free-form `place.schedule` (Romanian lines etc.).
 */
export function tryBuildCompactScheduleFromPlainText(
    schedule: string | null | undefined,
): string[] | null {
    const raw = schedule?.trim();
    if (!raw || /^program\s+indisponibil$/i.test(raw)) {
        return null;
    }

    const lower = raw.toLowerCase();
    if (lower.includes("zilnic") || lower.includes("acces liber")) {
        return [`L${EN_DASH}D: Deschis non-stop`];
    }

    const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) {
        return null;
    }

    const built = buildCompactLinesFromWeekdayLines(lines);
    return built;
}
