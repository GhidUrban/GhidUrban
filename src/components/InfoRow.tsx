import type { ReactNode } from "react";

type InfoRowProps = {
    label: string;
    icon: ReactNode;
    children: ReactNode;
};

/** Label + icon row + content (place detail info block). */
export function InfoRow({ label, icon, children }: InfoRowProps) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-400/80">{label}</p>
            <div className="flex items-center gap-2 text-sm">
                <span
                    className="shrink-0 text-gray-400 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0"
                    aria-hidden
                >
                    {icon}
                </span>
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </div>
    );
}
