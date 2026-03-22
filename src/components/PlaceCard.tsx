import Image from "next/image";
import Link from "next/link";

type PlaceCardProps = {
    name: string;
    image: string;
    slug: string;
    category: string;
    placeId: string;
    address?: string;
};

export function PlaceCard({ name, image, slug, category, placeId, address }: PlaceCardProps) {
    return (
        <Link href={`/orase/${slug}/${category}/${placeId}`}>
            <div className="block cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition duration-200 hover:scale-105">
                <Image
                    src={image}
                    alt={name}
                    width={600}
                    height={400}
                    className="h-40 w-full object-cover md:h-48"
                />
                <div className="p-3">
                    <h3 className="font-semibold text-gray-900">{name}</h3>
                    {address?.trim() ? (
                        <p className="text-sm text-gray-500">{address.trim()}</p>
                    ) : null}
                </div>
            </div>
        </Link>
    );
}
