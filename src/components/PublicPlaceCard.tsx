"use client";

import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import type { Place } from "@/data/places";

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
}: PublicPlaceCardProps) {
  const isFeatured = activeFeatured;
  const isPromotedOnly = activePromoted && !isFeatured;
  const showNearby =
    distanceKm != null && Number.isFinite(distanceKm) && distanceKm >= 0;

  const shellClass =
    "group block h-full rounded-2xl outline-none transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:translate-y-0.5 active:opacity-90";

  const cardToneClass = isFeatured
    ? "h-full cursor-pointer overflow-hidden rounded-2xl border border-yellow-200 bg-white shadow-md ring-1 ring-yellow-100 transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg"
    : isPromotedOnly
      ? "h-full cursor-pointer overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm ring-1 ring-blue-100/80 transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg"
      : "h-full cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg";

  const cardInner = (
    <div className={cardToneClass}>
      <div className="relative overflow-hidden rounded-t-2xl">
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
          className="h-36 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-4">
        {isFeatured ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 ring-1 ring-inset ring-yellow-200">
              Promovat
            </span>
          </div>
        ) : isPromotedOnly ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              Recomandat
            </span>
          </div>
        ) : null}
        <h3 className="text-sm font-semibold text-gray-900">{place.name}</h3>
        {place.address?.trim() ? (
          <p className="mt-1 text-sm text-gray-500">{place.address.trim()}</p>
        ) : null}
        {typeof place.rating === "number" &&
        Number.isFinite(place.rating) &&
        place.rating > 0 ? (
          <p className="mt-1 text-xs text-gray-500">Notă {place.rating.toFixed(1)}</p>
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
