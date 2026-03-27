import type { Place } from "@/data/places";

export const PLACE_IMAGE_PLACEHOLDER = "/images/place-placeholder.jpg";

export function localPlaceImagePath(
  citySlug: string,
  categorySlug: string,
  placeId: string
): string {
  return `/images/places/${citySlug}/${categorySlug}/${placeId}.jpg`;
}

/** Public fallback when a place has no custom image (not persisted in DB). */
export function getCategoryPlaceholder(categorySlug: string): string {
  const map: Record<string, string> = {
    cafenele: "/images/placeholders/cafenele.jpg",
    restaurante: "/images/placeholders/restaurante.jpg",
    cultural: "/images/placeholders/cultural.jpg",
    natura: "/images/placeholders/natura.jpg",
    institutii: "/images/placeholders/institutii.jpg",
    evenimente: "/images/placeholders/evenimente.jpg",
  };
  const key = categorySlug?.trim();
  if (key && map[key]) {
    return map[key]!;
  }
  return PLACE_IMAGE_PLACEHOLDER;
}

export function resolvePlaceImageSrc(
  place: Pick<Place, "id" | "image">,
  citySlug: string,
  categorySlug: string
): string {
  const img = place.image?.trim();
  if (!img || img === PLACE_IMAGE_PLACEHOLDER) {
    return getCategoryPlaceholder(categorySlug);
  }
  return img;
}

export function resolvePlaceImageAbsoluteUrl(
  place: Pick<Place, "id" | "image">,
  citySlug: string,
  categorySlug: string,
  baseUrl: string
): string {
  const src = resolvePlaceImageSrc(place, citySlug, categorySlug);
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  const root = baseUrl.replace(/\/$/, "");
  return `${root}${src}`;
}
