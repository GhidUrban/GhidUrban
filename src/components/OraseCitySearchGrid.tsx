import Link from "next/link";
import { CityCardImage } from "@/components/CityCardImage";
import { slugToTitle } from "@/lib/slug";
import type { PublicCityApiRow } from "@/lib/cities-api";

function displayName(city: PublicCityApiRow): string {
  const n = city.city_name?.trim();
  if (n) {
    return n;
  }
  return slugToTitle(city.city_slug);
}

export function OraseCitySearchGrid({ cities }: { cities: PublicCityApiRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {cities.map((city, index) => (
        <Link
          key={city.city_slug}
          href={`/orase/${city.city_slug}`}
          className="group block h-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm shadow-black/[0.04] outline-none ring-1 ring-black/[0.03] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-black/20 hover:shadow-lg hover:ring-black/[0.05] focus-visible:ring-2 focus-visible:ring-gray-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:scale-[0.99] active:border-black/20 active:shadow-md active:ring-black/[0.05]"
        >
          <div className="relative overflow-hidden rounded-t-2xl">
            <CityCardImage
              src={city.city_image}
              alt={displayName(city)}
              className="h-44 w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02] group-active:scale-[1.02] md:h-48"
              priority={index === 0}
              width={600}
              height={400}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>
        </Link>
      ))}
    </div>
  );
}
