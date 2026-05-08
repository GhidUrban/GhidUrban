"use client";

import { useEffect, useState } from "react";

export function DelayedSpinner({ delayMs = 1000 }: { delayMs?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  return (
    <div
      className={`flex min-h-[40vh] items-center justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <svg
        className="h-8 w-8 animate-spin text-gray-300"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}
