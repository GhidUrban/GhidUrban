import { loadGlobalSearchIndex } from "@/lib/load-global-search-index";

/** Triggers server-side index build so `/cauta` can reuse the module cache. */
export async function GET() {
    await loadGlobalSearchIndex();
    return new Response(null, { status: 204 });
}
