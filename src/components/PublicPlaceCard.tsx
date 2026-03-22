"use client";

import Link from "next/link";
import { PlaceImage } from "@/components/PlaceImage";
import type { Place } from "@/data/places";

export type PublicPlaceCardProps = {
  place: Pick<Place, "id" | "image" | "name" | "address">;
  citySlug: string;
  categorySlug: string;
  activeFeatured: boolean;
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
  href,
  statusLabel,
}: PublicPlaceCardProps) {
  const isFeatured = activeFeatured;

  const shellClass =
    "group block h-full rounded-2xl outline-none transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:translate-y-0.5 active:opacity-90";

  const cardInner = (
    <div
      className={
        isFeatured
          ? "h-full cursor-pointer overflow-hidden rounded-2xl border border-yellow-200 bg-white shadow-md ring-1 ring-yellow-100 transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg"
          : "h-full cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg"
      }
    >
      <div className="relative overflow-hidden rounded-t-2xl">
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
          <span className="mb-2 inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 ring-1 ring-inset ring-yellow-200">
            Featured
          </span>
        ) : null}
        <h3 className="text-sm font-semibold text-gray-900">{place.name}</h3>
        {place.address?.trim() ? (
          <p className="mt-1 text-sm text-gray-500">{place.address.trim()}</p>
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
