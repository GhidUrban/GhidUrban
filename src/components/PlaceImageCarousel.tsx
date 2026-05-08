"use client";

import Image from "next/image";
import { useState } from "react";

import { PlaceImage } from "@/components/PlaceImage";
import type { Place } from "@/data/places";

type Props = {
    place: Place;
    citySlug: string;
    categorySlug: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
};

export function PlaceImageCarousel({
    place,
    citySlug,
    categorySlug,
    width,
    height,
    className,
    priority,
}: Props) {
    const urls = place.image_gallery?.filter(Boolean) ?? [];
    if (urls.length <= 1) {
        return (
            <PlaceImage
                place={place}
                citySlug={citySlug}
                categorySlug={categorySlug}
                width={width}
                height={height}
                className={className}
                priority={priority}
            />
        );
    }

    const [active, setActive] = useState(0);
    const safe = Math.min(Math.max(0, active), urls.length - 1);
    const src = urls[safe] ?? urls[0]!;

    return (
        <div>
            <div className="relative overflow-hidden rounded-2xl">
                <Image
                    src={src}
                    alt={`${place.name} — ${safe + 1} / ${urls.length}`}
                    width={width}
                    height={height}
                    className={className}
                    priority={priority}
                    unoptimized
                />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                {urls.map((u, i) => (
                    <button
                        key={`${u}-${i}`}
                        type="button"
                        onClick={() => setActive(i)}
                        className={`overflow-hidden rounded-lg border-2 bg-white p-0 transition ${
                            i === safe ? "border-gray-900 ring-1 ring-gray-900/20" : "border-gray-200 opacity-90 hover:border-gray-400"
                        }`}
                    >
                        <Image
                            src={u}
                            alt=""
                            width={96}
                            height={64}
                            className="h-14 w-20 object-cover"
                            unoptimized
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
