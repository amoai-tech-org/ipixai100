# Follow-up Work — IPI-837 · AUTH-OAUTH-001 (`oauth_next` cookie carrier)

**Applicability:** Applies. Merged PR #700 left unchecked smoke items and no CSRF/docs follow-through.

## Unresolved risks

1. **No Origin/Referer check** on `POST /api/auth/oauth-next` — trusts SameSite=Lax + same-origin fetch; impact bounded to allowlisted paths, but cross-site POST can overwrite `oauth_next`.
2. **600s TTL** — long Google consent silently falls back to `/app`.
3. **Best-effort fetch, no telemetry** — failed cookie POST is silent.

## Missing tests

- `login-form` fetch rejection / continue-anyway path  
- CSRF / non-same-origin behavior for oauth-next POST  
- Explicit mid-flow cookie expiry → `/app` fallback  

## Deferred smoke (from #700 test plan)

- [ ] `/login?redirect=/onboarding` → Google → `/onboarding`  
- [ ] Unsafe redirect → `/app`  
- [ ] Email/password still honors `?redirect=`  

## Documentation drift

No repo AUTH doc for login → oauth-next → callback → `safeRedirect`. Useful for **IPI-835** dependents.

## Cleanup

None in touched files.

## Suggested task (created)

**[IPI-890 · AUTH-OAUTH-002 — Verify OAuth redirect smoke tests and harden oauth_next cookie carrier](https://linear.app/amo100/issue/IPI-890)**

Scope: record the three smokes; Origin check or documented residual risk; fetch-failure test; short auth-flow doc for IPI-835.  
(Linear assigned **IPI-890**; draft label “IPI-838” in the post-merge note was a placeholder.)
