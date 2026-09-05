import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getVerifiedOperatorFromCookies } from "@/lib/auth/copilot-hooks";
import { postAuthDestinationFor } from "@/lib/auth/post-auth-destination";
import { listMembershipOrgIdsFromServerClient } from "@/lib/auth/runtime-org";
import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "@/app/(marketing)/login/login-form";

export const metadata: Metadata = {
  title: "Sign in — iPix",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
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
    } else {
      redirect("/planner");
    }
  }
  return <LoginForm />;
}