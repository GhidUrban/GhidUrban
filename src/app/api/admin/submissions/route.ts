import { verifyToken } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import {
    approvePlaceSubmissionIntoPlaces,
    type ApprovePlaceSubmissionOverrides,
    getPendingPlaceSubmissions,
    markPlaceSubmissionRejected,
} from "@/lib/place-submissions";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;
        if (!token || verifyToken(token) === null) {
            return fail("Unauthorized", 401);
        }

        const submissions = await getPendingPlaceSubmissions();
        console.log("[GET /api/admin/submissions] pending count:", submissions.length);
        return ok("Propuneri încărcate", {
            count: submissions.length,
            submissions,
        });
    } catch (e) {
        console.error("GET /api/admin/submissions:", e);
        return fail("Nu s-au putut încărca propunerile.", 500);
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
        const id = typeof body.id === "string" ? body.id.trim() : "";
        const action = typeof body.action === "string" ? body.action.trim() : "";
        const admin_note =
            typeof body.admin_note === "string" ? body.admin_note : undefined;

        if (!id) {
            return fail("Lipsește id.", 400);
        }

        let overrides: ApprovePlaceSubmissionOverrides | undefined;
        const rawOverrides = body.overrides;
        if (rawOverrides && typeof rawOverrides === "object" && !Array.isArray(rawOverrides)) {
            const ov = rawOverrides as Record<string, unknown>;
            overrides = {
                name: typeof ov.name === "string" ? ov.name : undefined,
                address: typeof ov.address === "string" ? ov.address : undefined,
                phone: typeof ov.phone === "string" ? ov.phone : undefined,
                website: typeof ov.website === "string" ? ov.website : undefined,
                description: typeof ov.description === "string" ? ov.description : undefined,
            };
        }

        if (action === "approve") {
            const result = await approvePlaceSubmissionIntoPlaces(id, admin_note, overrides);
            if (!result.success) {
                if (result.code === "duplicate") {
                    return fail(result.message, 409, { code: "duplicate_place" });
                }
                if (result.code === "not_found") {
                    return fail(result.message, 404);
                }
                return fail(result.message, 400);
            }
            revalidatePath("/admin");
            revalidatePath("/orase");
            revalidatePath(`/orase/${result.submission.city_slug}`);
            revalidatePath(
                `/orase/${result.submission.city_slug}/${result.submission.category_slug}`,
            );
            revalidatePath(
                `/orase/${result.submission.city_slug}/${result.submission.category_slug}/${result.place_id}`,
            );
            return ok(result.message, {
                submission: result.submission,
                place_id: result.place_id,
            });
        }
        if (action === "reject") {
            const submission = await markPlaceSubmissionRejected(id, admin_note);
            return ok("Propunere respinsă.", { submission });
        }

        return fail("Acțiune invalidă. Folosiți approve sau reject.", 400);
    } catch (e) {
        const message = e instanceof Error ? e.message : "Eroare la actualizare.";
        console.error("PATCH /api/admin/submissions:", e);
        return fail(message, 500);
    }
}
