import { fail, ok } from "@/lib/api-response";
import { createPlaceSubmission } from "@/lib/place-submissions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return fail("Invalid JSON body.", 400);
    }

    if (!body || typeof body !== "object") {
        return fail("Invalid request body.", 400);
    }

    const b = body as Record<string, unknown>;

    const city_slug = typeof b.city_slug === "string" ? b.city_slug.trim() : "";
    if (!city_slug) {
        return fail("Selectează orașul.", 400);
    }

    const category_slug = typeof b.category_slug === "string" ? b.category_slug.trim() : "";
    if (!category_slug) {
        return fail("Selectează categoria.", 400);
    }

    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) {
        return fail("Introdu numele locației.", 400);
    }

    const phone = typeof b.phone === "string" ? b.phone.trim() : "";
    if (!phone) {
        return fail("phone is required", 400);
    }

    const submitter_name = typeof b.submitter_name === "string" ? b.submitter_name.trim() : "";
    if (!submitter_name) {
        return fail("submitter_name is required", 400);
    }

    const submitter_email = typeof b.submitter_email === "string" ? b.submitter_email.trim() : "";
    if (!submitter_email) {
        return fail("submitter_email is required", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter_email)) {
        return fail("submitter_email is invalid", 400);
    }

    console.log("[POST /api/submissions] parsed body:", {
        city_slug,
        category_slug,
        name,
        address: b.address,
        website: b.website,
        phone: b.phone,
        description: b.description,
        maps_url: b.maps_url,
        image: b.image,
        submitter_name: b.submitter_name,
        submitter_email: b.submitter_email,
    });

    const optionalString = (key: string): string | null | undefined => {
        const v = b[key];
        if (v === undefined) {
            return undefined;
        }
        if (v === null) {
            return null;
        }
        if (typeof v === "string") {
            return v;
        }
        return undefined;
    };

    try {
        const submission = await createPlaceSubmission({
            city_slug,
            category_slug,
            name,
            phone,
            submitter_name,
            submitter_email,
            address: optionalString("address"),
            website: optionalString("website"),
            description: optionalString("description"),
            maps_url: optionalString("maps_url"),
            image: optionalString("image"),
        });

        return ok("Place submission received.", { submission });
    } catch (e) {
        console.error("POST /api/submissions:", e);
        const message = e instanceof Error ? e.message : String(e);
        return fail(message, 500);
    }
}
