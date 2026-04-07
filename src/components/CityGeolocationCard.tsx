"use client";

import {
  clearSessionUserLocation,
  dispatchSessionLocationChanged,
  readSessionUserLocation,
  saveSessionUserLocation,
} from "@/lib/session-user-location";
import { useCallback, useEffect, useState } from "react";
import {
  LOCATION_PILL_DOT,
  locationPillBaseClass,
  locationPillToneClass,
  type LocationPillSize,
} from "@/components/location-pill-style";

type GeoStatus = "idle" | "loading" | "success" | "error";

type CityGeolocationCardProps = {
  citySlug: string;
  /** Inline (breadcrumb or search row): no outer vertical margins, slimmer pill. */
  compact?: boolean;
  size?: LocationPillSize;
};

export function CityGeolocationCard({
  citySlug,
  compact = false,
  size = "compact",
}: CityGeolocationCardProps) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const existing = readSessionUserLocation(citySlug);
    setErrorMessage(null);
    if (existing) {
      setStatus("success");
    } else {
      setStatus("idle");
    }
  }, [citySlug]);

  const handleDeactivate = useCallback(() => {
    clearSessionUserLocation();
    dispatchSessionLocationChanged();
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const handleUseLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setErrorMessage("Geolocația nu e disponibilă.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        saveSessionUserLocation({
          lat: latitude,
          lng: longitude,
          citySlug,
        });
        dispatchSessionLocationChanged();
        setStatus("success");
      },
      (err) => {
        setStatus("error");
        setErrorMessage(
          err.code === err.PERMISSION_DENIED
            ? "Acces refuzat."
            : "Nu am putut obține locația.",
        );
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 },
    );
  }, [citySlug]);

  const busy = status === "loading";
  const isActive = status === "success";

  const label = busy
    ? "Se solicită..."
    : isActive
      ? "Dezactivează locația"
      : "Folosește locația mea";

  const pillStateClass = `${locationPillToneClass(isActive, busy, size)} ${
    busy ? "cursor-wait disabled:pointer-events-none disabled:opacity-100" : "cursor-pointer"
  }`;

  return (
    <div
      className={
        compact
          ? "m-0 flex shrink-0 flex-col items-end gap-0.5 p-0"
          : "mt-3 mb-4"
      }
    >
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        aria-pressed={isActive}
        title={
          isActive
            ? "Elimină locația salvată pentru această sesiune"
            : undefined
        }
        onClick={() => {
          if (busy) return;
          if (isActive) handleDeactivate();
          else handleUseLocation();
        }}
        className={`${locationPillBaseClass(size)} ${pillStateClass}`}
      >
        {isActive ? (
          <span
            className={`${LOCATION_PILL_DOT} shrink-0`}
            aria-hidden
          />
        ) : null}
        {label}
      </button>
      {status === "error" && errorMessage ? (
        <p
          className={`text-xs text-red-500 ${compact ? "mt-1 max-w-[min(18rem,85vw)] text-right" : "mt-1.5"}`}
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
