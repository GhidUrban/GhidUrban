import type { ReactNode } from "react";

export type PageShellWidth = "wide" | "normal" | "narrow";

type PageShellProps = {
    children: ReactNode;
    width?: PageShellWidth;
    className?: string;
    innerClassName?: string;
};

const widthClass: Record<PageShellWidth, string> = {
    wide: "max-w-5xl",
    normal: "max-w-4xl",
    narrow: "max-w-2xl",
};

/** Shared public page frame: background, horizontal padding, max width. */
export function PageShell({
    children,
    width = "normal",
    className = "",
    innerClassName = "",
}: PageShellProps) {
    return (
        <main
            className={`min-h-screen bg-[var(--gu-surface,#f1f5f9)] py-4 ${className}`.trim()}
        >
            <div
                className={`mx-auto px-4 ${widthClass[width]} ${innerClassName}`.trim()}
            >
                {children}
            </div>
        </main>
    );
}
