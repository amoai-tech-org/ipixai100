import { unauthorizedResponse } from "./unauthorized";

export type JwtClaims = {
  sub?: string;
  email?: string;
};

export type ClaimsResult = {
  data: { claims: JwtClaims | null } | null;
  error: unknown;
};

export type VerifiedOperator = {
  id: string;
  name: string;
};

/** AUTH-002 will replace `unscoped` with a verified org_members org id. */
export const AUTH_001_ORG_PLACEHOLDER = "unscoped";

/** Live Mastra/CopilotKit memory key: `org:{orgId}::user:{userId}`. */
export function memoryResourceId(userId: string): string {
  return `org:${AUTH_001_ORG_PLACEHOLDER}::user:${userId}`;
}

export function claimsFromSupabaseResult(result: {
  data: { claims?: { sub?: unknown; email?: unknown } | null } | null;
  error: unknown;
}): ClaimsResult {
  const claims = result.data?.claims;
  return {
    data: {
      claims: claims
        ? {
            sub: typeof claims.sub === "string" ? claims.sub : undefined,
            email: typeof claims.email === "string" ? claims.email : undefined,
          }
        : null,
    },
    error: result.error,
  };
}

export async function getVerifiedOperatorFromClaims(options: {
  getClaims: () => Promise<ClaimsResult>;
  request?: Request;
}): Promise<VerifiedOperator | null> {
  void options.request;
  const { data, error } = await options.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return { id: sub, name: data.claims?.email || sub };
}

export async function requireVerifiedOperator(options: {
  getClaims: () => Promise<ClaimsResult>;
  request: Request;
}): Promise<VerifiedOperator> {
  const operator = await getVerifiedOperatorFromClaims(options);
  if (!operator) throw unauthorizedResponse();
  return operator;
}

/** CopilotKit must not mount until a verified session exists (unsigned /info is 401). */
export function plannerSurfaceFor(
  operator: VerifiedOperator | null,
): "planner" | "login" {
  return operator ? "planner" : "login";
}
