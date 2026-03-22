"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Hysteresis: avoids flip-flop when scrollY bounces near one threshold (common on mobile).
const SCROLL_SCROLLED_ON_PX = 12;
const SCROLL_SCROLLED_OFF_PX = 2;

const navItems = [
  { href: "/", label: "Acasă" },
  { href: "/orase", label: "Explorează" },
] as const;

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:opacity-90 ${
        isActive
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AppHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let rafId = 0;

    const applyScrollState = () => {
      rafId = 0;
      const y = window.scrollY;
      setScrolled((prev) => {
        if (prev) {
          return y > SCROLL_SCROLLED_OFF_PX;
        }
        return y > SCROLL_SCROLLED_ON_PX;
      });
    };

    const onScroll = () => {
      if (rafId === 0) {
        rafId = requestAnimationFrame(applyScrollState);
      }
    };

    applyScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur transition-[background-color,box-shadow,border-color] duration-200 ${
        scrolled
          ? "border-gray-200 bg-white/95 shadow-sm supports-[backdrop-filter]:bg-white/95"
          : "border-gray-200/70 bg-white/85 shadow-none supports-[backdrop-filter]:bg-white/85"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-md leading-none outline-none transition-opacity duration-200 ease-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px active:opacity-90"
        >
          <Image
            src="/images/ghidurban-logo-main.png"
            alt="GhidUrban"
            width={200}
            height={64}
            className="h-8 w-auto sm:h-9 md:h-10"
            priority
          />
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Navigare principală">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
      </div>
    </header>
  );
}
