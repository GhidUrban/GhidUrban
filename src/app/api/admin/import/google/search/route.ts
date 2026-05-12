import { NextResponse } from "next/server";

import {
    GOOGLE_IMPORT_SUPPORTED_CATEGORIES,
    isGoogleImportCategory,
} from "@/lib/google-import-categories";
import {
    addGooglePlaceIdVariantsToSet,
    runGoogleImportPreview,
} from "@/lib/google-import";
import { resolveCityCenterCoordinates } from "@/lib/place-repository";
import { normalizePlaceAddressForDedupe } from "@/lib/repositories/place-repository";
import { supabase } from "@/lib/supabase/client";

/** Doar Google Places preview — fără Overpass/OSM ca fallback. */
export async function POST(req: Request) {
    console.log("[import] source = google");
    try {
        const body = await req.json();
        const city_slug =
            typeof body.city_slug === "string" ? body.city_slug.trim() : "";
        const category_slug =
            typeof body.category_slug === "string" ? body.category_slug.trim() : "";

        if (!city_slug || !category_slug) {
            return NextResponse.json(
                { success: false, message: "Missing city_slug or category_slug", data: null },
                { status: 400 },
            );
        }

        if (!isGoogleImportCategory(category_slug)) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Categoria nu este suportată pentru import Google. Folosiți: ${GOOGLE_IMPORT_SUPPORTED_CATEGORIES.join(", ")}.`,
                    data: null,
                },
                { status: 400 },
            );
        }

        const city = await resolveCityCenterCoordinates(city_slug);
        if (!city) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Oraș invalid sau fără coordonate (setează latitude/longitude pentru oraș în admin).",
                    data: null,
                },
                { status: 400 },
            );
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || "";
        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Lipsește GOOGLE_MAPS_API_KEY în mediu.",
                    data: null,
                },
                { status: 500 },
            );
        }

        console.log("[Google import] POST city=", city_slug, "category=", category_slug);

        const { data: placeRows, error: exErr } = await supabase
            .from("places")
            .select("place_id, name, address, latitude, longitude")
            .eq("city_slug", city_slug)
            .eq("category_slug", category_slug);

        if (exErr) {
            console.error("[Google import] Supabase existing:", exErr);
            return NextResponse.json(
                { success: false, message: "Nu s-au putut încărca locurile existente.", data: null },
                { status: 500 },
            );
        }

        const { data: listingRows, error: liErr } = await supabase
            .from("place_listings")
            .select("place_id, external_place_id")
            .eq("city_slug", city_slug)
            .eq("category_slug", category_slug);

        if (liErr) {
            console.error("[Google import] Supabase listings:", liErr);
            return NextResponse.json(
                { success: false, message: "Nu s-au putut încărca listingurile existente.", data: null },
                { status: 500 },
            );
        }

        const extByPid = new Map<string, string | null>();
        for (const lr of listingRows ?? []) {
            const row = lr as { place_id: string; external_place_id: string | null };
            extByPid.set(row.place_id, row.external_place_id ?? null);
        }

        const existing = ((placeRows ?? []) as {
            place_id: string;
            name: string | null;
            address: string | null;
            latitude: number | null;
            longitude: number | null;
        }[]).map((r) => ({
            external_place_id: extByPid.get(r.place_id) ?? null,
            name: r.name,
            address: r.address ?? null,
            latitude: r.latitude,
            longitude: r.longitude,
        }));

        const nameLowerSet = new Set<string>();
        const addressNormSet = new Set<string>();
        for (const r of existing) {
            const n = r.name?.trim().toLowerCase();
            if (n) {
                nameLowerSet.add(n);
            }
            const a = normalizePlaceAddressForDedupe(r.address ?? null);
            if (a) {
                addressNormSet.add(a);
            }
        }

        const importedIds = new Set<string>();
        for (const r of existing) {
            const id = r.external_place_id?.trim();
            if (id) {
                addGooglePlaceIdVariantsToSet(importedIds, id);
            }
        }

        const { data: matchedGoogleRows, error: matchedGErr } = await supabase
            .from("place_google_data")
            .select("google_place_id")
            .eq("city_slug", city_slug)
            .eq("category_slug", category_slug)
            .eq("google_match_status", "matched");

        if (matchedGErr) {
            console.error("[Google import] matched google_place_id query:", matchedGErr);
        } else {
            for (const row of matchedGoogleRows ?? []) {
                const gid = (row as { google_place_id: string | null }).google_place_id?.trim();
                if (gid) {
                    addGooglePlaceIdVariantsToSet(importedIds, gid);
                }
            }
        }

        const { rows, meta } = await runGoogleImportPreview({
            apiKey,
            city_slug,
            category_slug,
            cityCenter: { lat: city.lat, lon: city.lon },
            existing,
            importedIds,
        });

        console.log(
            "[Google import] meta:",
            "raw",
            meta.raw_candidate_count,
            "dedupe",
            meta.after_dedupe,
            "after_loc",
            meta.after_location_filter,
            "after_cat",
            meta.after_category_filters,
            "details",
            meta.details_fetched,
            "preview",
            meta.top_n,
        );

        const items = rows.map((r) => {
            const byName = Boolean(
                r.name?.trim() && nameLowerSet.has(r.name.trim().toLowerCase()),
            );
            const byAddress = Boolean(
                r.address?.trim() &&
                    addressNormSet.has(normalizePlaceAddressForDedupe(r.address)),
            );
            const already_imported = r.already_imported || byName || byAddress;

            return {
                place_id: r.place_id,
                city_slug: r.city_slug,
                category_slug: r.category_slug,
                name: r.name,
                address: r.address ?? "",
                latitude: r.latitude,
                longitude: r.longitude,
                phone: r.phone ?? "",
                website: r.website ?? "",
                schedule: r.schedule ?? "",
                maps_url: r.maps_url ?? "",
                rating: r.rating,
                // Google preview images are temporary and are not persisted (commit uses placeholder only).
                image: r.image ?? "/images/place-placeholder.jpg",
                external_source: r.external_source,
                external_place_id: r.external_place_id,
                completenessScore: r.completenessScore,
                already_imported,
                likely_duplicate: r.likely_duplicate,
            };
        });

        return NextResponse.json({
            success: true,
            message: "Preview Google",
            data: { items, meta },
        });
    } catch (e) {
        console.error("[Google import] route error:", e);
        return NextResponse.json(
            { success: false, message: "Google import preview failed", data: null },
            { status: 500 },
        );
    }
}
