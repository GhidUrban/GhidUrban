export type Place = {
    id: string;
    name: string;
    image: string;
    address: string;
    rating: number;
    description: string;
    schedule: string;
    phone: string;
    website: string;
    mapsUrl: string;
    featured?: boolean;
    featured_until?: string | null;
    activeFeatured?: boolean;
    activePromoted?: boolean;
    /** 0 normal, 1 promoted plan, 2 featured plan or legacy featured */
    listingTierRank?: number;
    latitude?: number | null;
    longitude?: number | null;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
    google_hours_raw?: unknown | null;
    /** Gallery URLs (Storage), ordered. */
    image_gallery?: string[];
};
