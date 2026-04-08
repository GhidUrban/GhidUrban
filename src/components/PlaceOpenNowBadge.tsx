import { getPlaceOpenNowFromGoogleHoursRaw } from "@/lib/compact-opening-hours";

type PlaceOpenNowBadgeProps = {
    googleHoursRaw?: unknown | null;
    /** e.g. compact card vs detail */
    size?: "sm" | "md";
    className?: string;
};

/** Subtle pill from `google_hours_raw.openNow` only; renders nothing if unknown. */
export function PlaceOpenNowBadge({
    googleHoursRaw,
    size = "sm",
    className = "",
}: PlaceOpenNowBadgeProps) {
    const status = getPlaceOpenNowFromGoogleHoursRaw(googleHoursRaw);
    if (status === null) {
        return null;
    }

    const textSize = size === "md" ? "text-xs" : "text-[11px]";
    const pad = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";

    if (status === "open") {
        return (
            <span
                className={`inline-flex shrink-0 rounded-full font-medium ring-1 ring-inset ${textSize} ${pad} bg-emerald-50/95 text-emerald-800/95 ring-emerald-200/70 ${className}`}
            >
                Deschis acum
            </span>
        );
    }

    return (
        <span
            className={`inline-flex shrink-0 rounded-full font-medium ring-1 ring-inset ${textSize} ${pad} bg-rose-50/90 text-rose-900/65 ring-rose-200/60 ${className}`}
        >
            Închis
        </span>
    );
}
