import type { Metadata } from "next";
import { cache } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import { InfoRow } from "@/components/InfoRow";
import { MapOptionsButton } from "@/components/MapOptionsButton";
import { PlaceImage } from "@/components/PlaceImage";
import { PlaceOpenNowBadge } from "@/components/PlaceOpenNowBadge";
import { RecordRecentPlaceVisit } from "@/components/RecordRecentPlaceVisit";
import { SimilarPlacesSection } from "@/components/SimilarPlacesSection";
import {
    EN_DASH,
    formatGoogleHoursRawToCompactLines,
    tryBuildCompactScheduleFromPlainText,
} from "@/lib/compact-opening-hours";
import { apiGet } from "@/lib/internal-api";
import { resolvePlaceImageAbsoluteUrl } from "@/lib/place-image";
import { slugToTitle } from "@/lib/slug";
import { notFound } from "next/navigation";
import type { Place } from "@/data/places";

function PlaceDetailMapPinIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function PlaceDetailPhoneIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}

function PlaceDetailClockIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
        </svg>
    );
}

type PlacePageProps = {
    params: Promise<{
        slug: string;
        category: string;
        placeId: string
    }>;
}

type PlaceApiResponseData = {
    city_slug: string;
    category_slug: string;
    place_id: string;
    place: Place;
};

type PlacesApiResponseData = {
    city_slug: string;
    category_slug: string;
    count: number;
    places: Place[];
};

const BASE_URL = "https://ghidurban.ro";
const PLACE_IMAGE_FALLBACK = "https://via.placeholder.com/1000x500?text=Ghid+Urban";

function clipMeta(text: string, max = 155): string {
    const oneLine = text.replace(/\s+/g, " ").trim();
    if (oneLine.length <= max) return oneLine;
    return `${oneLine.slice(0, max - 1).trimEnd()}…`;
}

function cleanScheduleDashes(text: string): string {
    let t = text;
    t = t.replace(/\bL\s*-\s*V\b/gi, `L${EN_DASH}V`);
    t = t.replace(/\bS\s*-\s*D\b/gi, `S${EN_DASH}D`);
    t = t.replace(/\bL-V\b/g, `L${EN_DASH}V`);
    t = t.replace(/\bS-D\b/g, `S${EN_DASH}D`);
    t = t.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g, `$1${EN_DASH}$2`);
    return t;
}

function isStructuredSchedule(s: string): boolean {
    if (/\r?\n/.test(s)) {
        return true;
    }
    if (/L\s*[-–]\s*V/i.test(s)) {
        return true;
    }
    if (/L\s*[-–]\s*D/i.test(s)) {
        return true;
    }
    if (/^\s*S\b/m.test(s) || /^\s*D\b/m.test(s)) {
        return true;
    }
    return false;
}

function formatSchedule(schedule: string | null | undefined): string {
    const raw = schedule?.trim();
    if (!raw || /^program\s+indisponibil$/i.test(raw)) {
        return "Program indisponibil";
    }

    const lower = raw.toLowerCase();
    if (lower.includes("zilnic") || lower.includes("acces liber")) {
        return `L${EN_DASH}D 00:00${EN_DASH}24:00`;
    }

    if (isStructuredSchedule(raw)) {
        return cleanScheduleDashes(raw);
    }

    return cleanScheduleDashes(`L${EN_DASH}D ${raw}`);
}

function phoneToTelHref(raw: string): string {
    const cleaned = raw.replace(/[\s.-]/g, "").trim();
    return cleaned.length > 0 ? `tel:${cleaned}` : "#";
}

const getPlaceResponse = cache(async (slug: string, category: string, placeId: string) => {
    return apiGet<PlaceApiResponseData>("/api/place", {
        city_slug: slug,
        category_slug: category,
        place_id: placeId,
    });
});

const getPlacesResponse = cache(async (slug: string, category: string) => {
    return apiGet<PlacesApiResponseData>("/api/places", {
        city_slug: slug,
        category_slug: category,
    });
});

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
    const { slug, category, placeId } = await params;
    const placeResponse = await getPlaceResponse(slug, category, placeId);
    const place = placeResponse.success && placeResponse.data ? placeResponse.data.place : null;
    const cityName = slugToTitle(slug);
    const categoryName = slugToTitle(category);
    const title = place ? `${place.name} | Ghid Urban` : "Loc | Ghid Urban";
    const description =
        place?.description ??
        `Descoperă un loc interesant din ${categoryName.toLowerCase()} în ${cityName}.`;
    const fullUrl = `${BASE_URL}/orase/${slug}/${category}/${placeId}`;
    const images = place
        ? [
            {
                url: resolvePlaceImageAbsoluteUrl(place, slug, category, BASE_URL),
                width: 1200,
                height: 630,
                alt: place.name,
            },
        ]
        : undefined;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: fullUrl,
            siteName: "GhidUrban",
            locale: "ro_RO",
            type: "article",
            images,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images,
        },
    };
}

export default async function PlacePage({ params }: PlacePageProps) {
    const { slug, category, placeId } = await params;
    const placeResponse = await getPlaceResponse(slug, category, placeId);

    if (placeResponse.status === 404) {
        notFound();
    }
    if (!placeResponse.success || !placeResponse.data) {
        notFound();
    }

    const cityName = slugToTitle(slug);
    const categoryName = slugToTitle(category);
    const place = placeResponse.data.place;
    const similarPlacesResponse = await getPlacesResponse(slug, category);
    const similarPlacesCandidates =
        similarPlacesResponse.success && similarPlacesResponse.data
            ? similarPlacesResponse.data.places.filter((similarPlace) => similarPlace.id !== place.id)
            : [];
    const placeHref = `/orase/${slug}/${category}/${placeId}`;
    const hasAddress = Boolean(place.address?.trim());
    const phoneTrimmed = place.phone?.trim() ?? "";
    const hasPhone = phoneTrimmed.length > 0;
    const formattedSchedule = formatSchedule(place.schedule);
    const scheduleLines = formattedSchedule
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    const compactScheduleRows =
        formatGoogleHoursRawToCompactLines(place.google_hours_raw) ??
        tryBuildCompactScheduleFromPlainText(place.schedule);

    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <RecordRecentPlaceVisit
                place_id={place.id}
                name={place.name}
                city_slug={slug}
                city_name={cityName}
                category_slug={category}
                category_name={categoryName}
                href={placeHref}
                image={place.image ?? ""}
                google_match_status={place.google_match_status ?? null}
                google_photo_uri={place.google_photo_uri ?? null}
                address={place.address}
                rating={place.rating}
            />
            <div className="mx-auto min-w-0 max-w-4xl px-4">
                <header className="min-w-0 w-full">
                    <div className="flex min-h-[32px] min-w-0 items-center">
                        <div className="flex min-w-0 flex-1 items-center">
                            <Breadcrumb
                                muted
                                items={[
                                    { label: "Orașe", href: "/orase" },
                                    { label: cityName, href: `/orase/${slug}` },
                                    { label: categoryName, href: `/orase/${slug}/${category}` },
                                    { label: place.name }
                                ]}
                            />
                        </div>
                    </div>
                </header>

                <div className="min-w-0 mt-3 pt-3">
                <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.03] md:p-8">
                    <div className="relative overflow-hidden rounded-2xl">
                        <PlaceImage
                            place={place}
                            citySlug={slug}
                            categorySlug={category}
                            width={1000}
                            height={500}
                            className="h-80 w-full object-cover md:h-[26rem]"
                            priority
                        />
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent"
                            aria-hidden
                        />
                        <h1 className="absolute bottom-5 left-5 right-5 text-[1.75rem] font-semibold tracking-tight text-white drop-shadow-sm md:bottom-6 md:left-6 md:right-6 md:text-3xl">
                            {place.name}
                        </h1>
                    </div>

                    {place.description ? (
                        <div className="mt-6">
                            <p className="text-sm leading-relaxed text-gray-600 md:text-base">{place.description}</p>
                        </div>
                    ) : null}

                    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        {hasAddress ? (
                            <div className="px-5 py-3">
                                <InfoRow label="Locație" icon={<PlaceDetailMapPinIcon />}>
                                    <p className="break-words leading-5 text-gray-600">{place.address}</p>
                                </InfoRow>
                                <MapOptionsButton placeName={place.name} address={place.address ?? ""} />
                            </div>
                        ) : null}
                        {hasPhone ? (
                            <div
                                className={`px-5 py-3 ${hasAddress ? "border-t border-gray-200/70" : ""}`}
                            >
                                <InfoRow label="Telefon" icon={<PlaceDetailPhoneIcon />}>
                                    <a
                                        href={phoneToTelHref(phoneTrimmed)}
                                        aria-label={`Sună la ${phoneTrimmed}`}
                                        className="font-medium tabular-nums text-gray-900 transition-colors hover:text-black hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                    >
                                        {phoneTrimmed}
                                    </a>
                                </InfoRow>
                            </div>
                        ) : null}
                        <div
                            className={`px-5 py-3 ${hasAddress || hasPhone ? "border-t border-gray-200/70" : ""}`}
                        >
                            <InfoRow label="Program" icon={<PlaceDetailClockIcon />}>
                                <div className="space-y-2">
                                    <div className="empty:hidden">
                                        <PlaceOpenNowBadge
                                            googleHoursRaw={place.google_hours_raw}
                                            size="md"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                    {compactScheduleRows !== null ? (
                                        compactScheduleRows.map((line, i) => {
                                            const colonIdx = line.indexOf(":");
                                            if (colonIdx > 0) {
                                                const dayLabel = line.slice(0, colonIdx).trim();
                                                const rest = line.slice(colonIdx);
                                                return (
                                                    <p key={`compact-${i}`} className="text-sm leading-5 text-gray-600">
                                                        <span className="font-medium text-gray-700">
                                                            {dayLabel}
                                                        </span>
                                                        {rest}
                                                    </p>
                                                );
                                            }
                                            return (
                                                <p key={`compact-${i}`} className="text-sm leading-5 text-gray-600">
                                                    {line}
                                                </p>
                                            );
                                        })
                                    ) : scheduleLines.length <= 1 ? (
                                        <p className="text-sm leading-5 text-gray-600">
                                            {scheduleLines[0] ?? formattedSchedule}
                                        </p>
                                    ) : (
                                        scheduleLines.map((line, i) => {
                                            const colonIdx = line.indexOf(":");
                                            if (colonIdx > 0) {
                                                const dayLabel = line.slice(0, colonIdx).trim();
                                                const rest = line.slice(colonIdx);
                                                return (
                                                    <p key={i} className="text-sm leading-5 text-gray-600">
                                                        <span className="font-medium text-gray-700">
                                                            {dayLabel}
                                                        </span>
                                                        {rest}
                                                    </p>
                                                );
                                            }
                                            return (
                                                <p key={i} className="text-sm leading-5 text-gray-600">
                                                    {line}
                                                </p>
                                            );
                                        })
                                    )}
                                    </div>
                                </div>
                            </InfoRow>
                        </div>
                    </div>
                </article>
                </div>

                <SimilarPlacesSection
                    places={similarPlacesCandidates}
                    citySlug={slug}
                    categorySlug={category}
                />
            </div>
        </main>
    );
}