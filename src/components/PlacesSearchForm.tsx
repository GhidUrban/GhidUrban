"use client";

import { prewarmGlobalSearchIndex } from "@/lib/load-global-search-index";
import { useState } from "react";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

type PlacesSearchFormProps = {
  /** Extra classes on the outer wrapper (width/max-width live here). */
  className?: string;
};

export function PlacesSearchForm({ className = "" }: PlacesSearchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wrapper =
    "mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg" +
    (className ? ` ${className}` : "");

  return (
    <div className={wrapper}>
      <form
        action="/cauta"
        method="get"
        onSubmit={() => {
          setIsSubmitting(true);
        }}
        aria-busy={isSubmitting}
        className={`flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#2EC4B6]/30 md:gap-2 md:px-3 md:py-2 ${isSubmitting ? "opacity-90" : ""}`}
      >
        <SearchIcon className="pointer-events-none h-3.5 w-3.5 shrink-0 text-gray-400 md:h-4 md:w-4" />
        <input
          type="search"
          name="q"
          placeholder="Caută locații..."
          className="h-8 min-w-0 flex-1 appearance-none border-0 bg-transparent pr-1 text-sm leading-normal text-[#0B2A3C] caret-[#0B2A3C] outline-none shadow-none ring-0 placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none md:h-9"
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Caută locații"
          onFocus={() => {
            prewarmGlobalSearchIndex();
          }}
          onInput={() => {
            prewarmGlobalSearchIndex();
          }}
        />
        {isSubmitting ? (
          <span className="pointer-events-none inline-flex items-center" aria-hidden>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-[#2EC4B6]" />
          </span>
        ) : null}
      </form>
    </div>
  );
}
