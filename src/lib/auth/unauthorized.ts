export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export function forbiddenResponse(
  reason: "needs_onboarding" | "needs_org_selection",
): Response {
  return new Response(JSON.stringify({ error: "forbidden", reason }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}
