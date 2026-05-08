"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function HomeSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = useCallback(() => {
    const q = query.trim();
    if (q) {
      router.push(`/cauta?q=${encodeURIComponent(q)}`);
    }
  }, [query, router]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="w-full max-w-sm sm:max-w-md"
    >
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută un loc, categorie sau oraș..."
          className="h-11 w-full rounded-2xl border-0 bg-white pl-10 pr-4 text-[14px] text-gray-800 shadow-sm ring-1 ring-black/[0.06] outline-none transition-all placeholder:text-gray-400 focus:shadow-md focus:ring-2 focus:ring-[#2EC4B6]/30 sm:text-[15px]"
        />
      </div>
    </form>
  );
}
