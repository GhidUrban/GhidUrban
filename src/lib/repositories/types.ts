export type CategoryCard = {
    slug: string;
    name: string;
    icon: string;
};

export type SupabaseCity = {
    slug: string;
    name: string;
    image: string | null;
};

export type AdminCityRow = {
    slug: string;
    name: string;
    image: string | null;
    is_active: boolean;
    sort_order: number;
    latitude: number | null;
    longitude: number | null;
};

export type AdminCategoryRow = {
    city_slug: string;
    category_slug: string;
    category_name: string;
    image: string | null;
    icon: string | null;
    is_active: boolean;
    sort_order: number;
};

export type UpdateCityInput = {
    name?: string;
    slug?: string;
    image?: string | null;
    is_active?: boolean;
    sort_order?: number;
    latitude?: number | null;
    longitude?: number | null;
};

export type UpdateCategoryInput = {
    category_name?: string;
    category_slug_new?: string;
    image?: string | null;
    icon?: string | null;
    is_active?: boolean;
    sort_order?: number;
};

export type PlaceGoogleDataRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    google_place_id: string | null;
    google_match_status: string | null;
    google_match_score: number | null;
    google_maps_uri: string | null;
    google_photo_uri: string | null;
    google_photo_name: string | null;
    google_hours_raw: unknown | null;
    google_hours_text: string | null;
    synced_at: string | null;
};

export type PlaceListingRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    plan_type: string;
    plan_expires_at: string | null;
    featured: boolean;
    featured_until: string | null;
    external_source: string | null;
    external_place_id: string | null;
    updated_at: string | null;
};

/** Supabase Storage public URL (or any absolute URL) for gallery thumbs. */
export type PlacePhotoRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    sort_order: number;
    storage_path: string;
};

export type SupabasePlace = {
    place_id: string;
    name: string;
    description: string | null;
    address: string | null;
    schedule: string | null;
    image: string | null;
    image_storage_path?: string | null;
    rating: number | null;
    phone: string | null;
    website: string | null;
    maps_url: string | null;
    latitude?: number | null;
    longitude?: number | null;
    status?: string;
    place_google_data?: PlaceGoogleDataRow | null;
    place_listings?: PlaceListingRow | null;
    place_photos?: PlacePhotoRow[];
    featured?: boolean | null;
    featured_until?: string | null;
    plan_type?: string;
    plan_expires_at?: string | null;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
    google_hours_raw?: unknown | null;
};

export type FullPlaceRow = SupabasePlace & {
    place_google_data: PlaceGoogleDataRow | null;
    place_listings: PlaceListingRow | null;
};

export type PlaceVisibilityStatus = "available" | "hidden";

export type AdminSupabasePlaceRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    rating: number | null;
    status: string;
    featured: boolean;
    featured_until: string | null;
};

export type AdminSupabasePlaceDetails = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    description: string | null;
    address: string | null;
    schedule: string | null;
    image: string | null;
    rating: number | null;
    phone: string | null;
    website: string | null;
    maps_url: string | null;
    status: string;
    featured: boolean;
    featured_until: string | null;
    plan_type: string;
    plan_expires_at: string | null;
};

export type SupabasePlaceMutationInput = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    description: string | null;
    address: string | null;
    schedule: string | null;
    image: string | null;
    rating: number | null;
    phone: string | null;
    website: string | null;
    maps_url: string | null;
    status?: string | null;
    featured?: boolean | null;
    featured_until?: string | null;
    plan_type?: string | null;
    plan_expires_at?: string | null;
    external_source?: string | null;
    external_place_id?: string | null;
    google_place_id?: string | null;
    latitude?: number | null;
    longitude?: number | null;
};

export type PlaceKeyRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
};

export type GooglePlaceListingScope = {
    city_slug: string;
    category_slug: string;
};

export type PlaceSearchIndexRow = {
    place_id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    image: string | null;
    rating: number | null;
    featured: boolean | null;
    featured_until: string | null;
    plan_type: string | null;
    plan_expires_at: string | null;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
};

export type RecommendedPlaceRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    image: string | null;
    rating: number | null;
    maps_url: string | null;
    distance_km: number;
    active_featured: boolean;
    active_promoted: boolean;
    listing_tier_rank: number;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
};

export type GoogleImportCoverageRow = {
    city_slug: string;
    city_name: string | null;
    category_slug: string;
    place_count: number;
};

export type GooglePlaceIdListingConflict = {
    conflicting_place_id: string;
    conflicting_name: string;
    conflicting_city_slug: string;
    conflicting_category_slug: string;
    conflicting_address: string | null;
};

export type AdminGoogleMatchReviewRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    google_match_score: number | null;
    google_place_id: string | null;
    google_maps_uri: string | null;
    google_photo_uri: string | null;
    /** Public Storage URL on places row (cover). */
    image_storage_path: string | null;
    has_google_conflict: boolean | null;
    conflict: GooglePlaceIdListingConflict | null;
    conflict_check_failed: boolean;
};

export type GoogleMatchReviewListFilters = {
    search?: string;
    city_slug?: string;
    category_slug?: string;
    /** Only rows where places.image_storage_path is empty (Supabase cover not set). */
    missing_storage_image?: boolean;
};

export type GoogleMatchReviewAction = "matched" | "clear_match";

export type CreatePlaceOutcome = {
    result: "inserted" | "merged";
    place_id: string;
};

export type PopularPlaceRow = {
    place_id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    image: string | null;
    rating: number;
    google_match_status: string | null;
    google_photo_uri: string | null;
};

export type CreateCityResult = {
    city_slug: string;
    categories_created: number;
    reused_existing: boolean;
    coordinates_updated: boolean;
};

export function adminListSortRank(sort_order: unknown): number {
    const n =
        typeof sort_order === "number" && Number.isFinite(sort_order)
            ? sort_order
            : Number(sort_order);
    if (!Number.isFinite(n) || n === 0) {
        return Number.MAX_SAFE_INTEGER;
    }
    return n;
}

export function isSafeCitySlug(s: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length > 0 && s.length <= 128;
}
