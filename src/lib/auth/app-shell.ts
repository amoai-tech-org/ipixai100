import { redirect } from "next/navigation";

import { getVerifiedOperatorFromCookies } from "./copilot-hooks";
import { plannerSurfaceFor } from "./verified-operator";

/**
 * APP-001 workspace chrome gate.
 *
 * Layout may redirect signed-out users, but that is shell access only.
 * Brand / Shoot / Asset data paths must still authorize at their server/DAL.
 * Next.js layouts persist across navigation and must not be the sole auth boundary:
 * https://nextjs.org/docs/app/guides/authentication
 */
export async function requireAppWorkspace() {
  const operator = await getVerifiedOperatorFromCookies();
  if (!operator || plannerSurfaceFor(operator) === "login") {
    redirect("/login");
  }
  return operator;
}
