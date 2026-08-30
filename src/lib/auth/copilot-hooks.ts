import type { CopilotRuntimeHooks } from "@copilotkit/runtime/v2";

import { unauthorizedResponse } from "./unauthorized";
import {
  claimsFromSupabaseResult,
  getVerifiedOperatorFromClaims,
} from "./verified-operator";
import { createClient, createClientFromRequest } from "@/lib/supabase/server";

export async function getVerifiedOperatorForRequest(request: Request) {
  const supabase = createClientFromRequest(request);
  if (!supabase) return null;
  return getVerifiedOperatorFromClaims({
    request,
    getClaims: async () =>
      claimsFromSupabaseResult(await supabase.auth.getClaims()),
  });
}

export async function getVerifiedOperatorFromCookies() {
  const supabase = await createClient();
  if (!supabase) return null;
  return getVerifiedOperatorFromClaims({
    getClaims: async () =>
      claimsFromSupabaseResult(await supabase.auth.getClaims()),
  });
}

export async function identifyOperator(request: Request) {
  const operator = await getVerifiedOperatorForRequest(request);
  if (!operator) throw unauthorizedResponse();
  return operator;
}

export const copilotAuthHooks: CopilotRuntimeHooks = {
  onRequest: async ({ request }) => {
    const operator = await getVerifiedOperatorForRequest(request);
    if (!operator) throw unauthorizedResponse();
  },
};
