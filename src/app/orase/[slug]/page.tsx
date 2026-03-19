import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import { slugToTitle } from "@/lib/slug";
import { apiGet } from "@/lib/internal-api";
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
    const positions = [
        { category: 0, col: 2, row: 1 },
        { category: 1, col: 4, row: 1 },
        { category: 2, col: 1, row: 2 },
        { category: 3, col: 5, row: 2 },
        { category: 4, col: 3, row: 3 },
    ];
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

                <div className="grid grid-cols-2 gap-4 lg:hidden">
                    {categories.map((category) => (
                        <Link
                            key={category.category_slug}
                            href={`/orase/${slug}/${category.category_slug}`}
                            className="flex min-h-32 items-center justify-center rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition hover:scale-[1.02] hover:shadow-md"
                        >
                            <span className="flex items-center gap-2 text-lg font-semibold text-gray-800/90">
                                <span>{category.category_icon}</span>
                                <span>{slugToTitle(category.category_slug)}</span>
                            </span>
                        </Link>
                    ))}
                </div>

                <div className="relative hidden lg:block">
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300/5 blur-3xl" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400/5 blur-3xl" />

                    <svg
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                    >
                        <line x1="50" y1="50" x2="20" y2="50" stroke="currentColor" strokeWidth="0.2" />
                        <line x1="50" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="0.2" />
                        <line x1="50" y1="50" x2="35" y2="15" stroke="currentColor" strokeWidth="0.2" />
                        <line x1="50" y1="50" x2="65" y2="15" stroke="currentColor" strokeWidth="0.2" />
                        <line x1="50" y1="50" x2="35" y2="85" stroke="currentColor" strokeWidth="0.2" />
                        <line x1="50" y1="50" x2="65" y2="85" stroke="currentColor" strokeWidth="0.2" />
                    </svg>

                    <div className="grid grid-cols-5 grid-rows-3 gap-10 place-items-center py-8">
                        <div className="col-start-3 row-start-2 text-center">
                            <h2 className="text-4xl font-semibold text-gray-900/80 drop-shadow-[0_0_20px_rgba(0,0,0,0.06)]">
                                {cityName}
                            </h2>
                        </div>

                        {positions.slice(0, categories.length).map((position) => {
                            const category = categories[position.category];

                            return (
                                <Link
                                    key={category.category_slug}
                                    href={`/orase/${slug}/${category.category_slug}`}
                                    className="flex h-24 w-52 items-center justify-center rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4 text-center shadow-sm transition hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-gray-300/50"
                                    style={{
                                        gridColumn: position.col,
                                        gridRow: position.row,
                                    }}
                                >
                                    <span className="flex items-center gap-2 text-lg font-semibold text-gray-800/90">
                                        <span>{category.category_icon}</span>
                                        <span>{slugToTitle(category.category_slug)}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
