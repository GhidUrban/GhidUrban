import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <div className="flex w-full max-w-xl flex-col items-center gap-8 rounded-[1.75rem] border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-5 shadow-sm ring-1 ring-white/60 sm:max-w-2xl sm:p-6 md:p-8">
          <Image
            src="/images/ghidurban-logo-main.png"
            alt="GhidUrban"
            width={700}
            height={240}
            priority
            className="mx-auto h-auto w-full max-w-[300px] sm:max-w-[420px] md:max-w-[560px]"
          />

          <Link
            href="/orase"
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm shadow-black/[0.04] backdrop-blur-sm outline-none ring-1 ring-black/[0.04] transition-all duration-200 ease-out hover:-translate-y-px hover:border-black/20 hover:bg-white/85 hover:shadow-md hover:ring-black/[0.06] focus-visible:ring-2 focus-visible:ring-gray-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] active:border-black/20 active:bg-white/90 active:shadow-md active:translate-y-px"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0 text-neutral-600 opacity-80 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-active:translate-x-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m16.24 7.76-6.36 2.12-2.12 6.36 6.36-2.12 2.12-6.36z" />
            </svg>
            Explorează
          </Link>
        </div>
      </div>
    </main>
  );
}
