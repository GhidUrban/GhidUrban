/**
 * Google Places API (New) — import preview: cheap search → score → top N → Place Details only for that shortlist.
 * Search requests use minimal field masks; Place Details only for the final shortlist (see GOOGLE_IMPORT_PREVIEW_TOP_N).
 */

import { haversineKm } from "@/lib/haversine-km";
import {
    normalizeCanonicalGooglePlaceId,
    normalizePlaceAddressForDedupe,
} from "@/lib/repositories/place-repository";
import {
    GOOGLE_IMPORT_CATEGORY_MAP,
    type GoogleImportSupportedCategory,
} from "@/lib/google-import-categories";

const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1";

/** List step: enough to score, not full details (billing). */
const SEARCH_FIELD_MASK =
    "places.id,places.name,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount";

/** Details step: only for top N after scoring (see GOOGLE_IMPORT_PREVIEW_TOP_N). */
const DETAILS_FIELD_MASK =
    "websiteUri,internationalPhoneNumber,googleMapsUri,regularOpeningHours,photos";

const DETAILS_DELAY_MS = 120;

/**
 * Max preview rows returned to admin (each gets one Place Details call — main billing driver).
 * Exported for admin copy; change only here.
 */
export const GOOGLE_IMPORT_PREVIEW_TOP_N = 60;

/**
 * Raw candidates to pull from search before dedupe / distance / category filters.
 * Must stay above preview cap so enough rows survive filters (same pageSize/pagination logic).
 */
const GOOGLE_IMPORT_RAW_CANDIDATE_TARGET = Math.max(100, GOOGLE_IMPORT_PREVIEW_TOP_N * 2);

/** Google Places (New): maxim rezultate per cerere searchNearby / pagină searchText. */
const GOOGLE_IMPORT_SEARCH_PAGE_SIZE = 20;

/** searchNearby includedTypes pentru natura (fără tourist_attraction — prea larg). */
const GOOGLE_IMPORT_NATURA_NEARBY_TYPES = [
    "park",
    "hiking_area",
    "campground",
    "natural_feature",
] as const;

/** După search: rază max față de centrul orașului, pe categorie (km). */
const GOOGLE_IMPORT_LOCATION_MAX_KM_BY_CATEGORY: Record<
    GoogleImportSupportedCategory,
    number
> = {
    cafenele: 8,
    restaurante: 8,
    institutii: 10,
    cultural: 12,
    evenimente: 15,
    natura: 50,
    cazare: 20,
};

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

export type ExistingPlaceRow = {
    external_place_id: string | null;
    name: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
};

/** Normalized row for preview + commit (place_id filled on save). */
export type GoogleImportPreviewRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    website: string | null;
    phone: string | null;
    maps_url: string | null;
    schedule: string | null;
    rating: number | null;
    image: string | null;
    external_source: string;
    external_place_id: string;
    completenessScore: number;
    already_imported: boolean;
    /** Fuzzy / distance duplicate vs DB — show in UI, don’t import blindly. */
    likely_duplicate: boolean;
};

type GooglePlaceLite = {
    id?: string;
    name?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    types?: string[];
    rating?: number;
    userRatingCount?: number;
};

/** Canonical + variants for matching Google candidate ids against `importedIds`. */
export function addGooglePlaceIdVariantsToSet(set: Set<string>, raw: string): void {
    const c = normalizeCanonicalGooglePlaceId(raw.trim());
    if (!c) {
        return;
    }
    set.add(c);
    if (c.startsWith("places/")) {
        const tail = c.slice("places/".length).trim();
        if (tail) {
            set.add(tail);
        }
    } else {
        set.add(`places/${c}`);
    }
}

function importedIdsContainsImportedGoogleId(set: Set<string>, pidRaw: string): boolean {
    const t = pidRaw.trim();
    if (!t) {
        return false;
    }
    if (set.has(t)) {
        return true;
    }
    const c = normalizeCanonicalGooglePlaceId(t);
    if (c) {
        if (set.has(c)) {
            return true;
        }
        if (c.startsWith("places/")) {
            const tail = c.slice("places/".length).trim();
            if (tail && set.has(tail)) {
                return true;
            }
        } else if (set.has(`places/${c}`)) {
            return true;
        }
    }
    const withPrefix = t.startsWith("places/") ? t : `places/${t}`;
    return set.has(withPrefix);
}

function citySlugToReadableCity(citySlug: string): string {
    return citySlug.trim().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeWebsite(raw: string | null | undefined): string | null {
    if (!raw?.trim()) {
        return null;
    }
    let s = raw.trim();
    if (!/^https?:\/\//i.test(s)) {
        s = `https://${s}`;
    }
    return s;
}

function normalizePhone(raw: string | null | undefined): string | null {
    if (!raw?.trim()) {
        return null;
    }
    const s = raw.trim().split(/[;/]/)[0]?.trim() ?? "";
    return s || null;
}

function buildGooglePhotoUrl(photoName: string, apiKey: string): string {
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&key=${apiKey}`;
}

/** Types that boost score when they match our category (substring on Google type strings). */
function categoryTypeHints(category: GoogleImportSupportedCategory): string[] {
    const m: Record<GoogleImportSupportedCategory, string[]> = {
        cafenele: ["cafe", "coffee_shop", "espresso_bar", "coffee_store", "coffee"],
        restaurante: ["restaurant", "meal_takeaway", "food"],
        cultural: ["museum", "art_gallery", "cultural", "theater", "theatre", "performing"],
        natura: [
            "park",
            "natural_feature",
            "natural",
            "campground",
            "hiking_area",
            "hiking",
            "botanical",
        ],
        institutii: [
            "city_hall",
            "courthouse",
            "hospital",
            "government",
            "embassy",
            "local_government",
        ],
        evenimente: [
            "stadium",
            "arena",
            "event",
            "concert",
            "convention",
            "performing",
        ],
        cazare: [
            "lodging",
            "hotel",
            "motel",
            "hostel",
            "guest_house",
            "bed_and_breakfast",
            "resort",
        ],
    };
    return m[category] ?? [];
}

function typeMatchesCategory(types: string[] | undefined, category: GoogleImportSupportedCategory): boolean {
    if (!types?.length) {
        return false;
    }
    const hints = categoryTypeHints(category);
    const flat = types.map((t) => t.toLowerCase());
    for (const h of hints) {
        if (flat.some((t) => t.includes(h) || h.includes(t))) {
            return true;
        }
    }
    return false;
}

function namesLookAlike(a: string, b: string): boolean {
    const x = a.trim().toLowerCase();
    const y = b.trim().toLowerCase();
    if (!x || !y) {
        return false;
    }
    if (x === y) {
        return true;
    }
    if (x.includes(y) || y.includes(x)) {
        return true;
    }
    return false;
}

function isDuplicateOfExisting(
    googlePlaceId: string,
    name: string,
    lat: number | null,
    lon: number | null,
    formattedAddress: string | undefined,
    existing: ExistingPlaceRow[],
): boolean {
    const g = googlePlaceId.trim();
    for (const row of existing) {
        const ext = row.external_place_id?.trim();
        if (ext && ext === g) {
            return true;
        }
    }
    const candAddr = formattedAddress?.trim()
        ? normalizePlaceAddressForDedupe(formattedAddress)
        : "";
    if (candAddr.length > 0) {
        for (const row of existing) {
            const dbAddr = normalizePlaceAddressForDedupe(row.address ?? null);
            if (dbAddr.length > 0 && dbAddr === candAddr) {
                return true;
            }
        }
    }
    if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return false;
    }
    for (const row of existing) {
        const elat = row.latitude != null ? Number(row.latitude) : NaN;
        const elon = row.longitude != null ? Number(row.longitude) : NaN;
        if (!Number.isFinite(elat) || !Number.isFinite(elon)) {
            continue;
        }
        const km = haversineKm(lat, lon, elat, elon);
        if (km * 1000 <= 220 && row.name && namesLookAlike(name, row.name)) {
            return true;
        }
    }
    return false;
}

/** Hard blacklist (name, types, address). Website not available at search step. */
function cafeneleBlacklistHit(
    name: string,
    types: string[],
    formattedAddress: string | undefined,
): string | null {
    const n = name.toLowerCase();
    const t = types.map((x) => x.toLowerCase());
    const typeStr = t.join(" ");
    const addr = (formattedAddress ?? "").toLowerCase();
    const hay = `${n} ${typeStr} ${addr}`;

    if (t.some((x) => x.includes("gas_station"))) {
        return "blacklist:type gas_station";
    }

    const fuelBrands = /\b(rompetrol|lukoil|petrom|socar|omv|mol)\b/i;
    if (fuelBrands.test(hay)) {
        return "blacklist:fuel brand";
    }
    if (/\b(gas station|benzinar|benzinărie)\b/i.test(hay)) {
        return "blacklist:gas station text";
    }
    if (/\bfuel\b/i.test(n) || /\bpetrol\b/i.test(addr) || /\bpetrol\b/i.test(n)) {
        return "blacklist:fuel/petrol keyword";
    }

    if (typeStr.includes("pizza") || /\bpizza\b/i.test(hay)) {
        return "blacklist:pizza";
    }
    if (typeStr.includes("hamburger") || /\bburgers?\b/i.test(hay)) {
        return "blacklist:burgers";
    }
    if (/\bpasta\b/i.test(n)) {
        return "blacklist:pasta";
    }
    if (/\bgrill\b/i.test(hay)) {
        return "blacklist:grill";
    }
    if (/\bfast[-_\s]?food\b/i.test(hay) || typeStr.includes("fast_food")) {
        return "blacklist:fast food";
    }

    if (/\bpub\b/i.test(hay) && !/coffee|espresso|caffe|café/i.test(n)) {
        return "blacklist:pub";
    }
    if (/\bbar\b/i.test(n) && !/coffee|espresso|caffe|café/i.test(n)) {
        return "blacklist:bar";
    }

    if (/\brestaurant\b/i.test(n) && !/cafe|coffee|espresso|café/i.test(n)) {
        return "blacklist:restaurant (name)";
    }
    if (
        typeStr.includes("restaurant") &&
        !typeStr.includes("cafe") &&
        !typeStr.includes("coffee_shop") &&
        !typeStr.includes("espresso")
    ) {
        return "blacklist:restaurant (types only)";
    }

    if (typeStr.includes("night_club")) {
        return "blacklist:night_club";
    }
    if (
        typeStr.includes("meal_takeaway") &&
        !typeStr.includes("cafe") &&
        !typeStr.includes("coffee")
    ) {
        return "blacklist:meal_takeaway";
    }
    if (typeStr.includes("food_court")) {
        return "blacklist:food_court";
    }

    if (t.some((x) => x.includes("lodging") || x.includes("hotel"))) {
        return "blacklist:type lodging/hotel";
    }
    if (t.some((x) => x.includes("park") || x.includes("campground"))) {
        return "blacklist:type park";
    }

    return null;
}

/** Must look like a cafe / coffee business (types or name keywords). */
function cafenelePassesCoffeeGate(name: string, types: string[]): boolean {
    const n = name.toLowerCase();
    const typeStr = types.map((x) => x.toLowerCase()).join(" ");

    if (
        typeStr.includes("cafe") ||
        typeStr.includes("coffee_shop") ||
        typeStr.includes("espresso_bar") ||
        typeStr.includes("coffee_store")
    ) {
        return true;
    }
    if (/\bcoffee\b/.test(typeStr)) {
        return true;
    }

    if (
        /\bcafe\b|\bcaffe\b|\bcafé\b/i.test(n) ||
        /\bcoffee\b|\bespresso\b|\broastery\b|\blatte\b/i.test(n) ||
        /specialty\s+coffee|coffee\s+shop|bakery\s*&\s*cafe|brunch\s+coffee/i.test(n)
    ) {
        return true;
    }

    return false;
}

function cafeneleRejectReason(p: GooglePlaceLite): string | null {
    const name = p.displayName?.text ?? "";
    const types = p.types ?? [];
    const addr = p.formattedAddress;

    const bl = cafeneleBlacklistHit(name, types, addr);
    if (bl) {
        return bl;
    }
    if (!cafenelePassesCoffeeGate(name, types)) {
        return "no cafe/coffee signal (need cafe/coffee_shop/espresso types or cafe/coffee name)";
    }
    return null;
}

/** restaurante: drop hotel/lodging unless name says restaurant / bistro / brasserie */
function restauranteRejectReason(p: GooglePlaceLite): string | null {
    const name = p.displayName?.text ?? "";
    const nameLower = name.toLowerCase();
    const types = (p.types ?? []).map((t) => t.toLowerCase());
    const typeStr = types.join(" ");

    if (/\b(restaurant|bistro|brasserie)\b/i.test(nameLower)) {
        return null;
    }

    const lodgingInName =
        /\bhotel\b|\bhostel\b|\baccommodation\b|\blodging\b/i.test(nameLower);
    const lodgingInTypes =
        typeStr.includes("lodging") ||
        /\bhotel\b/i.test(typeStr) ||
        typeStr.includes("hostel");

    if (lodgingInName || lodgingInTypes) {
        return "lodging/hotel (name or types) without restaurant/bistro/brasserie in name";
    }
    return null;
}

function scoreCandidate(
    p: GooglePlaceLite,
    cityCenter: { lat: number; lon: number },
    category: GoogleImportSupportedCategory,
    duplicate: boolean,
): number {
    let s = 0;
    const types = p.types ?? [];
    if (typeMatchesCategory(types, category)) {
        s += 3;
    }

    if (category === "restaurante") {
        const typesStr = types.map((t) => t.toLowerCase()).join(" ");
        const nameStr = (p.displayName?.text ?? "").toLowerCase();
        const blob = `${typesStr} ${nameStr}`;
        if (typesStr.includes("restaurant") || /\brestaurant\b/i.test(nameStr)) {
            s += 4;
        }
        if (/\bbistro\b/i.test(blob)) {
            s += 3;
        }
        if (/\bgrill\b/i.test(blob) || typesStr.includes("barbecue")) {
            s += 3;
        }
        if (typesStr.includes("pizza") || /\bpizzeria\b/i.test(blob)) {
            s += 3;
        }
        if (/\bsteakhouse\b/i.test(blob) || typesStr.includes("steak")) {
            s += 3;
        }
    }

    if (category === "cafenele") {
        const typesStr = types.map((t) => t.toLowerCase()).join(" ");
        const nameStr = (p.displayName?.text ?? "").toLowerCase();
        if (
            typesStr.includes("cafe") ||
            typesStr.includes("coffee_shop") ||
            typesStr.includes("espresso_bar")
        ) {
            s += 4;
        } else if (typesStr.includes("coffee_store") || /\bcoffee\b/.test(typesStr)) {
            s += 3;
        } else if (/coffee|espresso|café|latte/i.test(nameStr)) {
            s += 2;
        }
        const negBlob = `${nameStr} ${typesStr}`;
        if (negBlob.includes("pizza") || negBlob.includes("pizzeria")) {
            s -= 5;
        }
        if (negBlob.includes("burger") || negBlob.includes("burgers")) {
            s -= 4;
        }
        if (negBlob.includes("pasta")) {
            s -= 3;
        }
        if (/\bpub\b/i.test(negBlob) || negBlob.includes("fast_food") || /\bfast[-\s]?food\b/i.test(negBlob)) {
            s -= 4;
        }
        if (negBlob.includes("grill")) {
            s -= 3;
        }
        if (/\bbar\b/i.test(nameStr) && !/coffee|espresso|café/i.test(nameStr)) {
            s -= 3;
        }
        if (/\brestaurant\b/i.test(nameStr) && !/cafe|coffee|espresso|café/i.test(nameStr)) {
            s -= 2;
        }
    }

    if (category === "cazare") {
        const typesStr = types.map((t) => t.toLowerCase()).join(" ");
        if (typesStr.includes("hotel") || typesStr.includes("lodging")) {
            s += 4;
        }
        if (typesStr.includes("hostel") || typesStr.includes("motel")) {
            s += 3;
        }
        if (typesStr.includes("guest_house") || typesStr.includes("bed_and_breakfast")) {
            s += 3;
        }
    }

    const lat = p.location?.latitude ?? null;
    const lon = p.location?.longitude ?? null;
    if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
        const km = haversineKm(lat, lon, cityCenter.lat, cityCenter.lon);
        if (km <= 2.5) {
            s += 2;
        } else if (km <= 8) {
            s += 1;
        } else if (km > 12) {
            s -= 2;
        }
    }

    const rating = p.rating;
    if (rating != null && Number.isFinite(rating)) {
        if (rating >= 4.2) {
            s += 2;
        } else if (rating >= 3.5) {
            s += 1;
        }
    }

    const urc = p.userRatingCount ?? 0;
    if (urc >= 100) {
        s += 2;
    } else if (urc >= 30) {
        s += 1;
    }

    if (duplicate) {
        s -= 3;
    }

    return s;
}

function distanceKmToCityCenter(
    p: GooglePlaceLite,
    cityCenter: { lat: number; lon: number },
): number | null {
    const la = p.location?.latitude;
    const lo = p.location?.longitude;
    if (la == null || lo == null || !Number.isFinite(la) || !Number.isFinite(lo)) {
        return null;
    }
    return haversineKm(la, lo, cityCenter.lat, cityCenter.lon);
}

function extractPlaceId(place: GooglePlaceLite): string {
    if (place.id?.trim()) {
        return place.id.trim();
    }
    const n = place.name?.trim() ?? "";
    const parts = n.split("/");
    return parts[parts.length - 1]?.trim() ?? n;
}

function liteToNormalized(
    place: GooglePlaceLite,
    city_slug: string,
    category_slug: GoogleImportSupportedCategory,
    score: number,
    alreadyImported: boolean,
    likelyDup: boolean,
    extra: {
        website: string | null;
        phone: string | null;
        maps_url: string | null;
        schedule: string | null;
        image: string | null;
    },
): GoogleImportPreviewRow {
    const googlePlaceId = extractPlaceId(place);
    const name = place.displayName?.text?.trim() || "—";
    const lat = place.location?.latitude ?? null;
    const lon = place.location?.longitude ?? null;
    let bonus = score;
    if (extra.website) {
        bonus += 1;
    }
    if (extra.phone) {
        bonus += 1;
    }
    if (extra.schedule) {
        bonus += 1;
    }

    return {
        place_id: "",
        city_slug,
        category_slug,
        name,
        address: place.formattedAddress?.trim() || null,
        latitude: lat,
        longitude: lon,
        website: extra.website,
        phone: extra.phone,
        maps_url: extra.maps_url,
        schedule: extra.schedule,
        rating: place.rating != null && Number.isFinite(place.rating) ? place.rating : null,
        image: extra.image,
        external_source: "google",
        external_place_id: googlePlaceId,
        completenessScore: bonus,
        already_imported: alreadyImported,
        likely_duplicate: likelyDup,
    };
}

async function fetchSearchNearby(
    apiKey: string,
    center: { lat: number; lon: number },
    includedTypes: string[],
    radiusM: number,
    rankPreference: "POPULARITY" | "DISTANCE" = "POPULARITY",
): Promise<GooglePlaceLite[]> {
    const url = `${GOOGLE_PLACES_BASE}/places:searchNearby`;
    const body = {
        locationRestriction: {
            circle: {
                center: { latitude: center.lat, longitude: center.lon },
                radius: radiusM,
            },
        },
        includedTypes,
        maxResultCount: GOOGLE_IMPORT_SEARCH_PAGE_SIZE,
        rankPreference,
        languageCode: "ro",
        regionCode: "RO",
    };

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": SEARCH_FIELD_MASK,
        },
        body: JSON.stringify(body),
    });

    const raw = await res.text();
    if (!res.ok) {
        console.error("[Google import] searchNearby HTTP", res.status, raw.slice(0, 500));
        return [];
    }
    let json: { places?: GooglePlaceLite[] };
    try {
        json = JSON.parse(raw) as { places?: GooglePlaceLite[] };
    } catch {
        console.error("[Google import] searchNearby invalid JSON");
        return [];
    }
    return json.places ?? [];
}

async function fetchSearchTextPage(
    apiKey: string,
    textQuery: string,
    center: { lat: number; lon: number },
    radiusM: number,
    pageToken?: string,
): Promise<{ places: GooglePlaceLite[]; nextPageToken?: string }> {
    const url = `${GOOGLE_PLACES_BASE}/places:searchText`;
    const body: Record<string, unknown> = {
        textQuery,
        languageCode: "ro",
        regionCode: "RO",
        pageSize: GOOGLE_IMPORT_SEARCH_PAGE_SIZE,
        locationBias: {
            circle: {
                center: { latitude: center.lat, longitude: center.lon },
                radius: radiusM,
            },
        },
    };
    if (pageToken) {
        body.pageToken = pageToken;
    }

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": SEARCH_FIELD_MASK,
        },
        body: JSON.stringify(body),
    });

    const raw = await res.text();
    if (!res.ok) {
        console.error("[Google import] searchText HTTP", res.status, raw.slice(0, 500));
        return { places: [] };
    }
    let json: { places?: GooglePlaceLite[]; nextPageToken?: string };
    try {
        json = JSON.parse(raw) as { places?: GooglePlaceLite[]; nextPageToken?: string };
    } catch {
        console.error("[Google import] searchText invalid JSON");
        return { places: [] };
    }
    return {
        places: json.places ?? [],
        nextPageToken: json.nextPageToken,
    };
}

function getSearchPoints(
    center: { lat: number; lon: number },
    radiusM: number,
): { lat: number; lon: number }[] {
    if (radiusM <= 12_000) return [center];
    const offsetDeg = (radiusM / 1000) * 0.005;
    return [
        center,
        { lat: center.lat + offsetDeg, lon: center.lon },
        { lat: center.lat - offsetDeg, lon: center.lon },
        { lat: center.lat, lon: center.lon + offsetDeg },
        { lat: center.lat, lon: center.lon - offsetDeg },
    ];
}

/** Nearby: max 20/request — search from multiple points for larger cities. */
async function collectNearbyRawCandidates(
    apiKey: string,
    center: { lat: number; lon: number },
    nearbyTypes: string[],
    radiusM: number,
    target: number,
): Promise<GooglePlaceLite[]> {
    const points = getSearchPoints(center, radiusM);
    const seen = new Set<string>();
    const out: GooglePlaceLite[] = [];

    for (const pt of points) {
        for (let i = 0; i < nearbyTypes.length; i++) {
            const t = nearbyTypes[i]!;
            if (out.length >= target) break;
            if (out.length > 0) {
                await sleep(DETAILS_DELAY_MS);
            }
            const chunk = await fetchSearchNearby(apiKey, pt, [t], radiusM, "POPULARITY");
            for (const p of chunk) {
                const pid = extractPlaceId(p);
                if (pid && seen.has(pid)) continue;
                if (pid) seen.add(pid);
                out.push(p);
                if (out.length >= target) break;
            }
        }
        if (out.length >= target) break;
    }

    if (out.length < target && nearbyTypes.length === 1) {
        await sleep(DETAILS_DELAY_MS);
        const chunk = await fetchSearchNearby(apiKey, center, nearbyTypes, radiusM, "DISTANCE");
        for (const p of chunk) {
            const pid = extractPlaceId(p);
            if (pid && seen.has(pid)) continue;
            if (pid) seen.add(pid);
            out.push(p);
            if (out.length >= target) break;
        }
    }

    console.log(`[Google import] nearby collected ${out.length} from ${points.length} search points`);
    return out.slice(0, target);
}

/** Text: paginare cu pageToken până la țintă sau epuizare. */
async function collectTextSearchRawCandidates(
    apiKey: string,
    textQuery: string,
    center: { lat: number; lon: number },
    radiusM: number,
    target: number,
): Promise<GooglePlaceLite[]> {
    const out: GooglePlaceLite[] = [];
    let pageToken: string | undefined;
    let pageNum = 0;
    do {
        const page = await fetchSearchTextPage(apiKey, textQuery, center, radiusM, pageToken);
        pageNum += 1;
        console.log(
            "[Google import] searchText page",
            pageNum,
            "raw_places:",
            page.places.length,
            "has_next_page:",
            Boolean(page.nextPageToken),
        );
        for (const p of page.places) {
            out.push(p);
            if (out.length >= target) break;
        }
        pageToken =
            out.length >= target ? undefined : page.nextPageToken?.trim() || undefined;
        if (pageToken) {
            await sleep(DETAILS_DELAY_MS);
        }
    } while (pageToken);
    return out.slice(0, target);
}

async function fetchPlaceDetails(
    apiKey: string,
    resourceName: string,
): Promise<{
    websiteUri?: string;
    internationalPhoneNumber?: string;
    googleMapsUri?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    photos?: { name: string }[];
}> {
    const url = `${GOOGLE_PLACES_BASE}/${resourceName}`;
    const maxAttempts = 4;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await fetch(url, {
                headers: {
                    "X-Goog-Api-Key": apiKey,
                    "X-Goog-FieldMask": DETAILS_FIELD_MASK,
                },
            });
            const raw = await res.text();
            if (!res.ok) {
                console.error("[Google import] Place Details HTTP", res.status, raw.slice(0, 400));
                if (res.status >= 500 && attempt < maxAttempts) {
                    await sleep(450 * attempt);
                    continue;
                }
                if (res.status === 429 && attempt < maxAttempts) {
                    await sleep(900 * attempt);
                    continue;
                }
                return {};
            }
            try {
                return JSON.parse(raw) as {
                    websiteUri?: string;
                    internationalPhoneNumber?: string;
                    googleMapsUri?: string;
                    regularOpeningHours?: { weekdayDescriptions?: string[] };
                    photos?: { name: string }[];
                };
            } catch {
                return {};
            }
        } catch (e) {
            lastErr = e;
            if (attempt < maxAttempts) {
                const msg = e instanceof Error ? e.message : String(e);
                console.warn("[Google import] Place Details fetch retry", attempt, msg);
                await sleep(550 * attempt);
                continue;
            }
        }
    }
    console.error("[Google import] Place Details failed after retries", lastErr);
    return {};
}

export type GoogleImportPreviewMeta = {
    strategy: string;
    raw_candidate_count: number;
    after_dedupe: number;
    after_location_filter: number;
    after_category_filters: number;
    after_scoring_sort: number;
    top_n: number;
    details_fetched: number;
};

export async function runGoogleImportPreview(options: {
    apiKey: string;
    city_slug: string;
    category_slug: GoogleImportSupportedCategory;
    cityCenter: { lat: number; lon: number };
    existing: ExistingPlaceRow[];
    /** Imported external IDs in DB (exact skip). */
    importedIds: Set<string>;
    /** Batch scripts: fetch details for more rows (default GOOGLE_IMPORT_PREVIEW_TOP_N). */
    previewTopN?: number;
    /** More search results before scoring (default scales with previewTopN). */
    rawCandidateTarget?: number;
}): Promise<{ rows: GoogleImportPreviewRow[]; meta: GoogleImportPreviewMeta }> {
    const { apiKey, city_slug, category_slug, cityCenter, existing, importedIds } = options;
    const previewTopN = Math.max(
        1,
        Math.min(200, options.previewTopN ?? GOOGLE_IMPORT_PREVIEW_TOP_N),
    );
    const rawCandidateTarget = Math.max(
        previewTopN,
        options.rawCandidateTarget ?? Math.max(100, previewTopN * 2),
    );
    const cfg = GOOGLE_IMPORT_CATEGORY_MAP[category_slug];
    const readable = citySlugToReadableCity(city_slug);

    let rawList: GooglePlaceLite[] = [];

    if (category_slug === "natura" && cfg.textKeywords?.length) {
        const naturaTypes = [...GOOGLE_IMPORT_NATURA_NEARBY_TYPES];
        console.log("[natura nearby types final] " + naturaTypes.join(", "));
        console.log(
            "[Google import] searchNearby",
            category_slug,
            "types:",
            naturaTypes.join(","),
            "r=",
            cfg.radiusM,
        );
        const nearbyPart = await collectNearbyRawCandidates(
            apiKey,
            cityCenter,
            naturaTypes,
            cfg.radiusM,
            rawCandidateTarget,
        );
        const textQuery = `${cfg.textKeywords.join(" ")} ${readable} Romania`.replace(/\s+/g, " ").trim();
        console.log("[Google import] searchText q=", textQuery.slice(0, 120));
        const textPart = await collectTextSearchRawCandidates(
            apiKey,
            textQuery,
            cityCenter,
            cfg.radiusM,
            rawCandidateTarget,
        );
        rawList = [...nearbyPart, ...textPart];
    } else if (category_slug === "cazare" && cfg.nearbyTypes?.length && cfg.textKeywords?.length) {
        const cazareTypes = [...cfg.nearbyTypes];
        console.log("[cazare types] lodging");
        console.log(
            "[Google import] searchNearby",
            category_slug,
            "types:",
            cazareTypes.join(","),
            "r=",
            cfg.radiusM,
        );
        const nearbyPart = await collectNearbyRawCandidates(
            apiKey,
            cityCenter,
            cazareTypes,
            cfg.radiusM,
            rawCandidateTarget,
        );
        const textQuery = `${cfg.textKeywords.join(" ")} ${readable} Romania`.replace(/\s+/g, " ").trim();
        console.log("[Google import] searchText q=", textQuery.slice(0, 120));
        const textPart = await collectTextSearchRawCandidates(
            apiKey,
            textQuery,
            cityCenter,
            cfg.radiusM,
            rawCandidateTarget,
        );
        rawList = [...nearbyPart, ...textPart];
    } else if (cfg.strategy === "nearby" && cfg.nearbyTypes?.length) {
        console.log(
            "[Google import] searchNearby",
            category_slug,
            "types:",
            cfg.nearbyTypes.join(","),
            "r=",
            cfg.radiusM,
        );
        const nearbyPart = await collectNearbyRawCandidates(
            apiKey,
            cityCenter,
            cfg.nearbyTypes,
            cfg.radiusM,
            rawCandidateTarget,
        );
        rawList = [...nearbyPart];
        if (cfg.textKeywords?.length) {
            const textQuery = `${cfg.textKeywords.join(" ")} ${readable} Romania`.replace(/\s+/g, " ").trim();
            console.log("[Google import] searchText q=", textQuery.slice(0, 120));
            const textPart = await collectTextSearchRawCandidates(
                apiKey,
                textQuery,
                cityCenter,
                cfg.radiusM,
                rawCandidateTarget,
            );
            rawList = [...rawList, ...textPart];
        }
    } else if (cfg.strategy === "text" && cfg.textKeywords?.length) {
        const textQuery = `${cfg.textKeywords.join(" ")} ${readable} Romania`.replace(/\s+/g, " ").trim();
        console.log("[Google import] searchText q=", textQuery.slice(0, 120));
        rawList = await collectTextSearchRawCandidates(
            apiKey,
            textQuery,
            cityCenter,
            cfg.radiusM,
            rawCandidateTarget,
        );
    }

    const raw_candidate_count = rawList.length;
    console.log("[Google import] raw candidates (before dedupe):", raw_candidate_count);

    const byId = new Map<string, GooglePlaceLite>();
    for (const p of rawList) {
        const id = extractPlaceId(p);
        if (id && !byId.has(id)) {
            byId.set(id, p);
        }
    }
    let deduped = Array.from(byId.values());
    const after_dedupe = deduped.length;
    console.log("[Google import] after dedupe:", after_dedupe);

    const locationMaxKm = GOOGLE_IMPORT_LOCATION_MAX_KM_BY_CATEGORY[category_slug];
    console.log(`[location filter] ${category_slug} max distance = ${locationMaxKm} km`);

    const beforeLocFilter = deduped.length;
    deduped = deduped.filter((p) => {
        const display = p.displayName?.text?.trim() ?? "—";
        const d = distanceKmToCityCenter(p, cityCenter);
        if (d == null) {
            console.log(`[location filter] removed ${display} (distance: no coords)`);
            return false;
        }
        if (d > locationMaxKm) {
            console.log(`[location filter] removed ${display} (distance: ${d.toFixed(1)} km)`);
            return false;
        }
        return true;
    });
    console.log(
        "[Google import] location radius filter removed:",
        beforeLocFilter - deduped.length,
        "remaining:",
        deduped.length,
        "max_km:",
        locationMaxKm,
    );
    const after_location_filter = deduped.length;
    console.log("[Google import] after location filter:", after_location_filter);

    if (category_slug === "cafenele") {
        const beforeCafeFilter = deduped.length;
        deduped = deduped.filter((p) => {
            const display = p.displayName?.text?.trim() ?? "—";
            const reason = cafeneleRejectReason(p);
            if (reason) {
                console.log(`[cafenele filter] rejected ${display} because ${reason}`);
                return false;
            }
            return true;
        });
        console.log(
            "[Google import] cafenele hard filter removed:",
            beforeCafeFilter - deduped.length,
            "remaining:",
            deduped.length,
        );
    }

    if (category_slug === "restaurante") {
        const beforeRestFilter = deduped.length;
        deduped = deduped.filter((p) => {
            const display = p.displayName?.text?.trim() ?? "—";
            const reason = restauranteRejectReason(p);
            if (reason) {
                console.log(`[restaurante filter] rejected ${display} because ${reason}`);
                return false;
            }
            return true;
        });
        console.log(
            "[Google import] restaurante lodging filter removed:",
            beforeRestFilter - deduped.length,
            "remaining:",
            deduped.length,
        );
    }

    const after_category_filters = deduped.length;
    console.log("[Google import] after category filters:", after_category_filters);

    const scored = deduped.map((p) => {
        const pid = extractPlaceId(p);
        const lat = p.location?.latitude ?? null;
        const lon = p.location?.longitude ?? null;
        const name = p.displayName?.text?.trim() || "";
        const likelyDup = isDuplicateOfExisting(
            pid,
            name,
            lat,
            lon,
            p.formattedAddress,
            existing,
        );
        const already = importedIdsContainsImportedGoogleId(importedIds, pid);
        const s = scoreCandidate(p, cityCenter, category_slug, likelyDup);
        return { place: p, score: s, likelyDup, already };
    });

    scored.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return (a.place.displayName?.text ?? "").localeCompare(
            b.place.displayName?.text ?? "",
            "ro",
        );
    });

    const after_scoring_sort = scored.length;
    const top = scored.slice(0, previewTopN);
    console.log(
        "[Google import] top",
        previewTopN,
        "selected from",
        after_scoring_sort,
    );

    const rows: GoogleImportPreviewRow[] = [];
    let details_fetched = 0;

    for (const item of top) {
        const p = item.place;
        const resourceName = p.name?.trim();
        const pid = extractPlaceId(p);
        const name = p.displayName?.text?.trim() || "";
        const lat = p.location?.latitude ?? null;
        const lon = p.location?.longitude ?? null;
        const likelyDup = isDuplicateOfExisting(
            pid,
            name,
            lat,
            lon,
            p.formattedAddress,
            existing,
        );

        let website: string | null = null;
        let phone: string | null = null;
        let maps_url: string | null = null;
        let schedule: string | null = null;

        let image: string | null = null;

        if (resourceName) {
            const det = await fetchPlaceDetails(apiKey, resourceName);
            details_fetched += 1;
            website = normalizeWebsite(det.websiteUri);
            phone = normalizePhone(det.internationalPhoneNumber);
            maps_url = det.googleMapsUri?.trim() || null;
            const wd = det.regularOpeningHours?.weekdayDescriptions;
            if (wd?.length) {
                schedule = wd.join("\n");
            }
            if (det.photos && det.photos.length > 0) {
                image = buildGooglePhotoUrl(det.photos[0].name, apiKey);
            }
            await sleep(DETAILS_DELAY_MS);
        }

        rows.push(
            liteToNormalized(p, city_slug, category_slug, item.score, item.already, likelyDup, {
                website,
                phone,
                maps_url,
                schedule,
                image,
            }),
        );
    }

    console.log("[Google import] details fetched:", details_fetched);
    console.log("[Google import] final preview rows:", rows.length);

    return {
        rows,
        meta: {
            strategy: cfg.strategy,
            raw_candidate_count,
            after_dedupe,
            after_location_filter,
            after_category_filters,
            after_scoring_sort,
            top_n: rows.length,
            details_fetched,
        },
    };
}
