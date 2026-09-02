/** APP-001 destinations. Child tasks own page bodies; these are shell routes only. */
export const OPERATOR_NAV = [
  { href: "/app", label: "Home" },
  { href: "/app/brands", label: "Brands" },
  { href: "/app/shoots", label: "Shoots" },
  { href: "/app/assets", label: "Assets" },
  { href: "/app/crm", label: "CRM" },
  { href: "/app/talent", label: "Talent" },
  { href: "/app/operations", label: "Operations" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/plans", label: "Plans" },
] as const;

export type OperatorNavHref = (typeof OPERATOR_NAV)[number]["href"];

export function isOperatorNavHref(pathname: string): boolean {
  return OPERATOR_NAV.some((item) => item.href === pathname);
}

export function navItemIsActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}
