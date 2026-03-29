import { verifyToken } from "@/lib/auth";
import { fail, ok } from "@/lib/api-response";
import { fetchPlaceAutofillFromMapsUrl } from "@/lib/google-maps-place-autofill";
import { resolveCityCenterCoordinates } from "@/lib/place-repository";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_token")?.value;
        if (!token || verifyToken(token) === null) {
            return fail("Unauthorized", 401, {});
        }

        const body = await req.json();
        const maps_url = typeof body.maps_url === "string" ? body.maps_url.trim() : "";
        if (!maps_url) {
            return fail("Lipsește maps_url.", 400, {});
        }

        const city_slug = typeof body.city_slug === "string" ? body.city_slug.trim() : "";
        if (!city_slug) {
            return fail("Lipsește city_slug.", 400, {});
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || "";
        if (!apiKey) {
            return fail("Lipsește GOOGLE_MAPS_API_KEY în mediu.", 500, {});
        }

        const cityCenter = await resolveCityCenterCoordinates(city_slug);
        if (!cityCenter) {
            return fail(
                "Orașul nu are coordonate (setează latitude/longitude la /admin/cities).",
                422,
                {},
            );
        }

        const result = await fetchPlaceAutofillFromMapsUrl(
            apiKey,
            maps_url,
            city_slug,
            cityCenter,
        );
        if (!result.ok) {
            return fail(result.message, 422, {});
        }

        return ok("Date încărcate din Google Maps.", result.data);
    } catch (e) {
        console.error("POST /api/admin/places/autofill-from-maps:", e);
        return fail("Eroare la completarea automată.", 500, {});
    }
}
