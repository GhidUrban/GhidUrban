import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityCategoryCarousels } from "@/components/CityCategoryCarousels";
import { OraseFlowPageHeader } from "@/components/OraseFlowPageHeader";
import { apiGet } from "@/lib/internal-api";
import { getTopPlacesPerCategoryForCity } from "@/lib/place-repository";
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
    const categorySlugs = categories.map((c) => c.category_slug);

    let placesByCategory: Record<string, Awaited<ReturnType<typeof getTopPlacesPerCategoryForCity>> extends Map<string, infer V> ? V : never> = {};
    try {
        const grouped = await getTopPlacesPerCategoryForCity(slug, categorySlugs, 5);
        placesByCategory = Object.fromEntries(grouped);
    } catch (e) {
        console.error("[CityPage] Failed to load top places:", e);
    }

    const categoryInfos = categories.map((c) => ({
        slug: c.category_slug,
        name: c.category_name,
    }));

    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-5xl px-4">
                <OraseFlowPageHeader
                    items={[
                        { label: "Orașe", href: "/orase" },
                        { label: cityName }
                    ]}
                    title={cityName}
                    titleClassName="max-w-2xl"
                />

                <CityCategoryCarousels
                    citySlug={slug}
                    categories={categoryInfos}
                    placesByCategory={placesByCategory}
                />
            </div>
        </main>
    );
}
