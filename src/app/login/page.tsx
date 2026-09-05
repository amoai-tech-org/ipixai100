import { redirect } from "next/navigation";

import { getVerifiedOperatorFromCookies } from "@/lib/auth/copilot-hooks";
import { plannerSurfaceFor } from "@/lib/auth/verified-operator";

import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  const operator = await getVerifiedOperatorFromCookies();
  if (plannerSurfaceFor(operator) === "planner") {
    redirect("/planner");
  }
  return <LoginForm />;
}
