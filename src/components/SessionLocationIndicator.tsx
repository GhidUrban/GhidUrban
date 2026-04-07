"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearSessionUserLocation,
  dispatchSessionLocationChanged,
  readSessionUserLocation,
  saveSessionUserLocation,
} from "@/lib/session-user-location";
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

  useEffect(() => {
    const s = readSessionUserLocation(citySlug);
    setActive(Boolean(s));
  }, [citySlug]);

  const handleActivate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        saveSessionUserLocation({
          lat: latitude,
          lng: longitude,
          citySlug,
        });
        dispatchSessionLocationChanged();
        setActive(true);
        setBusy(false);
      },
      () => {
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 },
    );
  }, [citySlug]);

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
