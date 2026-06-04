"use client";

import type { InputHTMLAttributes, Ref } from "react";

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

export type SearchFieldProps = {
    id?: string;
    name?: string;
    type?: "text" | "search";
    value?: string;
    onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"];
    onFocus?: InputHTMLAttributes<HTMLInputElement>["onFocus"];
    onInput?: InputHTMLAttributes<HTMLInputElement>["onInput"];
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    inputRef?: Ref<HTMLInputElement>;
    /** standalone = bordered input; inset = borderless inside a parent form shell */
    variant?: "standalone" | "inset";
    radius?: "xl" | "2xl";
    className?: string;
    inputClassName?: string;
    "aria-label"?: string;
    "aria-busy"?: boolean;
};

const BRAND_FOCUS =
    "focus-within:ring-2 focus-within:ring-[#008fa8]/35 focus-within:outline-none";

export function SearchField({
    id,
    name,
    type = "search",
    value,
    onChange,
    onFocus,
    onInput,
    placeholder,
    disabled,
    loading = false,
    inputRef,
    variant = "standalone",
    radius = "xl",
    className = "",
    inputClassName = "",
    "aria-label": ariaLabel,
    "aria-busy": ariaBusy,
}: SearchFieldProps) {
    const radiusClass = radius === "2xl" ? "rounded-2xl" : "rounded-xl";
    const iconClass = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400";

    const inputShared =
        "h-11 min-h-[44px] w-full min-w-0 flex-1 appearance-none bg-transparent pl-10 pr-10 text-[15px] text-gray-800 caret-gray-800 outline-none shadow-none ring-0 placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none disabled:opacity-90 md:text-sm";

    const spinner = loading ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center">
            <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#008fa8]"
                aria-hidden
            />
        </span>
    ) : null;

    if (variant === "inset") {
        return (
            <>
                <SearchIcon className="pointer-events-none h-4 w-4 shrink-0 text-gray-400" />
                <input
                    ref={inputRef}
                    id={id}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={onFocus}
                    onInput={onInput}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    enterKeyHint="search"
                    aria-label={ariaLabel}
                    aria-busy={ariaBusy}
                    className={`${inputShared} !h-9 !min-h-0 !pl-0 !pr-1 md:!h-10 ${inputClassName}`.trim()}
                />
                {loading ? (
                    <span className="pointer-events-none inline-flex shrink-0 items-center" aria-hidden>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#008fa8]" />
                    </span>
                ) : null}
            </>
        );
    }

    return (
        <div
            className={`relative ${radiusClass} border border-black/10 bg-white shadow-sm transition-colors ${BRAND_FOCUS} ${className}`.trim()}
        >
            <SearchIcon className={iconClass} />
            <input
                ref={inputRef}
                id={id}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                onFocus={onFocus}
                onInput={onInput}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
                enterKeyHint="search"
                aria-label={ariaLabel}
                aria-busy={ariaBusy}
                className={`${radiusClass} border-0 bg-white ${inputShared} ${inputClassName}`.trim()}
            />
            {spinner}
        </div>
    );
}
