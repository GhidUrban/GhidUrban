import { fail, ok } from "@/lib/api-response";
import {
    createCityWithStandardCategories,
    getAllCitiesForAdminFromSupabase,
    parseCityCreateCoords,
    updateCityInSupabase,
} from "@/lib/place-repository";
import { revalidatePath } from "next/cache";

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
        if (body.status === "active" || body.status === "hidden") {
            updates.is_active = body.status === "active";
        } else if (body.is_active !== undefined) {
            updates.is_active = Boolean(body.is_active);
        }
        if (body.sort_order !== undefined) {
            updates.sort_order = Number(body.sort_order);
        }
        if (body.latitude !== undefined) {
            if (body.latitude === null || body.latitude === "") {
                updates.latitude = null;
            } else {
                updates.latitude = Number(body.latitude);
            }
        }
        if (body.longitude !== undefined) {
            if (body.longitude === null || body.longitude === "") {
                updates.longitude = null;
            } else {
                updates.longitude = Number(body.longitude);
            }
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
            message === "sort_order trebuie să fie număr întreg." ||
            message.startsWith("latitude trebuie") ||
            message.startsWith("longitude trebuie")
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

        const latRaw = body.latitude;
        const lonRaw = body.longitude;
        const latMissing =
            latRaw === undefined || latRaw === null || latRaw === "";
        const lonMissing =
            lonRaw === undefined || lonRaw === null || lonRaw === "";

        let coordsPayload: { latitude: number; longitude: number } | undefined;
        if (!latMissing && !lonMissing) {
            const parsed = parseCityCreateCoords({
                latitude: Number(latRaw),
                longitude: Number(lonRaw),
            });
            if (!parsed) {
                return fail("Introdu latitude și longitude valide (WGS84).", 400);
            }
            coordsPayload = parsed;
        } else if (latMissing !== lonMissing) {
            return fail("Trimite ambele coordonate (latitude și longitude) sau niciuna.", 400);
        }

        const result = await createCityWithStandardCategories(name, slug, coordsPayload);

        revalidatePath("/orase");
        revalidatePath("/admin");
        revalidatePath("/admin/cities");
        revalidatePath("/admin/categories");

        const apiMessage = result.reused_existing
            ? result.coordinates_updated
                ? "City already existed; coordinates were updated."
                : "City already existed; coordinates were left unchanged."
            : "Oraș creat.";

        return ok(apiMessage, {
            city_slug: result.city_slug,
            categories_created: result.categories_created,
            reused_existing: result.reused_existing,
            coordinates_updated: result.coordinates_updated,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Eroare necunoscută";

        if (
            message === "Lipsește numele orașului." ||
            message.startsWith("Slug invalid") ||
            message === "Lipsește latitude / longitude." ||
            message.startsWith("latitude trebuie") ||
            message.startsWith("longitude trebuie")
        ) {
            return fail(message, 400);
        }

        console.error("POST /api/admin/cities:", error);
        return fail(message, 500);
    }
}
