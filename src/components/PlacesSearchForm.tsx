"use client";

import { SearchField } from "@/components/ui/SearchField";
import { prewarmGlobalSearchIndex } from "@/lib/prewarm-global-search-client";
import { useState } from "react";

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
        className={`flex min-h-[44px] items-center gap-2 rounded-xl border border-black/10 bg-white px-2.5 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#008fa8]/35 md:px-3 md:py-2 ${isSubmitting ? "opacity-90" : ""}`}
      >
        <SearchField
          type="search"
          name="q"
          placeholder="Caută locații..."
          loading={isSubmitting}
          variant="inset"
          aria-label="Caută locații"
          onFocus={() => {
            prewarmGlobalSearchIndex();
          }}
          onInput={() => {
            prewarmGlobalSearchIndex();
          }}
        />
      </form>
    </div>
  );
}
