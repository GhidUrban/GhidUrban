import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import { getPublicCitiesFromSupabase } from "@/lib/place-repository";
import { slugToTitle } from "@/lib/slug";

type CitiesApiResponseData = {
    count: number;
    cities: Array<{
        city_slug: string;
        city_name: string;
    }>;
};

export const metadata: Metadata = {
    title: "Orașe | GhidUrban",
    description:
        "Alege un oraș și explorează categorii de locuri recomandate din România.",
    openGraph: {
        title: "Orașe | GhidUrban",
        description:
            "Alege un oraș și explorează categorii de locuri recomandate din România.",
        locale: "ro_RO",
        siteName: "GhidUrban",
        type: "website",
    },
};

function cityDisplayName(city: CitiesApiResponseData["cities"][number]): string {
    const n = city.city_name?.trim();
    if (n) {
        return n;
    }
    return slugToTitle(city.city_slug);
}

export default async function OrasePage() {
    let cities: CitiesApiResponseData["cities"] = [];
    try {
        const rows = await getPublicCitiesFromSupabase();
        cities = rows.map((c) => ({
            city_slug: c.slug,
            city_name: c.name,
        }));
    } catch {
        cities = [];
    }

    if (cities.length === 0) {
        return (
            <main className="relative min-h-screen bg-gray-100 py-4">
                <div className="mx-auto max-w-4xl px-4">
                    <p className="text-center text-sm text-gray-600">Nu s-au putut incarca orasele</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-5xl px-4">
                <div className="mb-4">
                    <Breadcrumb items={[{ label: "Acasă", href: "/" }, { label: "Orașe" }]} />
                </div>
                <Link
                    href="/"
                    className="mb-4 inline-block rounded-sm text-sm font-medium text-gray-600 outline-none transition-colors duration-200 ease-out hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:translate-y-0.5 active:opacity-90"
                >
                    ← Înapoi la Acasă
                </Link>
                <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-gray-900">
                    Orașe
                </h1>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {cities.map((city) => (
                        <Link
                            key={city.city_slug}
                            href={`/orase/${city.city_slug}`}
                            className="group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm outline-none transition-[transform,box-shadow,opacity] duration-200 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:translate-y-0.5 active:opacity-90"
                        >
                            <div className="relative overflow-hidden rounded-t-2xl">
                                <Image
                                    src={`/images/places/${city.city_slug}/city.jpg`}
                                    alt={cityDisplayName(city)}
                                    width={600}
                                    height={400}
                                    className="h-44 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] md:h-48"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 px-3 pb-4 pt-2 sm:px-4">
                                    <span className="block break-words text-center text-sm font-semibold leading-snug text-white">
                                        {cityDisplayName(city)}
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
