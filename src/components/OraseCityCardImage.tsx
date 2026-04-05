"use client";

import Image from "next/image";
import { useState } from "react";

const PLACEHOLDER = "/images/placeholders/place-placeholder.jpg";

type Props = {
    citySlug: string;
    alt: string;
    className?: string;
    priority?: boolean;
};

export function OraseCityCardImage({ citySlug, alt, className, priority }: Props) {
    const [src, setSrc] = useState(`/images/places/${citySlug}/city.jpg`);

    return (
        <Image
            src={src}
            alt={alt}
            width={600}
            height={400}
            className={className}
            priority={priority}
            onError={() => {
                setSrc((current) => (current === PLACEHOLDER ? current : PLACEHOLDER));
            }}
        />
    );
}
