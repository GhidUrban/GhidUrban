import { verifyToken } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { getGoogleImportCoverageHintsFromSupabase } from "@/lib/place-repository";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;
        if (!token || verifyToken(token) === null) {
            return fail("Unauthorized", 401);
        }

        const rows = await getGoogleImportCoverageHintsFromSupabase();
        return ok("Acoperire Google import.", { rows });
    } catch (e) {
        console.error("GET /api/admin/import/google-coverage:", e);
        return fail("Nu s-a putut încărca acoperirea.", 500);
    }
}
