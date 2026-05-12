"use client";

import type { ReactNode } from "react";

export function HomeFixedMainShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        "flex w-full flex-col bg-[#f2f2f7] " +
        "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-0 max-md:z-0 max-md:overflow-hidden max-md:pb-[env(safe-area-inset-bottom)] " +
        "md:relative md:z-auto md:min-h-screen md:overflow-visible"
      }
    >
      <div className="flex min-h-0 flex-1 flex-col max-md:h-full md:min-h-screen">
        {children}
      </div>
    </div>
  );
}
