import Link from "next/link";
import { PublicPlaceCard } from "@/components/PublicPlaceCard";
import type { PopularPlaceRow } from "@/lib/repositories/types";

type CategoryInfo = { slug: string; name: string };

type Props = {
    citySlug: string;
    categories: CategoryInfo[];
    placesByCategory: Record<string, PopularPlaceRow[]>;
};

export function CityCategoryCarousels({ citySlug, categories, placesByCategory }: Props) {
    return (
        <div className="flex flex-col gap-8">
            {categories.map((cat) => {
                const places = placesByCategory[cat.slug];
                if (!places || places.length === 0) return null;

                return (
                    <section key={cat.slug}>
                        <div className="mb-3 flex items-center justify-between px-1">
                            <h2 className="text-[15px] font-semibold text-slate-800 sm:text-base">
                                {cat.name}
                            </h2>
                            <Link
                                href={`/orase/${citySlug}/${cat.slug}`}
                                className="text-[13px] font-medium text-[#008fa8] active:opacity-70 sm:text-sm"
                            >
                                Vezi toate
                            </Link>
                        </div>

                        <div className="no-scrollbar flex scroll-px-1 items-start gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-1 pb-1 snap-x snap-mandatory">
                            {places.map((place) => (
                                <PublicPlaceCard
                                    key={`${citySlug}-${cat.slug}-${place.place_id}`}
                                    place={{
                                        id: place.place_id,
                                        name: place.name,
                                        address: "",
                                        image: place.image ?? "",
                                        rating: place.rating ?? 0,
                                        google_match_status: place.google_match_status,
                                        google_photo_uri: place.google_photo_uri,
                                    }}
                                    citySlug={citySlug}
                                    categorySlug={cat.slug}
                                    activeFeatured={false}
                                    activePromoted={false}
                                    href={`/orase/${citySlug}/${cat.slug}/${place.place_id}`}
                                    className="w-44 shrink-0 snap-start sm:w-52"
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
