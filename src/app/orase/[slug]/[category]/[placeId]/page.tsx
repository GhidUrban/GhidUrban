import Image from "next/image";
import Link from "next/link";
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

type PlaceApiData = {
    city_slug: string;
    category_slug: string;
    place_id: string;
    place: Place;
};

export default async function PlacePage({ params }: PlacePageProps) {
    const { slug, category, placeId } = await params;

    const placeResponse = await apiGet<PlaceApiData>("/api/place", {
        city_slug: slug,
        category_slug: category,
        place_id: placeId,
    });

    if (placeResponse.status === 404) {
        notFound();
    }
    if (!placeResponse.success || !placeResponse.data) {
        notFound();
    }

    const cityName = slugToTitle(slug);
    const categoryName = slugToTitle(category);
    const place = placeResponse.data.place;
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
                        src={place.image}
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
                            <p className="mt-1 text-gray-900">{place.schedule}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Telefon</p>
                            <p className="mt-1 text-gray-900">{place.phone}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Website</p>
                            <a
                                href={place.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-blue-600 hover:underline"
                            >
                                {place.website}
                            </a>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-500">Locație</p>
                            <a
                                href={place.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-blue-600 hover:underline"
                            >
                                Deschide în Google Maps
                            </a>
                        </div>
                    </div>
                </article>
            </div>
        </main>
    );
}