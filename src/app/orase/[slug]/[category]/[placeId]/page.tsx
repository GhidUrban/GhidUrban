import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import { PlaceImage } from "@/components/PlaceImage";
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
            className="mt-1 h-4 w-4 shrink-0 text-gray-400"
            aria-hidden
        >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
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

const EN_DASH = "\u2013";

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

function getOpenStatus(schedule: string | null | undefined) {
    if (!schedule || !schedule.trim()) {
        return { label: "Program indisponibil", tone: "neutral" as const };
    }

    const s = schedule.toLowerCase();

    // Always open cases
    if (
        s.includes("zilnic") ||
        s.includes("acces liber") ||
        s.includes("00:00–24:00") ||
        s.includes("00:00-24:00")
    ) {
        return { label: "Deschis", tone: "open" as const };
    }

    // If schedule contains hours, assume it's open (simple MVP logic)
    const hasHours = /\d{1,2}:\d{2}/.test(s);

    if (hasHours) {
        return { label: "Deschis", tone: "open" as const };
    }

    // If explicitly closed
    if (s.includes("închis") || s.includes("inchis")) {
        return { label: "Închis", tone: "neutral" as const };
    }

    return { label: "Verifică programul", tone: "neutral" as const };
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
    const similarPlaces =
        similarPlacesResponse.success && similarPlacesResponse.data
            ? similarPlacesResponse.data.places
                .filter((similarPlace) => similarPlace.id !== place.id)
                .slice(0, 3)
            : [];
    const openStatus = getOpenStatus(place.schedule);
    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-4xl px-4">
                <div className="mb-4">
                    <Breadcrumb
                        items={[
                            { label: "Orașe", href: "/orase" },
                            { label: cityName, href: `/orase/${slug}` },
                            { label: categoryName, href: `/orase/${slug}/${category}` },
                            { label: place.name }
                        ]}
                    />
                </div>

                <Link
                    href={`/orase/${slug}/${category}`}
                    className="mb-4 inline-block rounded-sm text-sm font-medium text-gray-600 transition-colors duration-200 ease-out hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-90"
                >
                    ← Înapoi la {categoryName.toLowerCase()}
                </Link>

                <article className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
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
                        <h1 className="absolute bottom-6 left-6 right-6 text-3xl font-bold text-white md:text-4xl">
                            {place.name}
                        </h1>
                    </div>

                    {place.description ? (
                        <div className="mt-6">
                            <p className="text-base leading-7 text-gray-700">{place.description}</p>
                        </div>
                    ) : null}

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                        {place.address ? (
                            <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    Locație
                                </p>
                                <div className="mt-2 flex items-start gap-2">
                                    <PlaceDetailMapPinIcon />
                                    <p className="min-w-0 flex-1 break-words text-sm leading-6 text-gray-700">
                                        {place.address}
                                    </p>
                                </div>
                                {place.mapsUrl ? (
                                    <a
                                        href={place.mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:opacity-90"
                                    >
                                        Vezi pe hartă →
                                    </a>
                                ) : null}
                            </div>
                        ) : null}
                        <div
                            className={`rounded-xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm${place.address ? "" : " md:col-span-2"}`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    Program
                                </p>
                                <span
                                    className={
                                        openStatus.tone === "open"
                                            ? "inline-flex shrink-0 items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200"
                                            : "inline-flex shrink-0 items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200"
                                    }
                                >
                                    {openStatus.label}
                                </span>
                            </div>

                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                                {formatSchedule(place.schedule)}
                            </p>
                        </div>
                    </div>
                </article>

                {similarPlaces.length > 0 ? (
                    <section className="mt-10">
                        <h2 className="text-xl font-semibold text-gray-900">Locuri similare</h2>
                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                            {similarPlaces.map((similarPlace) => {
                                return (
                                    <Link
                                        key={similarPlace.id}
                                        href={`/orase/${slug}/${category}/${similarPlace.id}`}
                                        className="group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow,opacity] duration-200 ease-out hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100"
                                    >
                                        <div className="flex h-full flex-col">
                                            <div className="relative overflow-hidden rounded-t-2xl">
                                                <PlaceImage
                                                    place={similarPlace}
                                                    citySlug={slug}
                                                    categorySlug={category}
                                                    width={600}
                                                    height={300}
                                                    className="h-36 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                                                />
                                            </div>
                                            <div className="flex flex-1 flex-col space-y-1 p-4">
                                                <h3 className="text-sm font-semibold text-gray-900">
                                                    {similarPlace.name}
                                                </h3>
                                                <p className="text-sm text-gray-500">{similarPlace.address}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ) : null}
            </div>
        </main>
    );
}