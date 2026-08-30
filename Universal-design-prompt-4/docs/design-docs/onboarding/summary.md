# Onboarding — what’s done vs what’s left

**As of:** 2026-08-01 · Live site: [ipix.co/onboarding](https://www.ipix.co/onboarding)  
**Full audit:** [`j31-onboarding-plan.md`](./j31-onboarding-plan.md)

---

## In one sentence

Operators can **sign in and walk a polished 13-screen onboarding wizard on production**, but finishing that flow still **does not create a real brand, crawl a site, or save Brand DNA**. The UI is done; the “make a brand ready” backend is not.

---

## What a new user can do today

| Step | Can they? | Notes |
| --- | --- | --- |
| Open `/onboarding` while logged out | Yes → login | Correctly gated like `/app` |
| Sign in with **email**, then continue onboarding | Yes | Return to `/onboarding` works |
| Sign in with **Google**, then land on onboarding | **No** | Google always drops them on `/app` today |
| See all 13 screens (questions + marketing) | **Yes** | Verified live while signed in |
| Save progress and come back later | **No** | Answers live only in the browser |
| Create their org + brand from this wizard | **No** | Old path `/app/onboarding` still does creates |
| Watch a **real** website crawl | **No** | Screen 12 is a fake progress timer |
| Get evidence-backed Brand DNA + approve it | **No** | Screen 13 is a “what’s next” shell only |
| End up in Brand Hub with a Ready brand | **No** | Not wired through v2 yet |

---

## Done (shipped & verified)

### Security — **IPI-809 · SEC-ONB-001**
- Fixed: any logged-in user could previously see every organization.
- Live on production Supabase. Do not reopen.

### Onboarding UI — **IPI-833 · ONB2-UI-001**
- Standalone route: `https://www.ipix.co/onboarding` (steps `#1`…`#13`).
- 13 screens: intro, questions, marketing, fake analysis, DNA payoff shell.
- Continue stays disabled until required answers; Skip on later questions; Back/history work.
- No operator sidebar/chat chrome — clean full-screen wizard.
- Strong unit tests on `main`; **signed-in production walk confirmed 2026-08-01**.

**What the user sees (examples):**
1. “Build your fashion brand with AI” + photo tiles → **Get started**
2. “What are you building?” (fashion / clothing / …)
4. Brand name + optional website
5. Where listed (Instagram, Shopify, …)
12→13. Fake “analyzing” timer → “Your Brand DNA is next” (Voice / Palette / Audience / Positioning) → **Open iPix**

---

## Not done (needed for a real beta)

These are the only items that block a trustworthy Vercel beta where a new brand actually becomes Ready.

| Priority | Task | Plain English | Status |
| ---: | --- | --- | --- |
| 1 | **IPI-837 · AUTH-OAUTH-001** | After Google sign-in, send people back to `/onboarding` (not dump them on `/app`) | PR [#700](https://github.com/amo-tech-ai/lumina-studio/pull/700) open — needs Google smoke, then merge |
| 2 | **IPI-832 · ONB2-DB-001** | Save drafts; create **exactly one** org + brand safely (no doubles / orphans) | Not started — can begin now |
| 2 | **IPI-834 · ONB2-AI-001** | Brand DNA must be evidence-backed and fail closed (no fake “ok” DNA) | Not started — can run parallel with 832 |
| 3 | **IPI-835 · ONB2-INT-001** | Wire the wizard to real crawl, live progress, approval, and retire the old `/app/onboarding` create path | Blocked until 832 + 834 finish |
| 4 | **IPI-836 · ONB2-VERIFY-001** | Playwright + one controlled production proof that a brand ends Ready | Blocked until 835 |
| Support | **IPI-829 · ONB-QA-001** | QA Supabase DB caught up so automated tests have a real database | Needed for Playwright / race tests |

### Nice-to-have (do not block beta)
- **IPI-840** — polish bad hash deep links  
- **IPI-843** — mobile + reduced-motion pass on a deployed preview  
- Cloudflare cutover, Stripe, native-first audits — separate tracks  

---

## Suggested order (keep it simple)

```text
Done:     Security (809) + UI wizard (833)
Next:     Merge Google redirect (837)     ⎫ can overlap
          Start sessions/DB (832)         ⎬
          Start DNA contract (834)        ⎭
Then:     Wire crawl + approval (835)
Last:     Automated + prod smoke (836) + QA DB (829)
```

**Rule of thumb:** 832 and 834 should **not** wait for Google OAuth to merge. Only the final “wire it all together” ticket (835) needs both.

---

## Scores (honest)

| Metric | Score | Meaning |
| --- | ---: | --- |
| Implementation completeness | ~38% | UI shell + security yes; end-to-end journey no |
| Production readiness for beta | ~28% | Wizard live; brand creation path not |
| Security confidence | ~90% | Tenant isolation verified on prod |
| Onboarding UI on prod | ~90% | Walked signed-in on ipix.co |

---

## Bottom line

| Audience | Takeaway |
| --- | --- |
| **Product / ops** | The new onboarding *looks* ready and is live behind login. It does **not** yet onboard a real brand. |
| **Engineering** | Ship OAuth PR #700; start DB sessions + DNA contract in parallel; then integration + E2E. |
| **Do not confuse** | `/onboarding` (v2 UI shell) ≠ `/app/onboarding` (legacy path that still creates brands). |

When someone asks “is onboarding done?” — answer: **the screens are done; the journey that creates a Ready brand is not.**
