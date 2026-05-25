import { normalizeForSearch } from "@/lib/global-place-search";

const PHRASE_HITS: { phrase: string; reason: string }[] = [
    { phrase: "sfanta maria", reason: "blacklist:private sfanta maria" },
    { phrase: "santa maria", reason: "blacklist:private santa maria" },
    { phrase: "sf maria", reason: "blacklist:private sf maria" },
    { phrase: "regina maria", reason: "blacklist:private regina maria" },
    { phrase: "medical center", reason: "blacklist:private medical center" },
    { phrase: "health center", reason: "blacklist:private health center" },
    { phrase: "centru medical", reason: "blacklist:private centru medical" },
    { phrase: "spital privat", reason: "blacklist:private spital" },
    { phrase: "private hospital", reason: "blacklist:private hospital" },
    { phrase: "clinica privata", reason: "blacklist:private clinica" },
];

const WORD_HITS: { re: RegExp; reason: string }[] = [
    { re: /\brompetrol\b/, reason: "blacklist:private rompetrol" },
    { re: /\bpetrom\b/, reason: "blacklist:private petrom" },
    { re: /\barcadia\b/, reason: "blacklist:private arcadia" },
    { re: /\bmedlife\b/, reason: "blacklist:private medlife" },
    { re: /\bclinica\b/, reason: "blacklist:private clinica" },
    { re: /\bclinic\b/, reason: "blacklist:private clinic" },
];

const CENTER_MEDICAL_SIGNAL =
    /\b(clinica|clinic|medlife|regina|arcadia)\b/;

/**
 * Reject private chains / clinics / fuel at Google import preview (name + address).
 * Does not block public hospitals (no global "hospital" or type:hospital reject).
 */
export function privateBrandRejectReason(
    name: string,
    formattedAddress?: string,
    _types?: string[],
): string | null {
    const hay = normalizeForSearch(`${name} ${formattedAddress ?? ""}`);
    if (!hay) {
        return null;
    }

    for (const { phrase, reason } of PHRASE_HITS) {
        if (hay.includes(phrase)) {
            return reason;
        }
    }

    for (const { re, reason } of WORD_HITS) {
        if (re.test(hay)) {
            return reason;
        }
    }

    if (/\bcenter\b/.test(hay) && CENTER_MEDICAL_SIGNAL.test(hay)) {
        return "blacklist:private center (medical signal)";
    }

    return null;
}
