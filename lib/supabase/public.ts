import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cookie-less anonymous client for public catalog reads (cacheable). Never sees admin data. */
export function publicDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
