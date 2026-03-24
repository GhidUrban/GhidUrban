import { fail, ok } from "@/lib/api-response";
import {
    getCategoriesForAdminByCityFromSupabase,
    updateCategoryInSupabase,
} from "@/lib/place-repository";
import { revalidatePath } from "next/cache";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const city_slug = (searchParams.get("city_slug") ?? "").trim();
        if (!city_slug) {
            return fail("Lipsește city_slug în query.", 400);
        }

        const categories = await getCategoriesForAdminByCityFromSupabase(city_slug);
        return ok("Categorii încărcate", {
            city_slug,
            count: categories.length,
            categories,
        });
    } catch (error) {
        console.error("GET /api/admin/categories:", error);
        return fail("Nu s-au putut încărca categoriile.", 500);
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const city_slug = typeof body.city_slug === "string" ? body.city_slug.trim() : "";
        const category_slug =
            typeof body.category_slug === "string" ? body.category_slug.trim() : "";
        if (!city_slug || !category_slug) {
            return fail("Lipsește city_slug sau category_slug.", 400);
        }

        const updates: Parameters<typeof updateCategoryInSupabase>[2] = {};
        if (body.category_name !== undefined) {
            updates.category_name =
                typeof body.category_name === "string" ? body.category_name : "";
        }
        if (body.category_slug_new !== undefined) {
            updates.category_slug_new =
                typeof body.category_slug_new === "string" ? body.category_slug_new : "";
        }
        if (body.image !== undefined) {
            updates.image =
                body.image === null || body.image === ""
                    ? null
                    : typeof body.image === "string"
                      ? body.image
                      : null;
        }
        if (body.icon !== undefined) {
            updates.icon =
                body.icon === null || body.icon === ""
                    ? null
                    : typeof body.icon === "string"
                      ? body.icon
                      : null;
        }
        if (body.is_active !== undefined) {
            updates.is_active = Boolean(body.is_active);
        }
        if (body.sort_order !== undefined) {
            updates.sort_order = Number(body.sort_order);
        }

        const result = await updateCategoryInSupabase(city_slug, category_slug, updates);

        revalidatePath("/orase");
        revalidatePath("/admin");
        revalidatePath("/admin/categories");

        return ok("Categorie actualizată", {
            city_slug,
            category_slug: result.category_slug,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Eroare necunoscută";

        if (message === "Există deja o categorie cu acest slug în acest oraș.") {
            return fail(message, 409);
        }

        if (
            message.startsWith("Slug categorie invalid") ||
            message === "Lipsește orașul sau categoria." ||
            message === "Numele categoriei nu poate fi gol." ||
            message === "sort_order trebuie să fie număr întreg."
        ) {
            return fail(message, 400);
        }

        console.error("PATCH /api/admin/categories:", error);
        return fail(message, 500);
    }
}
