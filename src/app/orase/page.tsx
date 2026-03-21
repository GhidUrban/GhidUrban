import Link from "next/link";
import { apiGet } from "@/lib/internal-api";
import { slugToTitle } from "@/lib/slug";

type CitiesApiResponseData = {
  count: number;
  cities: Array<{
    city_slug: string;
    city_name: string;
  }>;
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
      <main className="relative flex min-h-screen items-center justify-center bg-gray-100 px-6 py-12 overflow-hidden">
        <p className="text-lg font-medium text-gray-600">Nu s-au putut incarca orasele</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-100 px-6 py-12 overflow-hidden">
      <div className="w-full max-w-4xl lg:hidden">
        <h1 className="mb-8 text-center text-4xl font-semibold text-gray-900/80">Orașe</h1>
        <div className="grid grid-cols-2 gap-4">
          {cities.map((city) => (
            <Link
              key={city.city_slug}
              href={`/orase/${city.city_slug}`}
              className="flex min-h-28 items-center justify-center rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm"
            >
              <span className="text-base font-semibold text-gray-800/90">
                {slugToTitle(city.city_slug)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="hidden w-full max-w-4xl lg:block">
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

        <div className="grid w-full max-w-4xl grid-cols-5 grid-rows-3 gap-10 place-items-center">
          <div className="col-start-3 row-start-2 text-center">
            <h1 className="text-5xl font-semibold text-gray-900/80 drop-shadow-[0_0_20px_rgba(0,0,0,0.06)]">Orașe</h1>
          </div>

          {positions.slice(0, cities.length).map((position) => {
            const city = cities[position.city];

            return (
              <Link
                key={city.city_slug}
                href={`/orase/${city.city_slug}`}
                className="flex h-22 w-52 items-center justify-center rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 text-center shadow-sm transition hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-gray-300/50"
                style={{
                  gridColumn: position.col,
                  gridRow: position.row,
                }}
              >
                <span className="text-lg font-semibold text-gray-800/90">
                  {slugToTitle(city.city_slug)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}