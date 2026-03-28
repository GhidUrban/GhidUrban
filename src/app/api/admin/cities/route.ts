import { fail, ok } from "@/lib/api-response";
import {
    createCityWithStandardCategories,
    getAllCitiesForAdminFromSupabase,
    updateCityInSupabase,
} from "@/lib/place-repository";
import { supabase } from "@/lib/supabase/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = (searchParams.get("slug") ?? "").trim();
        if (!slug) {
            return fail("Lipsește parametrul slug.", 400);
        }

        const { data: cityRows, error: cityLookupErr } = await supabase
            .from("cities")
            .select("slug")
            .eq("slug", slug)
            .limit(1);

        if (cityLookupErr) {
            console.error("DELETE /api/admin/cities city lookup:", cityLookupErr);
            return fail("Nu s-a putut verifica orașul.", 500);
        }

        if (!cityRows?.length) {
            return fail("Orașul nu există.", 404);
        }

        const { data: placeRows, error: placesErr } = await supabase
            .from("places")
            .select("place_id")
            .eq("city_slug", slug)
            .limit(1);

        if (placesErr) {
            console.error("DELETE /api/admin/cities places check:", placesErr);
            return fail("Nu s-a putut verifica locațiile.", 500);
        }

        if ((placeRows?.length ?? 0) > 0) {
            return fail("Nu poți șterge orașul cât timp există locații asociate.", 400);
        }

        const { error: delCatsErr } = await supabase
            .from("categories")
            .delete()
            .eq("city_slug", slug);

        if (delCatsErr) {
            console.error("DELETE /api/admin/cities categories:", delCatsErr);
            return fail("Nu s-au putut șterge categoriile.", 500);
        }

        const { error: delCityErr } = await supabase.from("cities").delete().eq("slug", slug);

        if (delCityErr) {
            console.error("DELETE /api/admin/cities city:", delCityErr);
            return fail("Nu s-a putut șterge orașul.", 500);
        }

        revalidatePath("/orase");
        revalidatePath("/admin");
        revalidatePath("/admin/cities");
        revalidatePath("/admin/categories");

        return NextResponse.json({
            success: true,
            message: "Orașul a fost șters.",
        });
    } catch (error) {
        console.error("DELETE /api/admin/cities:", error);
        return fail("Eroare la ștergerea orașului.", 500);
    }
}

export async function GET() {
    try {
        const cities = await getAllCitiesForAdminFromSupabase();
        return ok("Orașe încărcate", { count: cities.length, cities });
    } catch (error) {
        console.error("GET /api/admin/cities:", error);
        return fail("Nu s-au putut încărca orașele.", 500);
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const city_slug = typeof body.city_slug === "string" ? body.city_slug.trim() : "";
        if (!city_slug) {
            return fail("Lipsește city_slug.", 400);
        }

        const updates: Parameters<typeof updateCityInSupabase>[1] = {};
        if (body.name !== undefined) {
            updates.name = typeof body.name === "string" ? body.name : "";
        }
        if (body.slug !== undefined) {
            updates.slug = typeof body.slug === "string" ? body.slug : "";
        }
        if (body.image !== undefined) {
            updates.image =
                body.image === null || body.image === ""
                    ? null
                    : typeof body.image === "string"
                      ? body.image
                      : null;
        }
        if (body.is_active !== undefined) {
            updates.is_active = Boolean(body.is_active);
        }
        if (body.sort_order !== undefined) {
            updates.sort_order = Number(body.sort_order);
        }

        const result = await updateCityInSupabase(city_slug, updates);

        revalidatePath("/orase");
        revalidatePath("/admin");
        revalidatePath("/admin/cities");
        revalidatePath("/admin/categories");

        return ok("Oraș actualizat", { city_slug: result.slug });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Eroare necunoscută";

        if (message === "Există deja un oraș cu acest slug.") {
            return fail(message, 409);
        }

        if (
            message.startsWith("Slug invalid") ||
            message === "Lipsește slug-ul orașului." ||
            message === "Numele orașului nu poate fi gol." ||
            message === "sort_order trebuie să fie număr întreg."
        ) {
            return fail(message, 400);
        }

        console.error("PATCH /api/admin/cities:", error);
        return fail(message, 500);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const name = typeof body.name === "string" ? body.name : "";
        const slug =
            body.slug === undefined || body.slug === null
                ? undefined
                : typeof body.slug === "string"
                  ? body.slug
                  : undefined;

        const result = await createCityWithStandardCategories(name, slug);

        revalidatePath("/orase");
        revalidatePath("/admin");
        revalidatePath("/admin/cities");
        revalidatePath("/admin/categories");

        return ok("Oraș creat", {
            city_slug: result.city_slug,
            categories_created: result.categories_created,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Eroare necunoscută";

        if (message === "Există deja un oraș cu acest slug.") {
            return fail(message, 409);
        }

        if (
            message === "Lipsește numele orașului." ||
            message.startsWith("Slug invalid")
        ) {
            return fail(message, 400);
        }

        console.error("POST /api/admin/cities:", error);
        return fail(message, 500);
    }
}
