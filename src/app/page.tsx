import Image from "next/image";
import Link from "next/link";
import { CityCardImage } from "@/components/CityCardImage";
import { HomeFixedMainShell } from "@/components/HomeFixedMainShell";
import { fetchPublicCitiesFromApi } from "@/lib/fetch-public-cities-api";
import type { PublicCityApiRow } from "@/lib/cities-api";
import { HomeHeroActions } from "@/components/HomeHeroActions";
import { HomePopularCarousel } from "@/components/HomePopularCarousel";

export default async function HomePage() {
  let cities: PublicCityApiRow[] = [];
  try {
    cities = await fetchPublicCitiesFromApi();
  } catch (e) {
    const err = e instanceof Error ? e : null;
    const cause =
      err?.cause instanceof Error
        ? err.cause.message
        : err?.cause != null
          ? String(err.cause)
          : undefined;
    const detail =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : e instanceof Error
          ? e.message
          : JSON.stringify(e);
    console.error("[HomePage] Failed to load cities:", detail, cause ? { cause } : "");
    cities = [];
  }

  return (
    <HomeFixedMainShell>
      <main className="flex min-h-0 flex-1 flex-col max-md:overflow-y-auto md:min-h-screen md:overflow-visible">
        <section className="flex shrink-0 flex-col items-center px-5 pb-6 pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-4 sm:px-6 sm:pb-8 sm:pt-12">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 rounded-3xl bg-white/80 px-6 py-8 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)] ring-1 ring-indigo-200/40 backdrop-blur-sm sm:px-10 sm:py-10">
            <Image
              src="/logo-full.png"
              alt="GhidUrban"
              width={700}
              height={240}
              priority
              className="h-auto w-full max-w-[280px] sm:max-w-[320px]"
            />

            <HomeHeroActions />
          </div>
        </section>

        <div className="shrink-0 flex-none">
          <HomePopularCarousel />
        </div>

        {cities.length > 0 && (
          <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden pb-6 md:pb-12">
            <div className="mb-2 flex shrink-0 items-center justify-between px-5">
              <h2 className="text-[15px] font-semibold text-slate-800 sm:text-base">Orașe</h2>
              <Link
                href="/orase"
                className="text-[13px] font-medium text-[#008fa8] active:opacity-70 sm:text-sm"
              >
                Vezi toate
              </Link>
            </div>

            <div className="no-scrollbar flex shrink-0 scroll-px-5 items-start gap-3 overflow-x-auto overflow-y-hidden scroll-smooth px-5 pb-1 snap-x snap-mandatory">
            {cities.map((city) => (
              <Link
                key={city.city_slug}
                href={`/orase/${city.city_slug}`}
                className="group w-52 shrink-0 snap-start sm:w-60"
              >
                <div className="relative h-44 overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200/50 transition-all duration-200 active:scale-[0.98] sm:h-48 md:hover:shadow-md md:hover:-translate-y-0.5">
                  <CityCardImage
                    src={city.city_image}
                    alt={city.city_name}
                    width={400}
                    height={260}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>
              </Link>
            ))}
            </div>
          </section>
        )}
      </main>
    </HomeFixedMainShell>
  );
}
