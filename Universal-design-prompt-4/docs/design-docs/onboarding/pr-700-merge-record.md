# Merge Record

**Task:** [IPI-837 · AUTH-OAUTH-001 — Preserve Safe Post-Login Redirect Through Google OAuth](https://linear.app/amo100/issue/IPI-837)  
**PR:** [#700](https://github.com/amo-tech-ai/lumina-studio/pull/700) — IPI-837 · AUTH-OAUTH-001 — Preserve safe redirect through Google OAuth  
**Merge SHA:** `89550800e8120d5d030288f8f3e60b8011423cab` (merged to `main`)  
**Recorded:** 2026-08-01

## Squashed commits

- `feat(ipi-837): carry safe OAuth redirect via oauth_next cookie`
- `fix(ipi-837): address PR #700 review — cookie secure helper, hash redirects, error clear asserts`

## Purpose

Google sign-in previously dropped the `?redirect=` target and always landed users on `/app`, breaking the new `/onboarding` wizard for Google-heavy new brands (regression vs email/password). This PR introduces an `oauth_next` HttpOnly cookie (Option B) set before OAuth begins, read by the callback, and validated through `safeRedirect()` / `parseSafeRedirect()` so the post-login destination is restored (or falls back to `/app`). Failure paths preserve a safe `redirect=` on `/login?error=auth`.

**Single concern:** the `oauth_next` cookie carrier for Google OAuth post-login redirect. No onboarding screen, Supabase Redirect URL, Google Cloud client, or other IdP changes.

## Files / systems changed

| Path | Change |
| --- | --- |
| `app/src/lib/oauth-next-cookie.ts` | `OAUTH_NEXT_COOKIE`, `OAUTH_NEXT_MAX_AGE_SEC` (600s), `isOAuthCookieSecure()`, `oauthNextCookieOptions()` |
| `app/src/lib/safe-redirect.ts` | Exported `parseSafeRedirect()`; hash fragments allowed on allowlisted prefixes |
| `app/src/app/api/auth/oauth-next/route.ts` | POST sets/clears HttpOnly cookie from validated redirect |
| `app/src/app/auth/callback/route.ts` | Reads `oauth_next`, success + error redirects, clears cookie every exit |
| `app/src/components/marketing/login-form.tsx` | Google path POSTs redirect to `/api/auth/oauth-next` before `signInWithOAuth` (best-effort) |
| Tests | `oauth-next/route.test.ts`, `callback/route.test.ts`, `login-form.test.tsx`, `safe-redirect.test.ts` |

Supabase Auth URL Configuration and Google OAuth client redirect URI: unchanged (documented in PR only).

## Tests and CI at merge

- Unit: 39 tests added/updated — passing  
- `npm run lint` / `typecheck` / `build:cf` — passed  
- **Pending (moved to follow-up):** Google smoke → `/onboarding`; unsafe → `/app`; email/password `?redirect=` regression  

## Production impact

Google OAuth login path only. Cookie: HttpOnly, SameSite=Lax, Secure in production, path `/`, 600s TTL, cleared on every callback exit.

## Known limitations

- Preview/prod Google smoke not independently re-verified in this record  
- Cookie-set fetch is best-effort; failure → silent `/app` fallback  
- TTL 600s; long Google consent → silent `/app` fallback  

## Rollback

Pure code revert of `89550800e8120d5d030288f8f3e60b8011423cab`. No DB/infra/flags.

## CodeRabbit inline findings (verified on `origin/main` 2026-08-01)

All addressed before merge (`d3d26fc` / squash). Re-check against `main`:

| Finding | Verdict |
| --- | --- |
| Bare `IPI-837` in route/login/cookie comments | ✅ Already fixed |
| Extract `isOAuthCookieSecure` helper | ✅ Already fixed |
| Error-path tests assert `oauth_next` cleared | ✅ Already fixed |
| Hash fragment in `parseSafeRedirect` + tests | ✅ Already fixed |

No further code for those findings.

## Follow-up

See [IPI-890 · AUTH-OAUTH-002](https://linear.app/amo100/issue/IPI-890) (smoke + harden + short auth doc). Sibling note: [follow-up work](./pr-700-follow-up.md).
