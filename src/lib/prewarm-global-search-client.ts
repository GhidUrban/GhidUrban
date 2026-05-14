let requested = false;

/** Prewarm server search index; fetch-only — do not import DB code here. */
export function prewarmGlobalSearchIndex(): void {
    if (typeof window === "undefined") {
        return;
    }
    if (requested) return;
    requested = true;
    void fetch("/api/global-search-index/prewarm", { method: "GET" }).catch(() => {});
}
