import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import { PlacesList } from "@/components/PlaceLists";
import { apiGet } from "@/lib/internal-api";
import { slugToTitle } from "@/lib/slug";
import { notFound } from "next/navigation";
import type { Place } from "@/data/places";


type CategoryPageProps = {
    params: Promise<{ slug: string; category: string }>;
};

type PlacesApiResponseData = {
    city_slug: string;
    category_slug: string;
    count: number;
    places: Place[];
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const { slug, category } = await params;
    const cityName = slugToTitle(slug);
    const categoryName = slugToTitle(category);

    return {
        title: `${categoryName} în ${cityName} | Ghid Urban`,
        description: `Vezi cele mai bune ${categoryName.toLowerCase()} din ${cityName}.`,
    };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
    const { slug, category } = await params;
    const placesApiQuery = {
        city_slug: slug,
        category_slug: category,
    };

    const placesResponse = await apiGet<PlacesApiResponseData>("/api/places", placesApiQuery);

    if (placesResponse.status === 404) {
        notFound();
    }
    if (!placesResponse.success || !placesResponse.data) {
        notFound();
    }

    const cityName = slugToTitle(slug);
    const categoryName = slugToTitle(category);
    const places = placesResponse.data.places;
    const placesCountLabel = places.length === 1 ? "1 locație găsită" : `${places.length} locații găsite`;

    return (
        <main className="min-h-screen bg-gray-100 px-4 pb-6 pt-[5px]">
            <div className="mb-6">
                <Breadcrumb
                    items={[
                        { label: "Orașe", href: "/orase" },
                        { label: cityName, href: `/orase/${slug}` },
                        { label: categoryName }
                    ]}
                />
            </div>

            <div className="mx-auto max-w-5xl">

                <h1 className="mb-4 mt-8 text-center text-3xl font-semibold text-gray-900 md:text-4xl">
                    {categoryName}
                </h1>

                <p className="mb-6 text-center text-sm font-medium text-gray-700">{placesCountLabel}</p>

                <PlacesList places={[...places]} slug={slug} category={category} />
            </div>
        </main>
    );
}