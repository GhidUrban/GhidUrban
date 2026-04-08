import type { RecentPlaceVisit } from "@/lib/cauta-recent-places";
import { CautaRecentPlaceCard } from "@/components/CautaRecentPlaceCard";

/** Horizontal strip of recent tiles; aligned with /cauta empty-state sections. */
export function CautaRecentVisitedRow({
    items,
    disabled,
}: {
    items: RecentPlaceVisit[];
    disabled: boolean;
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 w-full">
            <p className="text-center text-base font-medium tracking-tight text-gray-700">
                Vizitate recent
            </p>
            <div className="mt-3 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <ul className="flex justify-start gap-2" role="list">
                    {items.map((p) => (
                        <li key={`${p.city_slug}-${p.category_slug}-${p.place_id}`}>
                            <CautaRecentPlaceCard visit={p} disabled={disabled} />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
