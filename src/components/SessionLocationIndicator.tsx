"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearSessionUserLocation,
  dispatchSessionLocationChanged,
  readSessionUserLocation,
  saveSessionUserLocation,
} from "@/lib/session-user-location";
import {
  DEFAULT_GEO_OPTIONS,
  requestCurrentPositionWithRetry,
} from "@/lib/geolocation-retry";
import {
  LOCATION_PILL_DOT,
  locationPillBaseClass,
  locationPillToneClass,
  type LocationPillSize,
} from "@/components/location-pill-style";

type SessionLocationIndicatorProps = {
  citySlug: string;
  size?: LocationPillSize;
};

function pillClassName(active: boolean, busy: boolean, size: LocationPillSize) {
  return `${locationPillBaseClass(size)} ${locationPillToneClass(active, busy, size)}`;
}

export function SessionLocationIndicator({
  citySlug,
  size = "compact",
}: SessionLocationIndicatorProps) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inFlight, setInFlight] = useState(false);

  useEffect(() => {
    const s = readSessionUserLocation(citySlug);
    setActive(Boolean(s));
  }, [citySlug]);

  const handleActivate = useCallback(() => {
    if (inFlight) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setInFlight(true);
    setBusy(true);
    void requestCurrentPositionWithRetry(navigator.geolocation, DEFAULT_GEO_OPTIONS, {
      retries: 2,
      delayMs: 700,
      onTemporaryRetry: (attempt) => {
        if (process.env.NODE_ENV !== "production") {
          console.info(`[geo] temporary failure, retry ${attempt}/2`);
        }
      },
    })
      .then((position) => {
        const { latitude, longitude } = position.coords;
        saveSessionUserLocation({
          lat: latitude,
          lng: longitude,
          citySlug,
        });
        dispatchSessionLocationChanged();
        setActive(true);
      })
      .catch(() => {
        // Keep existing UX here: no extra error label, just stop loading.
      })
      .finally(() => {
        setBusy(false);
        setInFlight(false);
      });
  }, [citySlug, inFlight]);

  const handleDeactivate = useCallback(() => {
    clearSessionUserLocation();
    dispatchSessionLocationChanged();
    setActive(false);
  }, []);

  const label = busy
    ? "Se solicită..."
    : active
      ? "Dezactivează locația"
      : "Folosește locația mea";

  return (
    <button
      type="button"
      onClick={() => {
        if (busy) return;
        if (active) handleDeactivate();
        else handleActivate();
      }}
      disabled={busy}
      aria-busy={busy}
      aria-pressed={active}
      className={pillClassName(active, busy, size)}
      title={active ? "Elimină locația salvată pentru această sesiune" : undefined}
    >
      {active ? (
        <span className={LOCATION_PILL_DOT} aria-hidden />
      ) : null}
      {label}
    </button>
  );
}
