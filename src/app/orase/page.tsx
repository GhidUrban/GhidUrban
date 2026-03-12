import Link from "next/link";

export default function OrasePage() {
  const cities = [
    { name: "Baia Mare", slug: "baia-mare" },
    { name: "Cluj-Napoca", slug: "cluj-napoca" },
    { name: "București", slug: "bucuresti" },
  ];

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900">Orașe</h1>

        <p className="mt-3 text-lg text-gray-600">
          Descoperă orașele disponibile în GhidUrban.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cities.map((city) => (
            <Link
              key={city.slug}
              href={`/orase/${city.slug}`}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-2xl font-semibold text-gray-800">
                {city.name}
              </h2>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}