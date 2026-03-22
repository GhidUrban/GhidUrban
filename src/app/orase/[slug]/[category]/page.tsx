import type { Metadata } from "next";
import Link from "next/link";
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
    const title = `${categoryName} în ${cityName} | GhidUrban`;
    const description = `Locuri din ${categoryName} în ${cityName}. Lista se actualizează periodic.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            locale: "ro_RO",
            siteName: "GhidUrban",
            type: "website",
        },
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
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-4xl px-4">
                <div className="mb-4">
                    <Breadcrumb
                        items={[
                            { label: "Orașe", href: "/orase" },
                            { label: cityName, href: `/orase/${slug}` },
                            { label: categoryName }
                        ]}
                    />
                </div>

                <Link
                    href={`/orase/${slug}`}
                    className="mb-4 inline-block rounded-sm text-sm font-medium text-gray-600 transition-colors duration-200 ease-out hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-90"
                >
                    ← Înapoi la {cityName}
                </Link>

                <h1 className="mb-4 text-center text-2xl font-semibold text-gray-900">
                    {categoryName}
                </h1>

                <p className="text-center text-sm text-gray-600">{placesCountLabel}</p>

                <div className="mt-6">
                    <PlacesList places={[...places]} slug={slug} category={category} />
                </div>
            </div>
        </main>
    );
}