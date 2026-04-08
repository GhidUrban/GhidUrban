"use client";

import { useEffect, useRef, useState } from "react";

type MapOptionsButtonProps = {
    placeName: string;
    address: string;
};

function buildMapUrls(placeName: string, address: string) {
    const q = `${placeName} ${address}`.trim();
    const encoded = encodeURIComponent(q);
    return {
        google: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        apple: `https://maps.apple.com/?q=${encoded}`,
        waze: `https://waze.com/ul?q=${encoded}`,
    };
}

export function MapOptionsButton({ placeName, address }: MapOptionsButtonProps) {
    const [open, setOpen] = useState(false);
    const [entered, setEntered] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            setEntered(false);
            return;
        }
        setEntered(false);
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setEntered(true);
            });
        });
        return () => cancelAnimationFrame(id);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: PointerEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const urls = buildMapUrls(placeName, address);
    const options = [
        {
            key: "google",
            label: "Deschide în Google Maps",
            pillLabel: "Google Maps",
            href: urls.google,
        },
        {
            key: "apple",
            label: "Deschide în Apple Maps",
            pillLabel: "Apple Maps",
            href: urls.apple,
        },
        {
            key: "waze",
            label: "Deschide în Waze",
            pillLabel: "Waze",
            href: urls.waze,
        },
    ] as const;

    return (
        <div ref={rootRef} className="relative mt-2.5">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline border-0 bg-transparent p-0 text-left text-sm text-gray-500 shadow-none transition-colors hover:text-gray-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-expanded={open}
                aria-haspopup="menu"
            >
                Vezi pe hartă
            </button>
            {open ? (
                <>
                    <div
                        className={`fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[1px] transition-opacity duration-[175ms] ease-out md:hidden ${entered ? "opacity-100" : "opacity-0"}`}
                        onClick={() => setOpen(false)}
                        role="presentation"
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="map-options-sheet-title"
                            className={`w-full max-w-[280px] rounded-3xl border border-gray-200/70 bg-white px-3.5 py-3.5 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-[opacity,transform] duration-[200ms] ease-out ${entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-0.5 scale-[0.98] opacity-0"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p
                                id="map-options-sheet-title"
                                className="mb-1.5 text-center text-[11px] font-medium text-gray-400"
                            >
                                Deschide cu
                            </p>
                            <div className="flex flex-col gap-1">
                                {options.map((opt) => (
                                    <a
                                        key={opt.key}
                                        href={opt.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block rounded-2xl border border-gray-200/70 bg-white px-3.5 py-2 text-center text-[13px] font-medium text-gray-800 transition duration-150 ease-out hover:bg-gray-50 active:bg-gray-50"
                                        onClick={() => setOpen(false)}
                                    >
                                        {opt.pillLabel}
                                    </a>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="mt-2 w-full rounded-2xl bg-gray-100/60 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-100/80"
                            >
                                Anulează
                            </button>
                        </div>
                    </div>

                    <ul
                        role="menu"
                        className="absolute left-0 top-full z-20 mt-1 hidden min-w-[12rem] max-w-full rounded-lg border border-gray-200/60 bg-white py-1 shadow-[0_2px_6px_rgba(0,0,0,0.04)] md:block"
                    >
                        {options.map((opt) => (
                            <li key={opt.key}>
                                <a
                                    role="menuitem"
                                    href={opt.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                    onClick={() => setOpen(false)}
                                >
                                    {opt.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </>
            ) : null}
        </div>
    );
}
