"use client";

import { useCallback, useMemo, useState } from "react";
import NearbyRecommendationsSection from "@/components/NearbyRecommendationsSection";
import { PlacesList } from "@/components/PlaceLists";
import type { Place } from "@/data/places";

type CategoryPlacesSectionProps = {
    places: Place[];
    slug: string;
    category: string;
    categoryName: string;
};

export function CategoryPlacesSection({
    places,
    slug,
    category,
    categoryName,
}: CategoryPlacesSectionProps) {
    const [recommendedPlaceIds, setRecommendedPlaceIds] = useState<Set<string>>(() => new Set());

    const onRecommendationsChange = useCallback((ids: string[]) => {
        setRecommendedPlaceIds(new Set(ids));
    }, []);

    const [distanceByPlaceId, setDistanceByPlaceId] = useState<Record<string, number>>({});

    const onDistancesChange = useCallback((map: Record<string, number>) => {
        setDistanceByPlaceId(map);
    }, []);

    const listPlaces = useMemo(() => {
        if (recommendedPlaceIds.size === 0) {
            return places;
        }
        return places.filter((p) => !recommendedPlaceIds.has(p.id));
    }, [places, recommendedPlaceIds]);

    return (
        <>
            <h1 className="mb-3 text-center text-2xl font-semibold tracking-tight text-gray-900">
                {categoryName}
            </h1>

            <NearbyRecommendationsSection
                citySlug={slug}
                categorySlug={category}
                onRecommendationsChange={onRecommendationsChange}
                onDistancesChange={onDistancesChange}
            />

            <div className="mt-6">
                <PlacesList
                    places={listPlaces}
                    slug={slug}
                    category={category}
                    distanceByPlaceId={distanceByPlaceId}
                />
            </div>
        </>
    );
}
