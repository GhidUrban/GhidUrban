import { placesByCity, type Place } from "@/data/places";
import { PlacesList } from "@/components/PlaceLists";
import { PlaceCard } from "@/components/PlaceCard";
import Link from "next/link";


type CategoryPageProps = {
    params: Promise<{ slug: string; category: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug, category } = await params;

    const cityName = slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const categoryName = category
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");



    const cityData = placesByCity as unknown as Record<string, Record<string, Place[]>>;
    const places = cityData[slug]?.[category] ?? [];

    return (
        <main className="min-h-screen bg-gray-100 px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <div className="rounded-xl bg-white p-8 shadow-sm">
                    <h1 className="text-4xl font-bold text-gray-900">
                        {categoryName} din {cityName}
                    </h1>

                    <p className="mt-4 text-lg text-gray-600">
                        Aici vor apărea toate {categoryName.toLowerCase()} din {cityName}.
                    </p>
                </div>
                
                <PlacesList places={places} slug={slug} category={category} />

            </div>
        </main>
    );
}