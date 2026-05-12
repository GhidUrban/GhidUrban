/**
 * One-place autofill: resolve a Google Maps link → Places API (New) Place Details.
 * Not used for bulk import (/admin/import).
 */

import { haversineKm } from "@/lib/haversine-km";

const PLACES_V1 = "https://places.googleapis.com/v1";

const AUTOFILL_FIELD_MASK =
    "displayName,formattedAddress,websiteUri,internationalPhoneNumber,nationalPhoneNumber,googleMapsUri,regularOpeningHours";

/** Lite fields to rank candidates by city before a single Place Details call. */
const TEXT_SEARCH_FIELD_MASK =
    "places.id,places.name,places.displayName,places.formattedAddress,places.location";

/** Radius in meters (Places API max 50_000). */
const TEXT_SEARCH_RADIUS_M = 30000;

/** Accept fallback hit if within this distance of selected city center when address does not name the city. */
const MAX_DISTANCE_KM_FOR_FALLBACK = 40;

const MAX_REDIRECT_HOPS = 15;

export type GoogleMapsPlaceAutofillResult = {
    name: string;
    address: string;
    website: string;
    phone: string;
    maps_url: string;
    schedule: string;
};

function trimOrEmpty(s: string | null | undefined): string {
    return typeof s === "string" ? s.trim() : "";
}

function normalizeHrefInput(raw: string): string {
    const u = raw.trim();
    if (!u) {
        return u;
    }
    if (!/^https?:\/\//i.test(u)) {
        return `https://${u}`;
    }
    return u;
}

function isShortMapsHost(host: string): boolean {
    const h = host.toLowerCase().replace(/^www\./, "");
    return (
        h === "goo.gl" ||
        h === "g.co" ||
        h === "maps.app.goo.gl" ||
        h.endsWith(".app.goo.gl")
    );
}

/**
 * Follow redirects manually so maps.app.goo.gl / goo.gl reliably reach the final maps URL.
 */
export async function resolveGoogleMapsUrl(raw: string): Promise<string> {
    let current = normalizeHrefInput(raw);
    if (!current) {
        return raw.trim();
    }

    for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
        let urlObj: URL;
        try {
            urlObj = new URL(current);
        } catch {
            return raw.trim();
        }

        const host = urlObj.hostname.toLowerCase();
        const pathname = urlObj.pathname || "";
        const hasMapsPath =
            pathname.includes("/maps/") ||
            pathname.startsWith("/maps") ||
            /^\/place\//i.test(pathname);

        if (!isShortMapsHost(host) && (hasMapsPath || host.includes("google"))) {
            return current;
        }

        const res = await fetch(current, {
            method: "GET",
            redirect: "manual",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (compatible; GhidUrban-admin-autofill/1; +https://ghidurban.ro)",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });

        const loc = res.headers.get("location");
        if (loc && res.status >= 300 && res.status < 400) {
            current = new URL(loc, current).href;
            continue;
        }

        await res.text().catch(() => {});
        if (res.url && res.url !== current) {
            current = res.url;
            continue;
        }

        return current;
    }

    return current;
}

/**
 * Best-effort: many share URLs contain a Places id starting with ChIJ.
 * Hex-only !1s0x… fragments are not supported here.
 */
export function extractPlacesResourceFromResolvedUrl(resolvedUrl: string): string | null {
    let decoded = resolvedUrl;
    try {
        decoded = decodeURIComponent(resolvedUrl);
    } catch {
        /* keep */
    }
    const mPath = decoded.match(/\/places\/(ChIJ[A-Za-z0-9_-]+)/);
    if (mPath) {
        return `places/${mPath[1]}`;
    }
    const mAny = decoded.match(/(ChIJ[A-Za-z0-9_-]{10,})/);
    if (mAny) {
        return `places/${mAny[1]}`;
    }
    try {
        const u = new URL(decoded.startsWith("http") ? decoded : `https://${decoded}`);
        const qpid =
            u.searchParams.get("query_place_id") ||
            u.searchParams.get("place_id") ||
            u.searchParams.get("query_placeid");
        if (qpid?.startsWith("ChIJ")) {
            return `places/${qpid}`;
        }
    } catch {
        /* ignore */
    }
    return null;
}

/** Strip /@…, /data…, ?, # then decode and normalize spaces. */
function cleanPathSegmentForQuery(rawSegment: string): string {
    let s = rawSegment.trim();
    if (!s) {
        return "";
    }
    for (const sep of ["/@", "/data", "?", "#"]) {
        const i = s.indexOf(sep);
        if (i >= 0) {
            s = s.slice(0, i);
        }
    }
    s = s.trim();
    try {
        s = decodeURIComponent(s);
    } catch {
        /* keep */
    }
    return s.replace(/\+/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeMapsTextQuery(raw: string): string | null {
    let s = raw.replace(/\+/g, " ").replace(/\s+/g, " ").trim();
    if (s.length < 2) {
        return null;
    }
    s = s.slice(0, 200);

    const compact = s.replace(/\s/g, "");
    if (/^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(compact)) {
        return null;
    }
    if (/^[\d.,+\-°\s]+$/.test(s) && !/\p{L}/u.test(s)) {
        return null;
    }
    if (!/\p{L}/u.test(s) && !/\d/.test(s)) {
        return null;
    }
    return s;
}

function isAllowedMapsHost(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return (
        h.includes("google") ||
        h.startsWith("maps.") ||
        h.endsWith(".goo.gl") ||
        h === "goo.gl" ||
        h === "g.co"
    );
}

/**
 * Derive a text query from path segments and search params when place id is absent.
 */
function extractTextQueryFromResolvedMapsUrl(resolvedUrl: string): string | null {
    let u: URL;
    try {
        u = new URL(resolvedUrl);
    } catch {
        return null;
    }

    if (!isAllowedMapsHost(u.hostname)) {
        return null;
    }

    for (const key of ["q", "query", "query_place_query"]) {
        const v = u.searchParams.get(key)?.trim();
        if (v && v.length >= 2 && !/^https?:\/\//i.test(v)) {
            const cleaned = cleanPathSegmentForQuery(v);
            const s = sanitizeMapsTextQuery(cleaned);
            if (s) {
                return s;
            }
        }
    }

    const tryAfterPrefix = (pathname: string, prefix: string): string | null => {
        const i = pathname.indexOf(prefix);
        if (i < 0) {
            return null;
        }
        let rest = pathname.slice(i + prefix.length).replace(/^\/+/, "");
        if (!rest) {
            return null;
        }
        const cleaned = cleanPathSegmentForQuery(rest);
        if (!cleaned || cleaned === "search") {
            return null;
        }
        if (/^data=/i.test(cleaned) || /^@[\d.,-]+z?$/i.test(cleaned)) {
            return null;
        }
        if (/^[-\d.]+$/.test(cleaned)) {
            return null;
        }
        return sanitizeMapsTextQuery(cleaned);
    };

    const pathname = u.pathname || "";
    return (
        tryAfterPrefix(pathname, "/maps/place/") ||
        tryAfterPrefix(pathname, "/place/") ||
        tryAfterPrefix(pathname, "/maps/search/")
    );
}

function normalizeWebsite(raw: string): string {
    const s = raw.trim();
    if (!s) {
        return "";
    }
    if (!/^https?:\/\//i.test(s)) {
        return `https://${s}`;
    }
    return s;
}

function pickPhone(international?: string, national?: string): string {
    const i = trimOrEmpty(international);
    if (i) {
        return i.split(/[;/]/)[0]?.trim() ?? i;
    }
    const n = trimOrEmpty(national);
    return n ? n.split(/[;/]/)[0]?.trim() ?? n : "";
}

function placeResourceToId(resource: string): string {
    return resource.replace(/^places\//, "");
}

type DetailsJson = {
    displayName?: { text?: string };
    formattedAddress?: string;
    websiteUri?: string;
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    googleMapsUri?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
};

async function fetchPlaceDetailsForAutofill(
    apiKey: string,
    resource: string,
): Promise<
    | { ok: true; json: DetailsJson }
    | { ok: false; httpStatus: number; snippet: string }
    | { ok: false; parseError: true }
> {
    const placeId = placeResourceToId(resource);
    const url = `${PLACES_V1}/places/${encodeURIComponent(placeId)}`;
    const res = await fetch(url, {
        headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": AUTOFILL_FIELD_MASK,
        },
    });
    const raw = await res.text();
    if (!res.ok) {
        console.error("[maps autofill] Places details HTTP", res.status, raw.slice(0, 300));
        return { ok: false, httpStatus: res.status, snippet: raw.slice(0, 200) };
    }
    try {
        const json = JSON.parse(raw) as DetailsJson;
        return { ok: true, json };
    } catch {
        return { ok: false, parseError: true };
    }
}

function buildAutofillResult(json: DetailsJson, mapsUrlFallback: string): GoogleMapsPlaceAutofillResult | null {
    const name = trimOrEmpty(json.displayName?.text);
    if (!name) {
        return null;
    }
    const address = trimOrEmpty(json.formattedAddress);
    const website = normalizeWebsite(trimOrEmpty(json.websiteUri));
    const phone = pickPhone(json.internationalPhoneNumber, json.nationalPhoneNumber);
    const maps_url = trimOrEmpty(json.googleMapsUri) || mapsUrlFallback.trim();
    let schedule = "";
    const wd = json.regularOpeningHours?.weekdayDescriptions;
    if (wd?.length) {
        schedule = wd.join("\n");
    }
    return {
        name,
        address,
        website,
        phone,
        maps_url,
        schedule,
    };
}

type TextSearchPlace = {
    id?: string;
    name?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
};

function normalizeMatchText(s: string): string {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** Substrings to find in formattedAddress (ASCII-ish after normalizeMatchText on both sides). */
function addressHintsForCitySlug(city_slug: string): string[] {
    const m: Record<string, string[]> = {
        "baia-mare": ["baia mare"],
        "cluj-napoca": ["cluj-napoca", "cluj napoca", "cluj"],
        "bucuresti": ["bucuresti", "bucharest"],
        "brasov": ["brasov"],
        "timisoara": ["timisoara"],
        "oradea": ["oradea"],
    };
    return m[city_slug] ?? [];
}

function addressMatchesCityHints(place: TextSearchPlace, hints: string[]): boolean {
    const addr = normalizeMatchText(place.formattedAddress ?? "");
    if (!addr) {
        return false;
    }
    return hints.some((h) => h && addr.includes(normalizeMatchText(h)));
}

function candidateDistanceKm(
    place: TextSearchPlace,
    center: { lat: number; lon: number },
): number | null {
    const la = place.location?.latitude;
    const lo = place.location?.longitude;
    if (la == null || lo == null || !Number.isFinite(la) || !Number.isFinite(lo)) {
        return null;
    }
    return haversineKm(la, lo, center.lat, center.lon);
}

/** Match bulk-import behaviour: id and/or name (resource path). */
function toPlacesResourceFromSearchHit(hit: TextSearchPlace): string | null {
    const idPart = hit.id?.trim();
    const namePart = hit.name?.trim();
    if (namePart?.startsWith("places/")) {
        return namePart;
    }
    if (idPart?.startsWith("places/")) {
        return idPart;
    }
    const bare = idPart || (namePart ? namePart.split("/").pop()?.trim() : "") || "";
    if (!bare) {
        return null;
    }
    if (bare.startsWith("ChIJ")) {
        return `places/${bare}`;
    }
    return `places/${bare.replace(/^places\//, "")}`;
}

export function pickBestSearchCandidateForCity(
    places: TextSearchPlace[],
    city_slug: string,
    center: { lat: number; lon: number },
): { hit: TextSearchPlace; resource: string } | null {
    const hints = addressHintsForCitySlug(city_slug);
    const eligible: TextSearchPlace[] = [];

    for (const p of places) {
        const label = trimOrEmpty(p.displayName?.text) || "?";
        const addr = trimOrEmpty(p.formattedAddress) || "(no address)";
        const resourceProbe = toPlacesResourceFromSearchHit(p);
        if (!resourceProbe) {
            console.log("[maps autofill] rejected: wrong city —", label, "|", addr, "| missing place id");
            continue;
        }
        const addrOk = addressMatchesCityHints(p, hints);
        const km = candidateDistanceKm(p, center);
        const distOk = km != null && km <= MAX_DISTANCE_KM_FOR_FALLBACK;
        if (addrOk || distOk) {
            eligible.push(p);
        } else {
            const distLabel = km != null ? `${km.toFixed(1)} km from ${city_slug}` : "no coords";
            console.log("[maps autofill] rejected: wrong city —", label, "|", addr, "|", distLabel);
        }
    }

    if (eligible.length === 0) {
        return null;
    }

    eligible.sort((a, b) => {
        const am = addressMatchesCityHints(a, hints);
        const bm = addressMatchesCityHints(b, hints);
        if (am !== bm) {
            return am ? -1 : 1;
        }
        const da = candidateDistanceKm(a, center) ?? 1e9;
        const db = candidateDistanceKm(b, center) ?? 1e9;
        return da - db;
    });

    const hit = eligible[0]!;
    const resource = toPlacesResourceFromSearchHit(hit);
    if (!resource) {
        return null;
    }
    const chosenAddr = trimOrEmpty(hit.formattedAddress) || "(no address)";
    const chosenName = trimOrEmpty(hit.displayName?.text) || "?";
    console.log("[maps autofill] chosen candidate:", chosenName, "|", chosenAddr);
    return { hit, resource };
}

export async function textSearchPlacesForCity(
    apiKey: string,
    textQuery: string,
    center: { lat: number; lon: number },
): Promise<TextSearchPlace[]> {
    const url = `${PLACES_V1}/places:searchText`;
    const body = {
        textQuery,
        languageCode: "ro",
        regionCode: "RO",
        pageSize: 5,
        locationBias: {
            circle: {
                center: { latitude: center.lat, longitude: center.lon },
                radius: TEXT_SEARCH_RADIUS_M,
            },
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
        },
        body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) {
        console.error("[maps autofill] fallback text search failed: HTTP", res.status, raw.slice(0, 400));
        return [];
    }
    let parsed: { places?: TextSearchPlace[] };
    try {
        parsed = JSON.parse(raw) as { places?: TextSearchPlace[] };
    } catch {
        console.error("[maps autofill] fallback text search failed: invalid JSON");
        return [];
    }
    return parsed.places ?? [];
}

const AUTOFILL_FAILED_MESSAGE =
    "Nu am putut identifica locul din acest link: nu apare un id Places (ChIJ…) și căutarea după text nu a returnat un rezultat clar. Încearcă „Share” din Google Maps sau un link care include numele locului în adresă.";

const AUTOFILL_WRONG_CITY_MESSAGE =
    "Niciun rezultat Google Places nu se potrivește orașului selectat (nume în adresă sau distanță față de centru). Verifică orașul din formular sau linkul.";

export async function fetchPlaceAutofillFromMapsUrl(
    apiKey: string,
    mapsUrlInput: string,
    city_slug: string,
    cityCenter: { lat: number; lon: number },
): Promise<{ ok: true; data: GoogleMapsPlaceAutofillResult } | { ok: false; message: string }> {
    const resolved = await resolveGoogleMapsUrl(mapsUrlInput);

    const resourceDirect = extractPlacesResourceFromResolvedUrl(resolved);

    const textQuery = extractTextQueryFromResolvedMapsUrl(resolved);

    async function finishFromResource(resource: string): Promise<
        | { ok: true; data: GoogleMapsPlaceAutofillResult }
        | { ok: false; message: string }
    > {
        const det = await fetchPlaceDetailsForAutofill(apiKey, resource);
        if (!det.ok) {
            if ("parseError" in det && det.parseError) {
                return { ok: false, message: "Răspuns invalid de la Google Places." };
            }
            return {
                ok: false,
                message:
                    "Google Places nu a returnat detalii pentru acest link. Verifică API key-ul și URL-ul.",
            };
        }
        const data = buildAutofillResult(det.json, resolved);
        if (!data) {
            return { ok: false, message: "Google nu a returnat numele locului." };
        }
        return { ok: true, data };
    }

    if (resourceDirect) {
        console.log("[maps autofill] direct place id found:", resourceDirect);
        return finishFromResource(resourceDirect);
    }

    if (!textQuery) {
        console.log(
            "[maps autofill] fallback text search failed: could not derive text query from URL",
        );
        return { ok: false, message: AUTOFILL_FAILED_MESSAGE };
    }

    const trimmedCity = city_slug.trim();
    if (!trimmedCity) {
        return { ok: false, message: "Lipsește city_slug pentru căutarea după oraș." };
    }

    console.log("[maps autofill] selected city:", trimmedCity);
    console.log("[maps autofill] fallback text search used, query:", JSON.stringify(textQuery));

    const candidates = await textSearchPlacesForCity(apiKey, textQuery, cityCenter);
    console.log("[maps autofill] fallback candidates count:", candidates.length);

    if (candidates.length === 0) {
        console.log("[maps autofill] fallback text search failed: no results");
        return { ok: false, message: AUTOFILL_FAILED_MESSAGE };
    }

    const picked = pickBestSearchCandidateForCity(candidates, trimmedCity, cityCenter);
    if (!picked) {
        console.log("[maps autofill] fallback text search failed: no candidate matched selected city");
        return { ok: false, message: AUTOFILL_WRONG_CITY_MESSAGE };
    }

    console.log("[maps autofill] fallback text search picked:", picked.resource);

    return finishFromResource(picked.resource);
}
