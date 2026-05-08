"use client";

import AppHeader from "@/components/AppHeader";

export default function ClientAppShell({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AppHeader />
            {children}
        </>
    );
}
