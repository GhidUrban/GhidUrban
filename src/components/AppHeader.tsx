"use client";

import Image from "next/image";
import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="bg-gray-100">
      <div className="flex w-full items-center justify-start px-3 py-0 sm:px-4">
        <Link href="/" className="block leading-none">
          <Image
            src="/images/ghidurban-logo-main.png"
            alt="GhidUrban"
            width={300}
            height={100}
            className="block h-[34px] w-auto sm:h-[42px] md:h-[60px] lg:h-[160px]"
            priority
          />
        </Link>
      </div>
      <div className="-mt-5 border-b border-gray-200 sm:-mt-6 md:-mt-7 lg:-mt-8" />
    </header>
  );
}
