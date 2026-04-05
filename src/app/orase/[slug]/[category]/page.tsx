import type { Metadata } from "next";
import { OraseFlowPageHeader } from "@/components/OraseFlowPageHeader";
import { CategoryPlacesSection } from "@/components/CategoryPlacesSection";
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

    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-4xl px-4">
                <OraseFlowPageHeader
                    items={[
                        { label: "Orașe", href: "/orase" },
                        { label: cityName, href: `/orase/${slug}` },
                        { label: categoryName }
                    ]}
                    title={categoryName}
                    titleClassName="max-w-2xl"
                />

                <CategoryPlacesSection places={[...places]} slug={slug} category={category} />
            </div>
        </main>
    );
}