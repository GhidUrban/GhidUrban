"use client";

import { addRecentPlace } from "@/lib/cauta-recent-places";
import { useEffect, useRef } from "react";

type Props = {
    place_id: string;
    name: string;
    city_slug: string;
    city_name: string;
    category_slug: string;
    category_name: string;
    href: string;
    image?: string;
    google_match_status?: string | null;
    google_photo_uri?: string | null;
    address?: string;
    rating?: number;
};

export function RecordRecentPlaceVisit({
    place_id,
    name,
    city_slug,
    city_name,
    category_slug,
    category_name,
    href,
    image = "",
    google_match_status = null,
    google_photo_uri = null,
    address = "",
    rating,
}: Props) {
    const done = useRef(false);

    useEffect(() => {
        if (done.current) {
            return;
        }
        done.current = true;
        addRecentPlace({
            place_id,
            name,
            city_slug,
            city_name,
            category_slug,
            category_name,
            href,
            image: image.trim(),
            google_match_status: google_match_status ?? null,
            google_photo_uri: google_photo_uri ?? null,
            address: address.trim() || null,
            rating: typeof rating === "number" && Number.isFinite(rating) ? rating : null,
        });
    }, [
        place_id,
        name,
        city_slug,
        city_name,
        category_slug,
        category_name,
        href,
        image,
        google_match_status,
        google_photo_uri,
        address,
        rating,
    ]);

    return null;
}
