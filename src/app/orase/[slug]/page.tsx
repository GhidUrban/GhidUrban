import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import { slugToTitle } from "@/lib/slug";
import { apiGet } from "@/lib/internal-api";
import { getImageByCategory } from "@/lib/image";
import { notFound } from "next/navigation";
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
                <div className="mb-4">
                    <Breadcrumb
                        items={[
                            { label: "Orașe", href: "/orase" },
                            { label: cityName }
                        ]}
                    />
                </div>

                <Link
                    href="/orase"
                    className="mb-4 inline-block rounded-sm text-sm font-medium text-gray-600 outline-none transition-colors duration-200 ease-out hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:translate-y-0.5 active:opacity-90"
                >
                    ← Înapoi la Orașe
                </Link>

                <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-gray-900">
                    {cityName}
                </h1>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {categories.map((category) => {
                        const categoryTitle =
                            category.category_name?.trim() || slugToTitle(category.category_slug);
                        return (
                        <Link
                            key={category.category_slug}
                            href={`/orase/${slug}/${category.category_slug}`}
                            aria-label={`${categoryTitle}, vezi locurile`}
                            className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm outline-none transition-[transform,box-shadow,opacity] duration-200 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:translate-y-0.5 active:opacity-90"
                        >
                            <div className="relative shrink-0 overflow-hidden rounded-t-2xl">
                                <Image
                                    src={getImageByCategory(category.category_slug)}
                                    alt={categoryTitle}
                                    width={600}
                                    height={400}
                                    className="h-44 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] md:h-48"
                                />
                            </div>
                            <div className="flex flex-1 flex-col justify-center p-4 text-center">
                                <span className="text-sm font-semibold text-gray-900">{categoryTitle}</span>
                            </div>
                        </Link>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
