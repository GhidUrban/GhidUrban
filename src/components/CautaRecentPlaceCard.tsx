"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RecentPlaceVisit } from "@/lib/cauta-recent-places";
import {
  PLACE_IMAGE_PLACEHOLDER,
  resolveRecentVisitImageSrc,
} from "@/lib/resolve-place-image-src";

type CautaRecentPlaceCardProps = {
  visit: RecentPlaceVisit;
  disabled?: boolean;
};

/** Compact tile for „Vizitate recent” on /cauta. */
export function CautaRecentPlaceCard({
  visit,
  disabled = false,
}: CautaRecentPlaceCardProps) {
  const resolved = resolveRecentVisitImageSrc({
    category_slug: visit.category_slug,
    image: visit.image,
    google_match_status: visit.google_match_status,
    google_photo_uri: visit.google_photo_uri,
    image_url: visit.image_url,
  });
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [resolved]);

  const src = loadFailed ? PLACE_IMAGE_PLACEHOLDER : resolved;
  const showRating =
    typeof visit.rating === "number" &&
    Number.isFinite(visit.rating) &&
    visit.rating > 0;
  const categoryTrimmed = visit.category_name?.trim() ?? "";
  const ratingText = showRating ? visit.rating : null;

  return (
    <Link
      href={visit.href}
      className={`group flex w-[9.25rem] shrink-0 flex-col overflow-hidden rounded-xl border border-black/10 bg-white outline-none transition-[opacity,border-color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 ${
        disabled
          ? "pointer-events-none opacity-50"
          : "active:opacity-95 md:hover:border-black/20 md:hover:bg-gray-50/80"
      }`}
      tabIndex={disabled ? -1 : undefined}
      aria-disabled={disabled ? true : undefined}
    >
      <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-t-xl bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- same resolved URLs as PlaceImage */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setLoadFailed(true)}
        />
      </div>
      <div className="flex flex-col px-2 py-1">
        <span className="block min-h-5 min-w-0 truncate whitespace-nowrap text-left text-xs font-medium leading-5 text-gray-900">
          {visit.name}
        </span>
        <div className="mt-0.5 min-h-[11px]">
          {ratingText != null ? (
            <span className="block truncate text-[11px] tabular-nums leading-tight text-gray-500">
              Notă {ratingText.toFixed(1)}
            </span>
          ) : categoryTrimmed.length > 0 ? (
            <span className="block truncate whitespace-nowrap text-[11px] leading-tight text-gray-500">
              {categoryTrimmed}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
