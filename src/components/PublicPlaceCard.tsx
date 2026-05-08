"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import type { Place } from "@/data/places";

export type PublicPlaceCardProps = {
  place: Pick<Place, "id" | "image" | "name" | "address"> & {
    rating?: number;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
  };
  citySlug: string;
  categorySlug: string;
  activeFeatured: boolean;
  activePromoted?: boolean;
  /** From /api/recommendations when user location is available (km). */
  distanceKm?: number | null;
  /** If set, card is a link (public list). If omitted, static preview (e.g. admin). */
  href?: string;
  /** Admin preview: subtle visibility hint */
  statusLabel?: "available" | "hidden";
  /** Optional title node (e.g. search highlight). */
  titleContent?: ReactNode;
  /** Kept for backward compatibility; all variants now use the same layout. */
  variant?: "default" | "compact";
  /** Optional width control from parent wrappers (e.g. carousels). */
  className?: string;
};

export function PublicPlaceCard({
  place,
  citySlug,
  categorySlug,
  activeFeatured,
  activePromoted = false,
  distanceKm,
  href,
  statusLabel,
  titleContent,
  variant = "default",
  className,
}: PublicPlaceCardProps) {
  void variant;
  const isFeatured = activeFeatured;
  const isPromotedOnly = activePromoted && !isFeatured;
  const showNearby =
    distanceKm != null && Number.isFinite(distanceKm) && distanceKm >= 0;
  const cityLabel = citySlug.replace(/-/g, " ");

  const ratingText =
    typeof place.rating === "number" &&
    Number.isFinite(place.rating) &&
    place.rating > 0
      ? `${place.rating.toFixed(1)} ★`
      : null;

  const shellClass =
    "group block h-full rounded-2xl outline-none transition-opacity duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-95";

  const cardToneClass =
    "h-full cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 ease-out md:group-hover:shadow";

  const cardInner = (
    <div className={cardToneClass}>
      <div className="relative overflow-hidden rounded-t-2xl">
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        {showNearby ? (
          <div className="pointer-events-none absolute bottom-2 left-2 z-10">
            <span className="inline-flex rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-gray-700 backdrop-blur-sm">
              {distanceKm.toFixed(1)} km
            </span>
          </div>
        ) : null}
        <PlaceImage
          place={place}
          citySlug={citySlug || "preview"}
          categorySlug={categorySlug || "preview"}
          width={600}
          height={400}
          className="h-36 w-full object-cover transition-transform duration-200 ease-out sm:h-40 md:group-hover:scale-[1.01]"
        />
      </div>
      <div className="px-3 py-2.5">
        {isFeatured ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 ring-1 ring-inset ring-yellow-200">
              Promovat
            </span>
          </div>
        ) : isPromotedOnly ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              Recomandat
            </span>
          </div>
        ) : null}
        <h3
          className="truncate text-[13px] font-semibold leading-snug text-gray-900 sm:text-sm"
        >
          {titleContent ?? place.name}
        </h3>
        <p
          className={`mt-1 text-[11px] font-medium tabular-nums ${
            ratingText ? "text-amber-600" : "text-transparent"
          }`}
          aria-hidden={!ratingText}
        >
          {ratingText ?? "0.0 ★"}
        </p>
        <p className="mt-0.5 truncate text-[11px] leading-snug text-gray-400 capitalize">
          {cityLabel}
        </p>
        {statusLabel ? (
          <p
            className={
              statusLabel === "available"
                ? "mt-2 border-t border-gray-100 pt-1.5 text-xs text-green-700/80"
                : "mt-2 border-t border-gray-100 pt-1.5 text-xs text-gray-500"
            }
          >
            {statusLabel === "available" ? "Public: visible" : "Public: hidden"}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`${shellClass} ${className ?? ""}`.trim()}>
        {cardInner}
      </Link>
    );
  }

  return <div className={`${shellClass} ${className ?? ""} pointer-events-none`.trim()}>{cardInner}</div>;
}
