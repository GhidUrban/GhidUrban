"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function isOraseExplorationPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "orase") return false;
  return segments.length <= 3;
}

function isPlaceDetailPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "orase" && segments.length === 4;
}

const navBtnBase =
  "inline-flex shrink-0 items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-medium leading-none outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#008fa8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.97] md:px-3 md:py-2 md:text-sm";

/** CTA principal (ex. homepage hero) — aceeași siluetă ca nav non-exploration. */
export const accentAddPlaceCtaClassName =
  `${navBtnBase} whitespace-nowrap border border-transparent bg-[#008fa8] text-white shadow-sm hover:bg-[#007a90] active:bg-[#00748a]`;

/** CTA pentru rând îngust (ex. /cauta lângă input). */
export const accentAddPlaceCtaCompactClassName =
  "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-transparent bg-[#008fa8] px-3 text-xs font-medium text-white shadow-sm outline-none transition-all duration-200 ease-out hover:bg-[#007a90] active:scale-[0.97] active:bg-[#00748a] focus-visible:ring-2 focus-visible:ring-[#008fa8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

function AddPlaceNavCta({ exploration }: { exploration: boolean }) {
  return (
    <Link
      href="/adauga-locatie"
      className={
        exploration
          ? `${navBtnBase} border border-gray-200/80 bg-white/80 text-slate-600 backdrop-blur-sm hover:border-gray-300 hover:bg-white hover:text-[#007a90]`
          : accentAddPlaceCtaClassName
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

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 w-full max-w-7xl items-center px-4 md:h-14 md:px-6">
        <Link
          href="/"
          className="flex min-h-0 shrink-0 items-center rounded-lg outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="GhidUrban — acasă"
        >
          <Image
            src="/logo-full.png"
            alt="GhidUrban"
            width={500}
            height={170}
            className="h-10 w-auto md:h-11"
          />
        </Link>

        <div className="min-w-0 flex-1" aria-hidden />

        <nav
          className="flex min-h-0 shrink-0 items-center justify-end gap-1.5 md:gap-2"
          aria-label="Navigare principală"
        >
          {!hideAddPlaceCta && <AddPlaceNavCta exploration={explorationOrase} />}
        </nav>
      </div>
    </header>
  );
}
