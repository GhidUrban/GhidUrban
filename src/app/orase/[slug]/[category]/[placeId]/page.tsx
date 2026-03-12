import { placesByCity } from "@/data/places";
import Image from "next/image";
import Link from "next/link";

type PlacePageProps = {
    params: Promise<{
        slug: string;
        category: string;
        placeId: string
    }>;
}

export default async function PlacePage({ params }: PlacePageProps) {
    const { slug, category, placeId } = await params;

    const categoryName = category
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const cityData = placesByCity as any;
    const places = cityData[slug]?.[category] ?? [];

    const place = places.find((p: any) => p.id === placeId);

    if (!place) {
        return <div className="p-10">Locatia nu a fost gasita.</div>;
    }
    const stars = "⭐".repeat(Math.round(place.rating));
    return (
        <div className="max-w-4xl mx-auto p-10">
            <Link
                href={`/orase/${slug}/${category}`}
                className="inline-block mb-6 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
                ← Înapoi la {categoryName.toLowerCase()}
            </Link>

            <Image
                src={place.image}
                alt={place.name}
                width={800}
                height={400}
                className="w-full h-64 object-cover rounded-xl mb-6"
            />

            <h1 className="text-4xl font-bold mb-4">{place.name}</h1>

            <p className="text-gray-600 mb-2">📍 {place.address}</p>

            <p className="text-yellow-500 text-lg mb-4">
                {stars} <span className="text-gray-500 text-sm">({place.rating})</span>
            </p>

            <p className="text-gray-700">{place.description}</p>

            <div className="mt-6 space-y-2 text-gray-700">
                {place.schedule && (
                    <p>
                        🕒 <span className="font-medium">Program:</span> {place.schedule}
                    </p>
                )}

                {place.phone && (
                    <p>
                        📞 <span className="font-medium">Telefon:</span> {place.phone}
                    </p>
                )}

                {place.website && (
                    <p>
                        🌐 <span className="font-medium">Website:</span>{" "}
                        <a
                            href={place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            {place.website}

                        </a>

                    </p>

                )}
                {place.mapsUrl && (
                    <p>
                        📍{" "}
                        <a
                            href={place.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            Gaseste în Google Maps
                        </a>
                    </p>
                )}
            </div>
        </div>
    );
}