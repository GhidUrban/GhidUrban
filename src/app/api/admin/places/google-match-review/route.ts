import { verifyToken } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import {
    applyGoogleMatchReviewDecision,
    getGoogleMatchReviewFilterSlugsFromSupabase,
    getPlacesForGoogleMatchReviewFromSupabase,
    type GoogleMatchReviewAction,
    type GoogleMatchReviewListFilters,
} from "@/lib/place-repository";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

function isGoogleMatchReviewAction(v: string): v is GoogleMatchReviewAction {
    return v === "matched" || v === "clear_match";
}

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;
        if (!token || verifyToken(token) === null) {
            return fail("Unauthorized", 401);
        }

        const { searchParams } = new URL(request.url);
        const searchRaw = searchParams.get("search");
        const cityRaw = searchParams.get("city_slug");
        const categoryRaw = searchParams.get("category_slug");

        const filters: GoogleMatchReviewListFilters = {};
        if (typeof searchRaw === "string" && searchRaw.trim()) {
            filters.search = searchRaw.trim();
        }
        if (typeof cityRaw === "string" && cityRaw.trim()) {
            filters.city_slug = cityRaw.trim();
        }
        if (typeof categoryRaw === "string" && categoryRaw.trim()) {
            filters.category_slug = categoryRaw.trim();
        }

        const hasFilters = Object.keys(filters).length > 0;

        const [places, slugLists] = await Promise.all([
            getPlacesForGoogleMatchReviewFromSupabase(hasFilters ? filters : undefined),
            getGoogleMatchReviewFilterSlugsFromSupabase(),
        ]);

        return ok("Locuri Google în review încărcate.", {
            count: places.length,
            places,
            city_slugs: slugLists.city_slugs,
            category_slugs: slugLists.category_slugs,
        });
    } catch (e) {
        console.error("GET /api/admin/places/google-match-review:", e);
        return fail("Nu s-au putut încărca locurile.", 500);
    }
}

export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;
        if (!token || verifyToken(token) === null) {
            return fail("Unauthorized", 401);
        }

        const body = await req.json();
        const place_id = typeof body.place_id === "string" ? body.place_id.trim() : "";
        const city_slug = typeof body.city_slug === "string" ? body.city_slug.trim() : "";
        const category_slug = typeof body.category_slug === "string" ? body.category_slug.trim() : "";
        const actionRaw = typeof body.action === "string" ? body.action.trim() : "";

        if (!place_id || !city_slug || !category_slug) {
            return fail("Lipsesc place_id, city_slug sau category_slug.", 400);
        }
        if (!isGoogleMatchReviewAction(actionRaw)) {
            return fail("Acțiune invalidă. Folosiți matched sau clear_match.", 400);
        }

        try {
            await applyGoogleMatchReviewDecision(place_id, city_slug, category_slug, actionRaw);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg.startsWith("CONFLICT:")) {
                return fail(msg.replace(/^CONFLICT:\s*/u, "").trim(), 409, {
                    code: "google_place_conflict",
                });
            }
            throw e;
        }

        revalidatePath("/admin");
        revalidatePath("/admin/google-match-review");
        revalidatePath("/orase");
        revalidatePath(`/orase/${city_slug}`);
        revalidatePath(`/orase/${city_slug}/${category_slug}`);
        revalidatePath(`/orase/${city_slug}/${category_slug}/${place_id}`);

        const message =
            actionRaw === "matched"
                ? "Marcat ca matched."
                : "Datele Google au fost golite; rămâne în review.";
        return ok(message, { place_id, city_slug, category_slug, action: actionRaw });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Eroare la actualizare.";
        console.error("PATCH /api/admin/places/google-match-review:", e);
        return fail(message, 500);
    }
}
