export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export function forbiddenResponse(
  reason: "needs_onboarding" | "needs_org_selection" | "thread_forbidden",
): Response {
  return new Response(JSON.stringify({ error: "forbidden", reason }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

export function membershipLookupFailedResponse(): Response {
  return new Response(
    JSON.stringify({ error: "unavailable", reason: "membership_lookup_failed" }),
    {
      status: 503,
      headers: { "content-type": "application/json" },
    },
  );
}
