import { fail, ok } from "@/lib/api-response";
import { loadGlobalSearchIndex } from "@/lib/load-global-search-index";

/** Builds the global search index and returns row counts for debugging. */
export async function GET() {
    try {
        const index = await loadGlobalSearchIndex();
        return ok("Search index ready", {
            cities: index.cities.length,
            categories: index.categories.length,
            places: index.places.length,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Search index load failed";
        console.error("[SearchIndex] prewarm failed:", error);
        return fail(message, 500);
    }
}
