"use client";

import { useEffect, useState } from "react";

import type { PlannerAuthState } from "@/lib/auth/copilot-mount";
import {
  claimsFromSupabaseResult,
  getVerifiedOperatorFromClaims,
} from "@/lib/auth/verified-operator";
import { createClient } from "@/lib/supabase/client";

export function usePlannerAuth(): PlannerAuthState {
  const [state, setState] = useState<PlannerAuthState>("loading");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function resolve() {
      const operator = await getVerifiedOperatorFromClaims({
        getClaims: async () =>
          claimsFromSupabaseResult(await supabase.auth.getClaims()),
      });
      if (!cancelled) setState(operator ? "signed-in" : "signed-out");
    }

    void resolve();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void resolve();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
