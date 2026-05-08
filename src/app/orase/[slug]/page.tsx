import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OraseCategorySearchGrid } from "@/components/OraseCategorySearchGrid";
import { OraseFlowPageHeader } from "@/components/OraseFlowPageHeader";
import { apiGet } from "@/lib/internal-api";
import { slugToTitle } from "@/lib/slug";

type CityPageProps = {
    params: Promise<{ slug: string }>;
};

type CategoriesApiResponseData = {
    city_slug: string;
    count: number;
    categories: Array<{
        category_slug: string;
        category_name: string;
    }>;
};

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
    const { slug } = await params;
    const cityName = slugToTitle(slug);
    const title = `${cityName} | GhidUrban`;
    const description = `Ghid pentru ${cityName}: categorii de locuri și recomandări locale.`;

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

export default async function CityPage({ params }: CityPageProps) {
    const { slug } = await params;
    const categoriesApiQuery = {
        city_slug: slug,
    };

    const categoriesResponse = await apiGet<CategoriesApiResponseData>("/api/categories", categoriesApiQuery);

    if (categoriesResponse.status === 404) {
        notFound();
    }
    if (!categoriesResponse.success || !categoriesResponse.data) {
        notFound();
    }

    const cityName = slugToTitle(slug);
    const categories = categoriesResponse.data.categories;

    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-4xl px-4">
                <OraseFlowPageHeader
                    items={[
                        { label: "Orașe", href: "/orase" },
                        { label: cityName }
                    ]}
                    title={cityName}
                    titleClassName="max-w-2xl"
                />

                <OraseCategorySearchGrid citySlug={slug} categories={categories} />
            </div>
        </main>
    );
}
