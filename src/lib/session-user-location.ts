/** sessionStorage key for user geolocation tied to a city visit (session tab). */
export const SESSION_USER_LOCATION_KEY = "ghidurban:user_location";

const TTL_MS = 30 * 60 * 1000;

export type SessionUserLocation = {
  lat: number;
  lng: number;
  citySlug: string;
  savedAt: number;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object";
}

function isValidPayload(o: Record<string, unknown>): o is SessionUserLocation {
  const lat = o.lat;
  const lng = o.lng;
  const citySlug = o.citySlug;
  const savedAt = o.savedAt;
  return (
    typeof citySlug === "string" &&
    citySlug.trim().length > 0 &&
    typeof savedAt === "number" &&
    Number.isFinite(savedAt) &&
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function isExpired(savedAt: number, now: number): boolean {
  return now - savedAt > TTL_MS;
}

/** Remove stale or invalid entry. */
export function clearSessionUserLocation(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_USER_LOCATION_KEY);
  } catch {
    /* ignore */
  }
}

export function saveSessionUserLocation(input: {
  lat: number;
  lng: number;
  citySlug: string;
}): void {
  if (typeof window === "undefined") return;
  const payload: SessionUserLocation = {
    lat: input.lat,
    lng: input.lng,
    citySlug: input.citySlug.trim(),
    savedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(SESSION_USER_LOCATION_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Returns stored location if JSON is valid, not expired, and (when passed) citySlug matches.
 * Clears storage only when expired or malformed — mismatching city returns null without deleting
 * (alt oraș poate folosi aceeași sesiune mai târziu).
 */
export function readSessionUserLocation(
  forCitySlug?: string,
): SessionUserLocation | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(SESSION_USER_LOCATION_KEY);
  } catch {
    return null;
  }
  if (raw === null || raw === "") {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    clearSessionUserLocation();
    return null;
  }

  if (!isRecord(parsed) || !isValidPayload(parsed)) {
    clearSessionUserLocation();
    return null;
  }

  const now = Date.now();
  if (isExpired(parsed.savedAt, now)) {
    clearSessionUserLocation();
    return null;
  }

  const expected = forCitySlug?.trim();
  if (expected && parsed.citySlug !== expected) {
    return null;
  }

  return parsed;
}
