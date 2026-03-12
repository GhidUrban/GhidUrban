import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
type CityPageProps = {
    params: Promise<{ slug: string }>;
};

export default async function CityPage({ params }: CityPageProps) {
    const { slug } = await params;

    const cityName = slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const categories = [
        { name: "Restaurante", slug: "restaurante", icon: "🍽" },
        { name: "Spitale", slug: "spitale", icon: "🏥" },
        { name: "Cafenele", slug: "cafenele", icon: "☕" },
        { name: "Instituții", slug: "institutii", icon: "🏛" },
        { name: "Cultural", slug: "cultural", icon: "🎭" },
        { name: "Evenimente", slug: "evenimente", icon: "🎉" },
    ];

    const positions = [
        { category: 0, col: 2, row: 1 },
        { category: 1, col: 4, row: 1 },
        { category: 2, col: 1, row: 2 },
        { category: 3, col: 5, row: 2 },
        { category: 4, col: 2, row: 3 },
        { category: 5, col: 4, row: 3 },
    ];

    return (
        <main className="relative flex min-h-screen items-center justify-center bg-gray-100 px-6 py-12 overflow-hidden">
            <Breadcrumb
                items={[
                    { label: "Orașe", href: "/orase" },
                    { label: cityName }
                ]}
            />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300/5 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400/5 blur-3xl" />

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

            <div className="grid grid-cols-5 grid-rows-3 gap-10 w-full max-w-4xl place-items-center">
                <div className="col-start-3 row-start-2 text-center">
                    <h1 className="text-3xl md:text-4xl font-semibold text-gray-900/70 whitespace-nowrap tracking-wide">
                        {cityName}
                    </h1>
                </div>

                {positions.map((p) => {
                    const category = categories[p.category];

                    return (
                        <Link
                            key={category.slug}
                            href={`/orase/${slug}/${category.slug}`}
                            className="flex h-20 w-48 items-center justify-center rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 text-center shadow-sm transition hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-gray-300/50 hover:bg-white cursor-pointer"
                            style={{ gridColumn: p.col, gridRow: p.row }}
                        >
                            <span className="flex items-center gap-2 text-lg font-semibold text-gray-800/90">
                                <span>{category.icon}</span>
                                {category.name}
                                <span className="opacity-60">→</span>
                            </span>
                        </Link>
                    );
                })}
            </div>
        </main>
    );
}
