"use client";

import Image from "next/image";
import { useState } from "react";
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
  const [src, setSrc] = useState(() =>
    resolvePlaceImageSrc(place, citySlug, categorySlug)
  );

  return (
    <Image
      src={src}
      alt={place.name}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={() => setSrc(PLACE_IMAGE_PLACEHOLDER)}
    />
  );
}
