import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <Link
        href="/orase"
        className="group block text-center"
      >
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 transition group-hover:text-gray-700 sm:text-6xl">
          GhidUrban
        </h1>

        <p className="mt-4 text-lg text-gray-500">
          Descoperă orașele și locurile
        </p>

        <p className="mt-1 text-sm text-gray-400">
          Apasă pentru a explora
        </p>
      </Link>
    </main>
  );
}