"use client";

import {
  clearSessionUserLocation,
  readSessionUserLocation,
  saveSessionUserLocation,
} from "@/lib/session-user-location";
import { useCallback, useEffect, useState } from "react";

type GeoStatus = "idle" | "loading" | "success" | "error";

type CityGeolocationCardProps = {
  citySlug: string;
  /** Inline (breadcrumb or search row): no outer vertical margins, slimmer pill. */
  compact?: boolean;
};

const pillBase =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#008fa8]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm";

const pillIdle =
  "cursor-pointer bg-white border-black/10 text-[#0B2A3C] hover:border-black/20 hover:bg-gray-50";

const pillLoading =
  "cursor-wait bg-white border-black/10 text-gray-500 disabled:pointer-events-none disabled:opacity-100";

const pillActive =
  "cursor-pointer bg-[#2EC4B6]/10 border-[#2EC4B6]/20 text-[#0B2A3C] underline-offset-2 hover:bg-[#2EC4B6]/14 hover:border-[#2EC4B6]/35 hover:underline active:bg-[#2EC4B6]/12";

export function CityGeolocationCard({
  citySlug,
  compact = false,
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

  const pillStateClass = busy ? pillLoading : isActive ? pillActive : pillIdle;

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
        className={`${pillBase} ${pillStateClass}`}
      >
        {isActive ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2EC4B6] sm:h-2 sm:w-2"
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
