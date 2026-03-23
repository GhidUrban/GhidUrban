"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Place } from "@/data/places";
import {
  PLACE_IMAGE_PLACEHOLDER,
  resolvePlaceImageSrc,
} from "@/lib/place-image";

type PlaceImageProps = {
  place: Pick<Place, "id" | "image" | "name">;
  citySlug: string;
  categorySlug: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

export function PlaceImage({
  place,
  citySlug,
  categorySlug,
  width,
  height,
  className,
  priority,
}: PlaceImageProps) {
  const resolved = resolvePlaceImageSrc(place, citySlug, categorySlug);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [resolved]);

  const src = loadFailed ? PLACE_IMAGE_PLACEHOLDER : resolved;

  return (
    <Image
      src={src}
      alt={place.name}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={() => setLoadFailed(true)}
    />
  );
}
