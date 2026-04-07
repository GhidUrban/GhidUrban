"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function getUsableImageSrc(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t.length > 0 ? t : null;
}

type CautaRecentPlaceCardProps = {
  href: string;
  name: string;
  imageUrl?: string | null;
  disabled?: boolean;
};

/** Compact tile: thumbnail + title only (Vizitate recent on /cauta). Not `PublicPlaceCard`. */
export function CautaRecentPlaceCard({
  href,
  name,
  imageUrl,
  disabled = false,
}: CautaRecentPlaceCardProps) {
  const src = getUsableImageSrc(imageUrl);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [imageUrl]);

  const showImage = src !== null && !loadFailed;

  return (
    <Link
      href={href}
      className={`flex w-40 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/50 ${
        disabled
          ? "pointer-events-none opacity-50"
          : "hover:border-gray-200/90 hover:shadow"
      }`}
      tabIndex={disabled ? -1 : undefined}
      aria-disabled={disabled ? true : undefined}
    >
      <div className="relative h-28 w-full shrink-0 bg-gray-100">
        {showImage && src ? (
          // eslint-disable-next-line @next/next/no-img-element -- same resolved URLs as PlaceImage
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <div className="h-full w-full bg-gray-100" aria-hidden />
        )}
      </div>
      <div className="flex min-h-[3.25rem] flex-col justify-start px-2.5 pb-2.5 pt-2">
        <span className="line-clamp-2 text-left text-sm font-medium leading-snug text-gray-900">
          {name}
        </span>
      </div>
    </Link>
  );
}
