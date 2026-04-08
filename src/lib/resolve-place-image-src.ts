/** Single rule for public place thumbnails (DB values only; no live Google). */

export const PLACE_IMAGE_PLACEHOLDER = "/images/place-placeholder.jpg";

export type ResolvePlaceImageInput = {
  image?: string | null;
  google_match_status?: string | null;
  google_photo_uri?: string | null;
  /** Used only for category placeholder when there is no real image. */
  category_slug?: string | null;
};

function getCategoryPlaceholder(categorySlug: string): string {
  const map: Record<string, string> = {
    cafenele: "/images/placeholders/cafenele.jpg",
    restaurante: "/images/placeholders/restaurante.jpg",
    cultural: "/images/placeholders/cultural.jpg",
    natura: "/images/placeholders/natura.jpg",
    institutii: "/images/placeholders/institutii.jpg",
    evenimente: "/images/placeholders/evenimente.jpg",
    cazare: "/images/placeholders/hotel.jpg",
  };
  const key = categorySlug?.trim();
  if (key && map[key]) {
    return map[key]!;
  }
  return PLACE_IMAGE_PLACEHOLDER;
}

/**
 * 1) matched + google_photo_uri → Google URI
 * 2) else non-empty image (not global placeholder sentinel) → image
 * 3) else category / generic placeholder
 */
export function resolvePlaceImageSrc(place: ResolvePlaceImageInput): string {
  const googleUri = place.google_photo_uri?.trim();
  if (place.google_match_status === "matched" && googleUri) {
    return googleUri;
  }
  const img = place.image?.trim() ?? "";
  if (img && img !== PLACE_IMAGE_PLACEHOLDER) {
    return img;
  }
  return getCategoryPlaceholder(place.category_slug ?? "");
}

export type RecentVisitImageInput = ResolvePlaceImageInput & {
  /** Legacy rows: pre-resolved URL only. */
  image_url?: string | null;
};

/** Recent list: prefer raw DB fields when present; else legacy `image_url`. */
export function resolveRecentVisitImageSrc(visit: RecentVisitImageInput): string {
  const hasRaw =
    typeof visit.image === "string" ||
    visit.google_match_status != null ||
    visit.google_photo_uri != null;
  if (hasRaw) {
    return resolvePlaceImageSrc({
      image: typeof visit.image === "string" ? visit.image : "",
      google_match_status: visit.google_match_status ?? null,
      google_photo_uri: visit.google_photo_uri ?? null,
      category_slug: visit.category_slug,
    });
  }
  const leg = visit.image_url?.trim();
  if (leg) {
    return leg;
  }
  return resolvePlaceImageSrc({
    image: "",
    category_slug: visit.category_slug,
  });
}
