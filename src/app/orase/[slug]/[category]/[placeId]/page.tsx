import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import { apiGet } from "@/lib/internal-api";
import { slugToTitle } from "@/lib/slug";
import { notFound } from "next/navigation";
import type { Place } from "@/data/places";

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
    const images = place?.image
        ? [
            {
                url: place.image,
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
            siteName: "Ghid Urban",
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
    const stars = "⭐".repeat(Math.round(place.rating));
    return (
        <main className="min-h-screen bg-gray-100 px-4 py-8">
            <div className="mx-auto max-w-5xl">
                <Breadcrumb
                    items={[
                        { label: "Orașe", href: "/orase" },
                        { label: cityName, href: `/orase/${slug}` },
                        { label: categoryName, href: `/orase/${slug}/${category}` },
                        { label: place.name }
                    ]}
                />
                <Link
                    href={`/orase/${slug}/${category}`}
                    className="mt-8 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    ← Înapoi la {categoryName.toLowerCase()}
                </Link>

                <article className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
                    <Image
                        src={place.image || PLACE_IMAGE_FALLBACK}
                        alt={place.name}
                        width={1000}
                        height={500}
                        className="h-72 w-full rounded-xl object-cover"
                    />

                    <div className="mt-6">
                        <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">{place.name}</h1>
                        <p className="mt-2 text-lg text-gray-600">📍 {place.address}</p>
                        <p className="mt-2 text-lg text-yellow-600">
                            {stars} <span className="text-gray-500 text-sm">({place.rating})</span>
                        </p>
                        <p className="mt-4 text-gray-700">{place.description}</p>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Program</p>
                            <p className="mt-1 text-gray-900">{place.schedule || "Program indisponibil"}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Telefon</p>
                            <p className="mt-1 text-gray-900">{place.phone || "Telefon indisponibil"}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Website</p>
                            {place.website ? (
                                <a
                                    href={place.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block text-blue-600 hover:underline"
                                >
                                    Vizitează site-ul
                                </a>
                            ) : (
                                <p className="mt-1 text-gray-900">Website indisponibil</p>
                            )}
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Locație</p>
                            {place.mapsUrl ? (
                                <a
                                    href={place.mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block text-blue-600 hover:underline"
                                >
                                    Deschide în Google Maps
                                </a>
                            ) : (
                                <p className="mt-1 text-gray-900">Locație indisponibilă</p>
                            )}
                        </div>
                    </div>
                </article>

                {similarPlaces.length > 0 ? (
                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold text-gray-900">Locuri similare</h2>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            {similarPlaces.map((similarPlace) => (
                                <Link
                                    key={similarPlace.id}
                                    href={`/orase/${slug}/${category}/${similarPlace.id}`}
                                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                                >
                                    <h3 className="text-lg font-semibold text-gray-900">{similarPlace.name}</h3>
                                    <p className="mt-2 text-sm text-gray-600">{similarPlace.address}</p>
                                    <p className="mt-3 text-sm text-yellow-600">
                                        ⭐ {similarPlace.rating}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
        </main>
    );
}