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
    image_url?: string | null;
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
    image_url = null,
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
            image_url: image_url || null,
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
        image_url,
        address,
        rating,
    ]);

    return null;
}
