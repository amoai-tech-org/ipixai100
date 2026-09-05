import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getVerifiedOperatorFromCookies } from "@/lib/auth/copilot-hooks";
import { postAuthDestinationFor, safeRedirect } from "@/lib/auth/post-auth-destination";
import { listMembershipOrgIdsFromServerClient } from "@/lib/auth/runtime-org";
import { createClient } from "@/lib/supabase/server";

import SignupFormLazy from "@/app/(marketing)/signup/signup-form-lazy";

export const metadata: Metadata = {
  title: "Sign up — iPix",
  robots: { index: false, follow: false },
};

// IPI-1157 · AUTH-UX-001 — /signup is a distinct route from /login (was a
// client-side mode switch on /login). Mirrors login/page.tsx's already-
// authenticated check exactly: postAuthDestinationFor never returns "/signup",
// so an authenticated visitor is always redirected to their real destination
// (including the fail-closed "/login" case) rather than shown the form again.
export default async function SignupPage({
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
      redirect(destination);
    }
    // supabase null (env missing) → render the form; unknown tenant state
    // never grants access and never redirects into a post-auth loop.
  }
  const { next } = await searchParams;
  // Repeated `next` keys arrive as an array — normalize to the first value
  // (or reject) so safeRedirect never receives a non-string.
  const nextValue = Array.isArray(next) ? next[0] : next;
  return <SignupFormLazy next={safeRedirect(nextValue)} />;
}
