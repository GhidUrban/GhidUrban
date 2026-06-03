/**
 * Legacy/reference helper for Supabase URL + service role.
 * New image uploads use Cloudflare R2 (see src/lib/r2/upload-place-photo-to-r2.ts).
 * Not used by admin upload or Google photo import anymore.
 */
// Dynamic env lookup so the value is not stripped/inlined at build time (Next/Webpack).
export function getSupabaseStorageEnv(): { url: string; serviceRoleKey: string } {
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]?.trim() ?? "";
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim() ?? "";
    return { url, serviceRoleKey };
}
