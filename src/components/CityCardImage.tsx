"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FALLBACK_CITY_IMAGE_SRC } from "@/lib/city-image-fallback";

type Props = {
    src: string | null | undefined;
    alt: string;
    className?: string;
    priority?: boolean;
    width: number;
    height: number;
};

function resolvedSrc(raw: string | null | undefined): string {
    const t = typeof raw === "string" ? raw.trim() : "";
    return t.length > 0 ? t : FALLBACK_CITY_IMAGE_SRC;
}

export function CityCardImage({ src, alt, className, priority, width, height }: Props) {
    const [currentSrc, setCurrentSrc] = useState(() => resolvedSrc(src));

    useEffect(() => {
        setCurrentSrc(resolvedSrc(src));
    }, [src]);

    return (
        <Image
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            className={className}
            priority={priority}
            onError={() => {
                setCurrentSrc((prev) =>
                    prev === FALLBACK_CITY_IMAGE_SRC ? prev : FALLBACK_CITY_IMAGE_SRC,
                );
            }}
        />
    );
}
