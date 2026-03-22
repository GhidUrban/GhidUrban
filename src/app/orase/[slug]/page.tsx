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
        category_icon: string;
    }>;
};

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
    const { slug } = await params;
    const cityName = slugToTitle(slug);

    return {
        title: `Ghid Urban - ${cityName}`,
        description: `Descoperă ${cityName}: restaurante, cafenele și locuri interesante.`,
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
        <main className="min-h-screen bg-gray-100 px-4 pb-6 pt-[5px]">
            <div className="mb-6">
                <Breadcrumb
                    items={[
                        { label: "Orașe", href: "/orase" },
                        { label: cityName }
                    ]}
                />
            </div>

            <div className="mx-auto max-w-5xl">

                <h1 className="mb-8 mt-8 text-center text-3xl font-semibold text-gray-900 md:text-4xl">
                    {cityName}
                </h1>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {categories.map((category) => (
                        <Link
                            key={category.category_slug}
                            href={`/orase/${slug}/${category.category_slug}`}
                            className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                        >
                            <div className="relative overflow-hidden rounded-2xl">
                                <Image
                                    src={getImageByCategory(category.category_slug)}
                                    alt={slugToTitle(category.category_slug)}
                                    width={600}
                                    height={300}
                                    className="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                                    <span className="flex items-center gap-2 text-lg font-semibold text-white md:text-xl">
                                        <span>{category.category_icon}</span>
                                        <span>{slugToTitle(category.category_slug)}</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
