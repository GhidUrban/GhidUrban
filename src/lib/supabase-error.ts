import type { PostgrestError } from "@supabase/supabase-js";

export function formatSupabaseWriteError(operation: string, err: PostgrestError): string {
    return `${operation} [${err.code ?? "unknown"}]: ${err.message}`;
}

function extractPgCode(msg: string): string | undefined {
    const m = msg.match(/\[(\d{5})\]/);
    return m?.[1];
}

/** Răspuns JSON pentru Import commit când Postgres returnează erori cunoscute. */
export function importCommitFriendlyError(rawMessage: string): {
    http_status: number;
    message: string;
    data: { code: string | null; detail: string };
} {
    const code = extractPgCode(rawMessage) ?? null;
    const lower = rawMessage.toLowerCase();

    if (
        code === "23503" ||
        (lower.includes("foreign key") &&
            (lower.includes("categories") || lower.includes("city_slug") || lower.includes("category_slug")))
    ) {
        return {
            http_status: 400,
            message:
                "Categoria nu există pentru orașul selectat. Adaugă mai întâi categoria pentru acest oraș în zona de administrare.",
            data: { code: code ?? "23503", detail: rawMessage },
        };
    }

    if (code === "23505" || lower.includes("unique constraint") || lower.includes("duplicate key")) {
        return {
            http_status: 409,
            message:
                "Înregistrare duplicată în baza de date (de exemplu același Google Place ID în aceeași categorie sau același identificator de loc).",
            data: { code: code ?? "23505", detail: rawMessage },
        };
    }

    return {
        http_status: 500,
        message: rawMessage || "Importul nu a putut fi finalizat.",
        data: { code, detail: rawMessage },
    };
}
