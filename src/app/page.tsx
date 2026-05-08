import Image from "next/image";
import Link from "next/link";
import { getPublicCitiesFromSupabase } from "@/lib/place-repository";
import { HomeSearchBar } from "@/components/HomeSearchBar";
import { HomePopularCarousel } from "@/components/HomePopularCarousel";

export default async function HomePage() {
  let cities: { slug: string; name: string; image: string | null }[] = [];
  try {
    cities = await getPublicCitiesFromSupabase();
  } catch (e) {
    console.error("[HomePage] Failed to load cities:", e);
    cities = [];
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#f2f2f7]">
      <section className="flex flex-col items-center gap-5 bg-gradient-to-b from-white to-[#f2f2f7] px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
        <Link
          href="/orase"
          className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-white/70 px-8 py-6 shadow-md backdrop-blur-sm transition-all duration-200 active:scale-[0.98] sm:max-w-md sm:px-12 sm:py-8 md:hover:shadow-lg"
        >
          <Image
            src="/logo-full.png"
            alt="GhidUrban"
            width={700}
            height={240}
            priority
            className="h-auto w-[200px] sm:w-[260px] md:w-[300px]"
          />
          <p className="text-[13px] text-gray-500 sm:text-sm">
            Descoperă locuri din orașul tău
          </p>
        </Link>

        <HomeSearchBar />
      </section>

      <HomePopularCarousel />

      {cities.length > 0 && (
        <section className="mx-auto w-full max-w-5xl pb-12">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-[15px] font-semibold text-gray-800 sm:text-base">Orașe</h2>
            <Link
              href="/orase"
              className="text-[13px] font-medium text-[#008fa8] active:opacity-70 sm:text-sm"
            >
              Vezi toate
            </Link>
          </div>

          <div className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4 snap-x snap-mandatory">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/orase/${city.slug}`}
                className="group w-44 shrink-0 snap-start sm:w-52"
              >
                <div className="relative h-36 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 active:scale-[0.98] sm:h-40 md:hover:shadow-md md:hover:-translate-y-0.5">
                  {city.image ? (
                    <Image
                      src={city.image}
                      alt={city.name}
                      width={400}
                      height={260}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#2EC4B6] to-[#008fa8]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="text-[13px] font-semibold text-white drop-shadow-sm sm:text-sm">
                      {city.name}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
