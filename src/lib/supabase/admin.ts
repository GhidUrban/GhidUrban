import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** RLS bypass — doar pe server (routes, cron). NU importa în client components. */
export function getSupabaseAdmin(): SupabaseClient {
    if (cached) {
        return cached;
    }
    const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
        process.env.SUPABASE_URL?.trim() ||
        "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
    if (!url || !key) {
        throw new Error(
            "Lipsește SUPABASE_SERVICE_ROLE_KEY sau URL Supabase pentru operații admin în DB.",
        );
    }
    cached = createClient(url, key);
    return cached;
}
