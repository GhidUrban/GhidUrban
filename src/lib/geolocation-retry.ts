export const DEFAULT_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12_000,
  maximumAge: 600_000,
};

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  onTemporaryRetry?: (attempt: number, error: GeolocationPositionError) => void;
};

function isTemporaryGeolocationError(error: GeolocationPositionError): boolean {
  if (error.code === error.POSITION_UNAVAILABLE) {
    return true;
  }
  const msg = (error.message || "").toLowerCase();
  return msg.includes("kclerrorlocationunknown") || msg.includes("locationunknown");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function requestCurrentPosition(
  geo: Geolocation,
  options: PositionOptions = DEFAULT_GEO_OPTIONS,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    geo.getCurrentPosition(resolve, reject, options);
  });
}

export async function requestCurrentPositionWithRetry(
  geo: Geolocation,
  options: PositionOptions = DEFAULT_GEO_OPTIONS,
  retry: RetryOptions = {},
): Promise<GeolocationPosition> {
  const retries = retry.retries ?? 2;
  const delayMs = retry.delayMs ?? 700;
  let attempt = 0;
  // attempts = 1 + retries
  while (true) {
    try {
      return await requestCurrentPosition(geo, options);
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      if (attempt >= retries || !isTemporaryGeolocationError(geoError)) {
        throw geoError;
      }
      attempt += 1;
      retry.onTemporaryRetry?.(attempt, geoError);
      await sleep(delayMs);
    }
  }
}
