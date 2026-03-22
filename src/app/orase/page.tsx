import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import { apiGet } from "@/lib/internal-api";
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

export default async function OrasePage() {
  const positions = [
    { city: 0, col: 2, row: 1 },
    { city: 1, col: 4, row: 1 },
    { city: 2, col: 1, row: 2 },
    { city: 3, col: 5, row: 2 },
    { city: 4, col: 2, row: 3 },
    { city: 5, col: 4, row: 3 },
  ];

  const citiesResponse = await apiGet<CitiesApiResponseData>("/api/cities", {});
  const cities = citiesResponse.success && citiesResponse.data ? citiesResponse.data.cities : [];

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
    <main className="relative min-h-screen bg-gray-100 py-4 lg:flex lg:items-center lg:justify-center">
      <div className="mx-auto w-full max-w-4xl px-4 lg:hidden">
        <div className="mb-4">
          <Breadcrumb
            items={[{ label: "Acasă", href: "/" }, { label: "Orașe" }]}
          />
        </div>
        <Link
          href="/"
          className="mb-4 inline-block rounded-sm text-sm font-medium text-gray-600 transition-colors duration-200 ease-out hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-90"
        >
          ← Înapoi la Acasă
        </Link>
        <h1 className="mb-4 text-center text-2xl font-semibold text-gray-900">Orașe</h1>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {cities.map((city) => (
            <Link
              key={city.city_slug}
              href={`/orase/${city.city_slug}`}
              className="group block h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow,opacity] duration-200 ease-out hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100"
            >
              <div className="relative overflow-hidden rounded-t-2xl">
                <Image
                  src={`/images/${city.city_slug}/city.jpg`}
                  alt={city.city_name}
                  width={600}
                  height={400}
                  className="h-44 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] md:h-48"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-3 pb-4 pt-2">
                  <span className="block break-words text-center text-sm font-semibold leading-snug text-white">
                    {slugToTitle(city.city_slug)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="relative mx-auto hidden w-full max-w-5xl overflow-x-clip px-4 lg:block">
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

        <div className="mx-auto grid w-full max-w-5xl grid-cols-5 grid-rows-3 gap-2 place-items-center">
          <div className="col-start-3 row-start-2 text-center">
            <h1 className="text-center text-2xl font-semibold text-gray-900">Orașe</h1>
          </div>

          {positions.slice(0, cities.length).map((position) => {
            const city = cities[position.city];

            return (
              <Link
                key={city.city_slug}
                href={`/orase/${city.city_slug}`}
                className="group block h-full w-full min-w-0 max-w-[15rem] justify-self-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-lg"
                style={{
                  gridColumn: position.col,
                  gridRow: position.row,
                }}
              >
                <div className="relative overflow-hidden rounded-t-2xl">
                  <Image
                    src={`/images/${city.city_slug}/city.jpg`}
                    alt={city.city_name}
                    width={600}
                    height={400}
                    className="h-44 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] md:h-48"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 px-3 pb-4 pt-2 sm:px-4">
                    <span className="block break-words text-center text-sm font-semibold leading-snug text-white">
                      {slugToTitle(city.city_slug)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}