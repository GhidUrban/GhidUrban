import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { slugToTitle } from "@/lib/slug";
import { apiGet } from "@/lib/internal-api";
import { notFound } from "next/navigation";
type CityPageProps = {
    params: Promise<{ slug: string }>;
};

type CategoriesApiData = {
    city_slug: string;
    count: number;
    categories: Array<{
        category_slug: string;
        category_name: string;
        category_icon: string;
    }>;
};

export default async function CityPage({ params }: CityPageProps) {
    const { slug } = await params;

    const categoriesResponse = await apiGet<CategoriesApiData>("/api/categories", {
        city_slug: slug,
    });

    if (categoriesResponse.status === 404) {
        notFound();
    }
    if (!categoriesResponse.success || !categoriesResponse.data) {
        notFound();
    }

    const cityName = slugToTitle(slug);
    const categories = categoriesResponse.data.categories;

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-8">
            <div className="mx-auto max-w-5xl">
            <Breadcrumb
                items={[
                    { label: "Orașe", href: "/orase" },
                    { label: cityName }
                ]}
            />

                <h1 className="mb-8 mt-8 text-center text-3xl font-semibold text-gray-900 md:text-4xl">
                    {cityName}
                </h1>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {categories.map((category) => (
                        <Link
                            key={category.category_slug}
                            href={`/orase/${slug}/${category.category_slug}`}
                            className="flex min-h-32 items-center justify-center rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:scale-[1.02] hover:shadow-md"
                        >
                            <span className="flex items-center gap-2 text-lg font-semibold text-gray-800/90">
                                <span>{category.category_icon}</span>
                                <span>{category.category_name}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
