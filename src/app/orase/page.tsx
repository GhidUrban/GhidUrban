"use client";

import Link from "next/link";

export default function OrasePage() {
  const cities = [
    { name: "Baia Mare", slug: "baia-mare" },
    { name: "Cluj-Napoca", slug: "cluj-napoca" },
    { name: "București", slug: "bucuresti" },
    { name: "Oradea", slug: "oradea" },
    { name: "Timișoara", slug: "timisoara" },
    { name: "Brașov", slug: "brasov" },
  ];

  const positions = [
    { city: 0, col: 2, row: 1 },
    { city: 1, col: 4, row: 1 },

    { city: 2, col: 1, row: 2 },
    { city: 3, col: 5, row: 2 },

    { city: 4, col: 2, row: 3 },
    { city: 5, col: 4, row: 3 },
  ];

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-100 px-6 py-12 overflow-hidden">
      {/* centered subtle circles */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-300/5 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400/5 blur-3xl" />

      {/* subtle radial guide lines */}
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
        {/* Center title */}
        <div className="col-start-3 row-start-2 text-center">
          <h1 className="text-5xl font-semibold text-gray-900/80 drop-shadow-[0_0_20px_rgba(0,0,0,0.06)]">Orașe</h1>
        </div>

        {positions.map((p) => {
          const city = cities[p.city];

          return (
            <Link
              key={city.slug}
              href={`/orase/${city.slug}`}
              className="flex h-22 w-52 items-center justify-center rounded-3xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 text-center shadow-sm transition hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-gray-300/50"
              style={{
                gridColumn: p.col,
                gridRow: p.row
              }}
            >
              <span className="text-lg font-semibold text-gray-800/90">
                {city.name}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}