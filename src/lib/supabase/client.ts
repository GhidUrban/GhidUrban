import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy ghidurban/.env.example to ghidurban/.env.local and restart dev.",
  );
}

try {
  new URL(supabaseUrl);
} catch {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid https URL (check .env.local).");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
