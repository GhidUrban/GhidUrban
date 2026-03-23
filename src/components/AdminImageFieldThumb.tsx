"use client";

import { useEffect, useState } from "react";
import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";

type AdminImageFieldThumbProps = {
    /** From adminImagePreviewSrc(formData.image) */
    imagePreviewSrc: string;
    /** Bump after successful upload when the URL string may be unchanged (cache bust). */
    imagePreviewRevision: number;
    className?: string;
};

export function AdminImageFieldThumb({
    imagePreviewSrc,
    imagePreviewRevision,
    className,
}: AdminImageFieldThumbProps) {
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        setLoadFailed(false);
    }, [imagePreviewSrc, imagePreviewRevision]);

    const src = loadFailed ? PLACE_IMAGE_PLACEHOLDER : imagePreviewSrc;

    return (
        <img
            key={`admin-img-${imagePreviewRevision}-${imagePreviewSrc}`}
            src={src}
            alt=""
            onError={() => setLoadFailed(true)}
            className={className}
        />
    );
}
