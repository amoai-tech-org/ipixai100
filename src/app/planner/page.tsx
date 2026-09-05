import { redirect } from "next/navigation";

import { getVerifiedOperatorFromCookies } from "@/lib/auth/copilot-hooks";
import { postAuthDestinationFor } from "@/lib/auth/post-auth-destination";
import { listMembershipOrgIdsFromServerClient } from "@/lib/auth/runtime-org";
import { plannerSurfaceFor } from "@/lib/auth/verified-operator";
import { createClient } from "@/lib/supabase/server";

import { PlannerApp } from "../planner-app";

export default async function Page() {
  const operator = await getVerifiedOperatorFromCookies();
  if (!operator || plannerSurfaceFor(operator) === "login") {
    redirect("/login");
  }
  // One server-owned routing policy: single-org members land on /planner;
  // zero-org → onboarding, multi-org → org selection, lookup failure → login.
  const supabase = await createClient();
  if (supabase) {
    const destination = await postAuthDestinationFor({
      operator,
      listOrgIds: () =>
        listMembershipOrgIdsFromServerClient(supabase, operator.id),
    });
    if (destination !== "/planner") {
      redirect(destination);
    }
  }
  return <PlannerApp />;
}