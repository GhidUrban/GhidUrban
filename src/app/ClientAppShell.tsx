"use client";

import AppHeader from "@/components/AppHeader";
import { usePathname } from "next/navigation";

export default function ClientAppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isHome = pathname === "/";

    return (
        <>
            {!isHome && <AppHeader />}
            {children}
        </>
    );
}
