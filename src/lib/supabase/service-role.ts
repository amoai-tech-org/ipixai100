import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseConfig } from "@/lib/supabase/env";

/**
 * Service-role Supabase client for verified server paths (Cloudinary webhook).
 * Never import from Client Components.
 */
export function createServiceRoleClient() {
  const config = getPublicSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceRoleKey) return null;

  return createClient(config.url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
