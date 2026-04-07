"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import type { Place } from "@/data/places";

function AddressPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export type PublicPlaceCardProps = {
  place: Pick<Place, "id" | "image" | "name" | "address"> & { rating?: number };
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
}: PublicPlaceCardProps) {
  const isFeatured = activeFeatured;
  const isPromotedOnly = activePromoted && !isFeatured;
  const showNearby =
    distanceKm != null && Number.isFinite(distanceKm) && distanceKm >= 0;

  const ratingText =
    typeof place.rating === "number" &&
    Number.isFinite(place.rating) &&
    place.rating > 0
      ? `Notă ${place.rating.toFixed(1)}`
      : null;

  const shellClass =
    "group block h-full rounded-2xl outline-none transition-opacity duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-90";

  const cardToneClass =
    "h-full cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 ease-out md:group-hover:shadow";

  const cardInner = (
    <div className={cardToneClass}>
      <div className="relative overflow-hidden">
        {showNearby ? (
          <div className="pointer-events-none absolute left-2 top-2 z-10">
            <span className="inline-flex rounded-md border border-black/[0.06] bg-white/95 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-600">
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
          className="h-40 w-full object-cover transition-transform duration-200 ease-out md:group-hover:scale-[1.01]"
        />
      </div>
      <div className="p-3">
        {isFeatured ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 ring-1 ring-inset ring-yellow-200">
              Promovat
            </span>
          </div>
        ) : isPromotedOnly ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              Recomandat
            </span>
          </div>
        ) : null}
        <h3 className="min-w-0 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">
          {titleContent ?? place.name}
        </h3>
        {place.address?.trim() ? (
          <div className="mt-1 flex items-center gap-1">
            <AddressPinIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <p className="min-w-0 text-sm leading-snug text-gray-500">{place.address.trim()}</p>
          </div>
        ) : null}
        {ratingText ? (
          <p className="mt-2 text-sm font-medium leading-snug text-gray-700">{ratingText}</p>
        ) : null}
        {statusLabel ? (
          <p
            className={
              statusLabel === "available"
                ? "mt-3 border-t border-gray-100 pt-2 text-xs text-green-700/80"
                : "mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500"
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
      <Link href={href} className={shellClass}>
        {cardInner}
      </Link>
    );
  }

  return <div className={`${shellClass} pointer-events-none`}>{cardInner}</div>;
}
