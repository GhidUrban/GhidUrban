import Image from "next/image";
import Link from "next/link";

type PlaceCardProps = {
    name: string;
    image: string;
    address: string;
    rating: number;
    description: string;
};

export function PlaceCard({
    name,
    image,
    address,
    rating,
    description,
}: PlaceCardProps) {
    const stars = "⭐".repeat(Math.round(rating));

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <Image
                src={image}
                alt={name}
                width={600}
                height={300}
                className="w-full h-40 object-cover rounded-lg mb-4"
            />
            <h2 className="text-2xl font-semibold text-gray-900">{name}</h2>

            <p className="mt-2 text-gray-600">📍 {address}</p>

            <p className="mt-2 text-yellow-500 text-lg">
                {stars} <span className="text-gray-500 text-sm">({rating})</span>
            </p>

            <p className="mt-3 text-gray-700">{description}</p>
        </div>
    );
}