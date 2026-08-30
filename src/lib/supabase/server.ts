import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicSupabaseConfig } from "@/lib/supabase/env";

export async function createClient() {
  const config = getPublicSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component; proxy.ts writes refreshed cookies.
        }
      },
    },
  });
}

export function createClientFromRequest(request: Request) {
  const config = getPublicSupabaseConfig();
  if (!config) return null;

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("cookie") ?? "");
      },
      setAll() {
        // Session refresh is owned by src/proxy.ts.
      },
    },
  });
}
