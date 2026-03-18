import Link from "next/link";

export default function OraseNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Eroare 404
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Nu am găsit pagina căutată
        </h1>

        <p className="mt-4 text-gray-600">
          Link-ul poate fi greșit sau locația nu există încă în GhidUrban.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/orase"
            className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Înapoi la Orașe
          </Link>

          <Link
            href="/"
            className="rounded-xl bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800"
          >
            Acasă
          </Link>
        </div>
      </div>
    </main>
  );
}
