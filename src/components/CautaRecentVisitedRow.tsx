"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RecentPlaceVisit } from "@/lib/cauta-recent-places";
import { CautaRecentPlaceCard } from "@/components/CautaRecentPlaceCard";

function scrollToDotIndex(scrollLeft: number, maxScroll: number): 0 | 1 | 2 {
    if (maxScroll <= 1) {
        return 0;
    }
    const t = scrollLeft / maxScroll;
    if (t < 1 / 3) {
        return 0;
    }
    if (t < 2 / 3) {
        return 1;
    }
    return 2;
}

/** Horizontal strip of compact recent tiles (image + title only). */
export function CautaRecentVisitedRow({
    items,
    disabled,
}: {
    items: RecentPlaceVisit[];
    disabled: boolean;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeDot, setActiveDot] = useState<0 | 1 | 2>(0);

    const syncDots = useCallback(() => {
        const el = scrollRef.current;
        if (!el) {
            return;
        }
        const max = el.scrollWidth - el.clientWidth;
        setActiveDot(scrollToDotIndex(el.scrollLeft, max));
    }, []);

    useLayoutEffect(() => {
        syncDots();
    }, [items, syncDots]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) {
            return;
        }
        el.addEventListener("scroll", syncDots, { passive: true });
        const ro = new ResizeObserver(() => {
            syncDots();
        });
        ro.observe(el);
        window.addEventListener("resize", syncDots);
        return () => {
            el.removeEventListener("scroll", syncDots);
            ro.disconnect();
            window.removeEventListener("resize", syncDots);
        };
    }, [syncDots]);

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="mt-5 w-full text-left">
            <p className="mb-2.5 text-xs font-medium tracking-wide text-gray-400">Vizitate recent</p>
            <div
                ref={scrollRef}
                className="-mx-1 overflow-x-auto pl-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
                <ul className="flex gap-2.5 pr-3" role="list">
                    {items.map((p) => (
                        <li
                            key={`${p.city_slug}-${p.category_slug}-${p.place_id}`}
                            className="snap-start"
                        >
                            <CautaRecentPlaceCard
                                href={p.href}
                                name={p.name}
                                imageUrl={p.image_url}
                                disabled={disabled}
                            />
                        </li>
                    ))}
                </ul>
            </div>
            <div
                className="mt-2.5 flex justify-center gap-1.5"
                aria-hidden="true"
            >
                {([0, 1, 2] as const).map((i) => (
                    <span
                        key={i}
                        className={`h-1 w-1 rounded-full transition-colors duration-150 ${
                            activeDot === i
                                ? "bg-gray-500"
                                : "bg-gray-300/90 opacity-70"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
}
