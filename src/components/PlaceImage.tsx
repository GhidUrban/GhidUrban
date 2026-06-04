"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Place } from "@/data/places";
import type { PlaceImageFields } from "@/lib/place-image";
import { resolvePlaceImageSrc } from "@/lib/place-image";
import { isDisplayablePlaceImageUrl } from "@/lib/resolve-place-image-src";

type PlaceImageProps = {
  place: Pick<Place, "name"> & PlaceImageFields;
  citySlug: string;
  categorySlug: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

function PlaceImageCssFallback({ className }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-br from-gray-100 to-gray-200/90 ${className ?? ""}`}
      aria-hidden
    />
  );
}

export function PlaceImage({
  place,
  citySlug,
  categorySlug,
  width,
  height,
  className,
  priority,
}: PlaceImageProps) {
  const resolved = resolvePlaceImageSrc({
    image: place.image,
    google_match_status: place.google_match_status,
    google_photo_uri: place.google_photo_uri,
    category_slug: categorySlug,
  });
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [resolved]);

  const showCssFallback = loadFailed || !isDisplayablePlaceImageUrl(resolved);
  if (showCssFallback) {
    return <PlaceImageCssFallback className={className} />;
  }

  const isRemote = resolved.startsWith("http://") || resolved.startsWith("https://");

  return (
    <Image
      src={resolved}
      alt={place.name}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={isRemote}
      onError={() => setLoadFailed(true)}
    />
  );
}
