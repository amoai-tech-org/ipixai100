import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getVerifiedOperatorFromCookies } from "@/lib/auth/copilot-hooks";
import { postAuthDestinationFor, safeRedirect } from "@/lib/auth/post-auth-destination";
import { listMembershipOrgIdsFromServerClient } from "@/lib/auth/runtime-org";
import { createClient } from "@/lib/supabase/server";

import LoginFormLazy from "@/app/(marketing)/login/login-form-lazy";

export const metadata: Metadata = {
  title: "Sign in — iPix",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const operator = await getVerifiedOperatorFromCookies();
  if (operator) {
    const supabase = await createClient();
    if (supabase) {
      const destination = await postAuthDestinationFor({
        operator,
        listOrgIds: () =>
          listMembershipOrgIdsFromServerClient(supabase, operator.id),
      });
      // Fail-closed lookup returns /login — render the form instead of looping.
      if (destination !== "/login") {
        redirect(destination);
      }
    }
    // supabase null (env missing) → render the form; unknown tenant state
    // never grants access and never redirects into a /planner loop.
  }
  const { next } = await searchParams;
  // Repeated `next` keys arrive as an array — normalize to the first value
  // (or reject) so safeRedirect never receives a non-string.
  const nextValue = Array.isArray(next) ? next[0] : next;
  return <LoginFormLazy next={safeRedirect(nextValue)} />;
}