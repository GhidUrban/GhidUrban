import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import type { Place } from "@/data/places";

type PlaceWithDistance = Place & {
    distanceKm?: number | null;
    distance_km?: number | null;
};

function distanceKmForScore(p: Place): number | undefined {
    const ext = p as PlaceWithDistance;
    if (typeof ext.distanceKm === "number" && Number.isFinite(ext.distanceKm)) {
        return ext.distanceKm;
    }
    if (ext.distance_km != null && Number.isFinite(Number(ext.distance_km))) {
        return Number(ext.distance_km);
    }
    return undefined;
}

function compareSimilar(a: Place, b: Place): number {
    const tier = (b.listingTierRank ?? 0) - (a.listingTierRank ?? 0);
    if (tier !== 0) {
        return tier;
    }
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) {
        return ratingDiff;
    }
    const da = distanceKmForScore(a);
    const db = distanceKmForScore(b);
    const aOk = typeof da === "number";
    const bOk = typeof db === "number";
    if (aOk && bOk && da !== db) {
        return da - db;
    }
    if (aOk && !bOk) {
        return -1;
    }
    if (!aOk && bOk) {
        return 1;
    }
    return a.name.localeCompare(b.name);
}

type SimilarPlacesSectionProps = {
    places: Place[];
    citySlug: string;
    categorySlug: string;
};

export function SimilarPlacesSection({ places, citySlug, categorySlug }: SimilarPlacesSectionProps) {
    if (places.length === 0) {
        return null;
    }

    const sortedPlaces = [...places].sort(compareSimilar);
    const displayPlaces = sortedPlaces.slice(0, 6);

    return (
        <section className="mt-8 border-t border-gray-200/70 pt-8 sm:mt-10 sm:pt-9">
            <h2 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
                Locuri similare
            </h2>
            <p className="mt-1 text-sm text-gray-500">Alte locuri din aceeași categorie.</p>

            <div className="mt-5 flex gap-4 overflow-x-auto pb-2 sm:mt-6">
                {displayPlaces.map((p) => (
                    <div
                        key={`${citySlug}-${categorySlug}-${p.id}`}
                        className="min-w-[240px] flex-shrink-0"
                    >
                        <PublicPlaceCard
                            place={p}
                            citySlug={citySlug}
                            categorySlug={categorySlug}
                            activeFeatured={p.activeFeatured === true}
                            activePromoted={p.activePromoted === true}
                            distanceKm={distanceKmForScore(p)}
                            href={`/orase/${citySlug}/${categorySlug}/${p.id}`}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
