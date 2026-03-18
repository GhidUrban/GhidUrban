import Breadcrumb from "@/components/Breadcrumb";
import { PlacesList } from "@/components/PlaceLists";
import { apiGet } from "@/lib/internal-api";
import { slugToTitle } from "@/lib/slug";
import { notFound } from "next/navigation";
import type { Place } from "@/data/places";


type CategoryPageProps = {
    params: Promise<{ slug: string; category: string }>;
};

type PlacesApiData = {
    city_slug: string;
    category_slug: string;
    count: number;
    places: Place[];
};

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug, category } = await params;

    const placesResponse = await apiGet<PlacesApiData>("/api/places", {
        city_slug: slug,
        category_slug: category,
    });

    if (placesResponse.status === 404) {
        notFound();
    }
    if (!placesResponse.success || !placesResponse.data) {
        notFound();
    }

    const cityName = slugToTitle(slug);
    const categoryName = slugToTitle(category);
    const places = placesResponse.data.places;

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-8">
            <div className="mx-auto max-w-5xl">
            <Breadcrumb
                items={[
                    { label: "Orașe", href: "/orase" },
                    { label: cityName, href: `/orase/${slug}` },
                    { label: categoryName }
                ]}
            />

                <h1 className="mb-8 mt-8 text-center text-3xl font-semibold text-gray-900 md:text-4xl">
                    {categoryName}
                </h1>

                <PlacesList places={[...places]} slug={slug} category={category} />
            </div>
        </main>
    );
}