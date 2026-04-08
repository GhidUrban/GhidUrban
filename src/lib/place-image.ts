import type { Place } from "@/data/places";
import { resolvePlaceImageSrc as resolvePlaceImageSrcCore } from "@/lib/resolve-place-image-src";

export {
  PLACE_IMAGE_PLACEHOLDER,
  resolvePlaceImageSrc,
} from "@/lib/resolve-place-image-src";
export type { ResolvePlaceImageInput } from "@/lib/resolve-place-image-src";

/** Fields needed for `<PlaceImage />` and absolute OG URLs. */
export type PlaceImageFields = Pick<Place, "id" | "image"> & {
  google_match_status?: string | null;
  google_photo_uri?: string | null;
};

export function localPlaceImagePath(
  citySlug: string,
  categorySlug: string,
  placeId: string
): string {
  return `/images/places/${citySlug}/${categorySlug}/${placeId}.jpg`;
}

export function resolvePlaceImageAbsoluteUrl(
  place: PlaceImageFields,
  _citySlug: string,
  categorySlug: string,
  baseUrl: string
): string {
  const src = resolvePlaceImageSrcCore({
    image: place.image,
    google_match_status: place.google_match_status,
    google_photo_uri: place.google_photo_uri,
    category_slug: categorySlug,
  });
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  const root = baseUrl.replace(/\/$/, "");
  return `${root}${src}`;
}
