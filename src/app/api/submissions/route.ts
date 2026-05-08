import { fail, ok } from "@/lib/api-response";
import { createPlaceSubmission } from "@/lib/place-submissions";
import { submissionBody } from "@/lib/schemas/api";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const raw = await req.json();
        const data = submissionBody.parse(raw);

        const submission = await createPlaceSubmission({
            city_slug: data.city_slug,
            category_slug: data.category_slug,
            name: data.name,
            phone: data.phone,
            submitter_name: data.submitter_name,
            submitter_email: data.submitter_email,
            address: data.address || undefined,
            website: data.website || undefined,
            description: data.description || undefined,
            maps_url: data.maps_url || undefined,
            image: data.image || undefined,
        });

        return ok("Place submission received.", { submission });
    } catch (error) {
        if (error instanceof ZodError) {
            return fail(error.issues[0]?.message ?? "Invalid input", 400);
        }
        if (error instanceof SyntaxError) {
            return fail("Invalid JSON body.", 400);
        }
        console.error("POST /api/submissions:", error);
        const message = error instanceof Error ? error.message : String(error);
        return fail(message, 500);
    }
}
