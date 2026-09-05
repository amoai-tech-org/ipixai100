import { redirect } from "next/navigation";

import { getVerifiedOperatorFromCookies } from "@/lib/auth/copilot-hooks";
import { plannerSurfaceFor } from "@/lib/auth/verified-operator";

import { PlannerApp } from "../planner-app";

export default async function Page() {
  const operator = await getVerifiedOperatorFromCookies();
  if (plannerSurfaceFor(operator) === "login") {
    redirect("/login");
  }
  return <PlannerApp />;
}
