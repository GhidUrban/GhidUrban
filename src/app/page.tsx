import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 sm:py-8">
      <div className="mx-auto flex min-h-[78vh] max-w-5xl flex-col items-center justify-center text-center">
        <Link
          href="/orase"
          className="block w-full max-w-xl rounded-[1.75rem] border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-5 shadow-sm ring-1 ring-white/60 transition hover:-translate-y-1 hover:shadow-lg hover:ring-gray-200 sm:max-w-2xl sm:p-6 md:p-8"
        >
          <Image
            src="/images/ghidurban-logo-main.png"
            alt="GhidUrban"
            width={700}
            height={240}
            priority
            className="mx-auto mb-2 h-auto w-full max-w-[300px] sm:mb-3 sm:max-w-[420px] md:max-w-[560px]"
          />

          <p className="text-sm font-medium leading-relaxed text-gray-700 sm:text-base md:text-lg">
            Descoperă orașul tău, locuri utile și recomandări locale.
          </p>
        </Link>
      </div>
    </main>
  );
}