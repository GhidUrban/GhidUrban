import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";

import { PLACE_IMAGE_PLACEHOLDER } from "@/lib/place-image";
import {
    createPlaceInSupabase,
    placeDuplicateByNormalizedAddressInCategory,
    placeDuplicateBySimilarNameAndAddressInCategory,
    placeIdExistsInCategory,
} from "@/lib/place-repository";
import { placeIdSlugFromName } from "@/lib/slug";

/**
 * Submissions must use the service role on the server: anon cannot reliably insert/select
 * under RLS, and insert().select().single() needs permission to read the new row.
 */
export function getSupabaseAdminClientForSubmissions(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceKey) {
        throw new Error(
            "Lipsește NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY în mediu (necesar pentru place_submissions).",
        );
    }
    return createClient(url, serviceKey);
}

export function normalizeSubmissionText(value: string | null | undefined): string {
    if (value == null) {
        return "";
    }
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

export type PlaceSubmissionStatus = "pending" | "approved" | "rejected";

export type PlaceSubmissionRow = {
    id: string;
    city_slug: string;
    category_slug: string;
    name: string;
    address: string | null;
    website: string | null;
    phone: string;
    description: string | null;
    maps_url: string | null;
    image: string | null;
    submitter_name: string;
    submitter_email: string;
    status: PlaceSubmissionStatus;
    admin_note: string | null;
    approved_place_id: string | null;
    reviewed_at: string | null;
    created_at: string;
};

export type PlaceSubmissionInsertInput = {
    city_slug: string;
    category_slug: string;
    name: string;
    phone: string;
    submitter_name: string;
    submitter_email: string;
    address?: string | null;
    website?: string | null;
    description?: string | null;
    maps_url?: string | null;
    image?: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
    if (value == null) {
        return null;
    }
    const t = String(value).trim();
    return t === "" ? null : t;
}

function submissionInsertErrorMessage(error: PostgrestError): string {
    const code = error.code ?? "";
    const msg = error.message ?? "";
    if (code === "42P01" || /does not exist|relation/i.test(msg)) {
        return "Baza de date nu are tabelul place_submissions. Rulează migrările Supabase.";
    }
    if (code === "42501" || /permission denied/i.test(msg)) {
        return "Nu s-au putut salva datele (permisiuni). Verifică SUPABASE_SERVICE_ROLE_KEY pe server.";
    }
    if (code === "23514") {
        return "Date respinse de validarea bazei de date.";
    }
    return "Nu s-a putut salva propunerea. Încearcă din nou sau contactează suportul.";
}

export async function createPlaceSubmission(
    input: PlaceSubmissionInsertInput,
): Promise<PlaceSubmissionRow> {
    const city_slug = input.city_slug?.trim() ?? "";
    const category_slug = input.category_slug?.trim() ?? "";
    const name = input.name?.trim() ?? "";
    const phone = input.phone?.trim() ?? "";
    const submitter_name = input.submitter_name?.trim() ?? "";
    const submitter_email = input.submitter_email?.trim() ?? "";
    if (!city_slug || !category_slug || !name) {
        throw new Error("city_slug, category_slug și name sunt obligatorii.");
    }
    if (!submitter_name) {
        throw new Error("submitter_name is required");
    }
    if (!submitter_email) {
        throw new Error("submitter_email is required");
    }
    if (!phone) {
        throw new Error("phone is required");
    }

    const db = getSupabaseAdminClientForSubmissions();
    const payload = {
        city_slug,
        category_slug,
        name,
        phone,
        submitter_name,
        submitter_email,
        address: trimOrNull(input.address),
        website: trimOrNull(input.website),
        description: trimOrNull(input.description),
        maps_url: trimOrNull(input.maps_url),
        image: trimOrNull(input.image),
    };

    const { data, error } = await db.from("place_submissions").insert([payload]).select().single();

    if (error) {
        console.error("[createPlaceSubmission] Supabase insert failed:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
        });
        const userMsg = submissionInsertErrorMessage(error);
        throw new Error(userMsg);
    }

    return data as PlaceSubmissionRow;
}

export async function getPendingPlaceSubmissions(): Promise<PlaceSubmissionRow[]> {
    const db = getSupabaseAdminClientForSubmissions();
    const { data, error } = await db
        .from("place_submissions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getPendingPlaceSubmissions] Supabase query error:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
        });
        throw new Error("Nu s-au putut încărca propunerile.");
    }

    const rows = (data ?? []) as PlaceSubmissionRow[];
    console.log("[getPendingPlaceSubmissions] rows:", rows.length);
    return rows;
}

export async function getPlaceSubmissionById(id: string): Promise<PlaceSubmissionRow | null> {
    const trimmed = id?.trim();
    if (!trimmed) {
        return null;
    }
    const db = getSupabaseAdminClientForSubmissions();
    const { data, error } = await db
        .from("place_submissions")
        .select("*")
        .eq("id", trimmed)
        .maybeSingle();

    if (error) {
        console.error("getPlaceSubmissionById:", error);
        throw new Error("Nu s-a putut încărca propunerea.");
    }

    return data as PlaceSubmissionRow | null;
}

export async function markPlaceSubmissionApproved(
    id: string,
    adminNote?: string,
    approvedPlaceId?: string,
): Promise<PlaceSubmissionRow> {
    return updateSubmissionStatus(id, "approved", adminNote, approvedPlaceId);
}

export async function markPlaceSubmissionRejected(
    id: string,
    adminNote?: string,
): Promise<PlaceSubmissionRow> {
    return updateSubmissionStatus(id, "rejected", adminNote, undefined);
}

export type ApprovePlaceSubmissionIntoPlacesResult =
    | {
          success: true;
          place_id: string;
          submission: PlaceSubmissionRow;
          message: string;
      }
    | {
          success: false;
          code:
              | "not_found"
              | "not_pending"
              | "duplicate"
              | "invalid_place_id"
              | "invalid_submission";
          message: string;
      };

export type ApprovePlaceSubmissionOverrides = {
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
    description?: string;
};

export async function approvePlaceSubmissionIntoPlaces(
    submissionId: string,
    adminNote?: string,
    overrides?: ApprovePlaceSubmissionOverrides,
): Promise<ApprovePlaceSubmissionIntoPlacesResult> {
    const sub = await getPlaceSubmissionById(submissionId);
    if (!sub) {
        return {
            success: false,
            code: "not_found",
            message: "Propunerea nu există.",
        };
    }
    if (sub.status !== "pending") {
        return {
            success: false,
            code: "not_pending",
            message: "Propunerea nu mai este în așteptare.",
        };
    }

    const city_slug = sub.city_slug.trim();
    const category_slug = sub.category_slug.trim();
    const o = overrides;
    const name = o?.name !== undefined ? String(o.name).trim() : sub.name.trim();
    const addressForChecks =
        o?.address !== undefined ? String(o.address).trim() : (sub.address ?? "").trim();
    const phone = o?.phone !== undefined ? String(o.phone).trim() : sub.phone.trim();
    const websiteFinal =
        o?.website !== undefined ? String(o.website).trim() : (sub.website ?? "").trim();
    const descriptionFinal =
        o?.description !== undefined
            ? String(o.description).trim()
            : (sub.description ?? "").trim();

    if (!city_slug) {
        return {
            success: false,
            code: "invalid_submission",
            message: "city_slug is required",
        };
    }
    if (!category_slug) {
        return {
            success: false,
            code: "invalid_submission",
            message: "category_slug is required",
        };
    }
    if (!name) {
        return {
            success: false,
            code: "invalid_submission",
            message: "name is required",
        };
    }
    if (!phone) {
        return {
            success: false,
            code: "invalid_submission",
            message: "phone is required",
        };
    }

    const place_id = placeIdSlugFromName(name);
    if (!place_id) {
        return {
            success: false,
            code: "invalid_place_id",
            message: "Numele nu permite generarea unui id de loc valid.",
        };
    }

    if (await placeIdExistsInCategory(place_id, city_slug, category_slug)) {
        console.log("[submission approve] duplicate place found");
        return {
            success: false,
            code: "duplicate",
            message:
                "Există deja un loc cu același id în acest oraș și categorie. Nu s-a inserat nimic.",
        };
    }

    if (
        await placeDuplicateBySimilarNameAndAddressInCategory(
            name,
            addressForChecks,
            city_slug,
            category_slug,
        )
    ) {
        console.log("[submission approve] duplicate place found");
        return {
            success: false,
            code: "duplicate",
            message:
                "Există deja un loc similar (nume + adresă) în această categorie. Nu s-a inserat nimic.",
        };
    }

    if (
        await placeDuplicateByNormalizedAddressInCategory(
            addressForChecks,
            city_slug,
            category_slug,
        )
    ) {
        console.log("[submission approve] duplicate place found");
        return {
            success: false,
            code: "duplicate",
            message:
                "Există deja un loc cu aceeași adresă în această categorie. Nu s-a inserat nimic.",
        };
    }

    const image = trimOrNull(sub.image) ?? PLACE_IMAGE_PLACEHOLDER;

    await createPlaceInSupabase({
        place_id,
        city_slug,
        category_slug,
        name,
        description: trimOrNull(descriptionFinal),
        address: trimOrNull(addressForChecks),
        schedule: null,
        image,
        rating: null,
        phone,
        website: trimOrNull(websiteFinal),
        maps_url: trimOrNull(sub.maps_url),
        status: "available",
        featured: false,
        featured_until: null,
        plan_type: "free",
        plan_expires_at: null,
    });

    console.log("[submission approve] inserted into places");

    const submission = await markPlaceSubmissionApproved(submissionId, adminNote, place_id);
    console.log("[submission approve] marked approved");

    return {
        success: true,
        place_id,
        submission,
        message: "Locul a fost adăugat și propunerea marcată aprobată.",
    };
}

async function updateSubmissionStatus(
    id: string,
    status: "approved" | "rejected",
    adminNote?: string,
    approvedPlaceId?: string,
): Promise<PlaceSubmissionRow> {
    const trimmed = id?.trim();
    if (!trimmed) {
        throw new Error("Lipsește id-ul propunerii.");
    }

    const patch: Record<string, string | null> = {
        status,
        reviewed_at: new Date().toISOString(),
    };
    if (adminNote !== undefined) {
        const n = adminNote.trim();
        patch.admin_note = n === "" ? null : n;
    }
    if (status === "approved" && approvedPlaceId !== undefined) {
        const p = approvedPlaceId.trim();
        if (p !== "") {
            patch.approved_place_id = p;
        }
    }

    const db = getSupabaseAdminClientForSubmissions();
    const { data, error } = await db
        .from("place_submissions")
        .update(patch)
        .eq("id", trimmed)
        .select()
        .single();

    if (error) {
        console.error("updateSubmissionStatus:", error);
        throw new Error("Nu s-a putut actualiza propunerea.");
    }

    return data as PlaceSubmissionRow;
}
