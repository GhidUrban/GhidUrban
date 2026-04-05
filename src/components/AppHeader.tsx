"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isOraseExplorationPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "orase") return false;
  return segments.length <= 3;
}

/** /orase/[slug]/[category]/[placeId] */
function isPlaceDetailPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "orase" && segments.length === 4;
}

function BrandPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 4.52 5.27 10.42 6.35 11.58.37.42.93.42 1.3 0C13.73 19.42 19 13.52 19 9c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

const addPlaceCtaBase =
  "inline-flex shrink-0 items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-medium leading-none outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#008fa8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.99] md:px-3 md:py-2 md:text-sm";

function AddPlaceNavCta({ exploration }: { exploration: boolean }) {
  return (
    <Link
      href="/adauga-locatie"
      className={
        exploration
          ? `${addPlaceCtaBase} border border-gray-200/90 bg-white text-slate-600 shadow-none hover:border-gray-300 hover:bg-gray-50/80 hover:text-[#007a90] md:border-[#008fa8]/32 md:bg-white md:text-[#007a90] md:hover:border-[#008fa8]/42 md:hover:bg-[#008fa8]/[0.06]`
          : `${addPlaceCtaBase} border border-[#008fa8]/28 bg-[#008fa8]/[0.07] text-[#0d5c6e] shadow-none hover:border-[#008fa8]/36 hover:bg-[#008fa8]/[0.11] md:border-transparent md:bg-[#008fa8] md:text-white md:shadow-sm md:shadow-black/[0.06] md:hover:bg-[#007a90] md:active:bg-[#00748a]`
      }
    >
      Adaugă locație
    </Link>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const explorationOrase = isOraseExplorationPath(pathname);
  const hideAddPlaceCta = isPlaceDetailPath(pathname);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-4 md:h-16 md:px-6">
        <Link
          href="/"
          className="flex min-h-0 shrink-0 items-center gap-1 rounded-md py-0.5 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white md:gap-1.5"
          aria-label="GhidUrban — acasă"
        >
          <BrandPinIcon className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#2EC4B6] md:h-6 md:w-6" />
          <span className="text-sm font-bold leading-tight tracking-tight md:text-base md:font-semibold">
            <span className="text-[#0B2A3C]">Ghid</span>
            <span className="text-[#2EC4B6]">Urban</span>
          </span>
        </Link>

        <div className="min-w-0 flex-1" aria-hidden />

        <nav
          className="flex min-h-0 shrink-0 items-center justify-end gap-2 py-0.5"
          aria-label="Navigare principală"
        >
          {!hideAddPlaceCta ? (
            <AddPlaceNavCta exploration={explorationOrase} />
          ) : null}
        </nav>
      </div>
    </header>
  );
}
