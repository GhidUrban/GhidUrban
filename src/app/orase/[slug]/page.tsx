import Link from "next/link";

type CityPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CityPage({ params }: CityPageProps) {
  const { slug } = await params;
  const cityName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-12">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-gray-900">{cityName}</h1>

        <p className="mt-4 text-lg text-gray-600">
          Aici vor apărea locațiile și evenimentele din acest oraș.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/orase/${slug}/restaurante`}
            className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition"
          >
            <h2 className="text-2xl font-semibold">🍽 Restaurante</h2>
            <p className="mt-2 text-gray-600">
              Descoperă restaurante populare din {cityName}.
            </p>
          </Link>
          

          <Link
            href={`/orase/${slug}/cafenele`}
            className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition"
          >
            <h2 className="text-2xl font-semibold">☕ Cafenele</h2>
            <p className="mt-2 text-gray-600">
              Cafenele bune pentru lucru sau relaxare.
            </p>
          </Link>

          <Link
            href={`/orase/${slug}/institutii`}
            className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition"
          >
            <h2 className="text-2xl font-semibold">🏛 Instituții</h2>
            <p className="mt-2 text-gray-600">
              Instituții importante din oraș.
            </p>
          </Link>

          <Link
            href={`/orase/${slug}/cultural`}
            className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition"
          >
            <h2 className="text-2xl font-semibold">🎭 Cultural</h2>
            <p className="mt-2 text-gray-600">
              Muzee, teatre și evenimente culturale.
            </p>
          </Link>
          <Link
            href={`/orase/${slug}/evenimente`}
            className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition"
          >
            <h2 className="text-2xl font-semibold">🎉 Evenimente</h2>
            <p className="mt-2 text-gray-600">
              Evenimente și activități din {cityName}.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
