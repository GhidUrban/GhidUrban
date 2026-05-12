import { verifyToken } from "@/lib/auth";
import { uploadGooglePhotosForPlace } from "@/lib/google-place-photos-storage";
import {
    textSearchPlacesForCity,
    pickBestSearchCandidateForCity,
} from "@/lib/google-maps-place-autofill";
import { RO_MAJOR_CITIES } from "@/lib/ro-major-cities";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function cityCenter(slug: string): { lat: number; lon: number } | null {
    const c = RO_MAJOR_CITIES.find((r) => r.slug === slug);
    if (!c) return null;
    return { lat: c.latitude, lon: c.longitude };
}

export async function POST(request: Request) {
    const jar = await cookies();
    const token = jar.get("admin_token")?.value;
    if (!token || !verifyToken(token)) {
        return NextResponse.json(
            { success: false, message: "Neautorizat." },
            { status: 401 },
        );
    }

    const body = await request.json().catch(() => ({}));
    const cityFilter = typeof body.city_slug === "string" ? body.city_slug.trim() : null;
    const maxPhotos = typeof body.max_photos === "number" ? Math.min(body.max_photos, 3) : 1;

    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) {
        return NextResponse.json(
            { success: false, message: "GOOGLE_MAPS_API_KEY lipseste din env." },
            { status: 500 },
        );
    }

    const sb = getSupabaseAdmin();

    let placesQuery = sb
        .from("places")
        .select("place_id, city_slug, category_slug, name")
        .eq("status", "available")
        .is("image_storage_path", null);
    if (cityFilter) {
        placesQuery = placesQuery.eq("city_slug", cityFilter);
    }
    const { data: placesData, error: placesErr } = await placesQuery;
    if (placesErr) {
        return NextResponse.json(
            { success: false, message: `Eroare la citirea locurilor: ${placesErr.message}` },
            { status: 500 },
        );
    }
    const places = (placesData ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string; name: string;
    }>;

    if (places.length === 0) {
        return NextResponse.json({
            success: true,
            message: "Toate locurile au deja poze salvate.",
            data: { total: 0, fixed: 0, failed: 0, skipped: 0, auto_matched: 0 },
        });
    }

    let googleQuery = sb
        .from("place_google_data")
        .select("place_id, city_slug, category_slug, external_place_id")
        .not("external_place_id", "is", null);
    if (cityFilter) {
        googleQuery = googleQuery.eq("city_slug", cityFilter);
    }
    const { data: googleData } = await googleQuery;
    const googleMap = new Map<string, string>();
    for (const row of (googleData ?? []) as Array<{
        place_id: string; city_slug: string; category_slug: string; external_place_id: string;
    }>) {
        googleMap.set(`${row.place_id}\0${row.city_slug}\0${row.category_slug}`, row.external_place_id);
    }

    let fixed = 0;
    let failed = 0;
    let skipped = 0;
    let autoMatched = 0;

    for (const p of places) {
        const key = `${p.place_id}\0${p.city_slug}\0${p.category_slug}`;
        let extId = googleMap.get(key);

        if (!extId) {
            const center = cityCenter(p.city_slug);
            if (!center) {
                skipped++;
                continue;
            }
            try {
                const query = `${p.name} ${p.city_slug.replace(/-/g, " ")}`;
                const candidates = await textSearchPlacesForCity(apiKey, query, center);
                const picked = pickBestSearchCandidateForCity(candidates, p.city_slug, center);
                if (!picked) {
                    skipped++;
                    continue;
                }
                extId = picked.resource.replace(/^places\//, "");

                await sb.from("place_google_data").upsert({
                    place_id: p.place_id,
                    city_slug: p.city_slug,
                    category_slug: p.category_slug,
                    external_place_id: extId,
                    google_match_status: "matched",
                }, { onConflict: "place_id,city_slug,category_slug" });

                autoMatched++;
            } catch {
                skipped++;
                continue;
            }
        }

        try {
            const res = await uploadGooglePhotosForPlace(sb, {
                apiKey,
                city_slug: p.city_slug,
                category_slug: p.category_slug,
                place_id: p.place_id,
                external_place_id: extId,
                maxPhotos,
                photoDelayMs: 200,
            });
            if (res.count > 0) {
                fixed++;
            } else {
                failed++;
            }
        } catch {
            failed++;
        }
    }

    const msg = `Reparat ${fixed} locuri (${autoMatched} auto-matched). Eșuat: ${failed}. Fără match: ${skipped}. Total: ${places.length}.`;
    return NextResponse.json({
        success: true,
        message: msg,
        data: { total: places.length, fixed, failed, skipped, auto_matched: autoMatched },
    });
}
