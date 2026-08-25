# REVIEW.md

## What matters in this repository

- Preserve tenant isolation: every query, CopilotKit thread, and Mastra memory key must stay org-scoped. Org B must never read Org A.
- Treat auth, JWT/RPC writes, deletion, and anything that talks to production Supabase as high-risk.
- Prefer small, explicit fixes. One concern per PR. Do not copy the old iPix Worker/Mastra stack wholesale.

## Severity calibration

- Critical: tenant leak, privilege escalation, token/key exposure, production database writes, data loss.
- Warning: missing validation, unsafe defaults, tools that write domain data without SECURITY DEFINER + user JWT, untested edge cases.
- Do not flag formatting-only differences when tooling already enforces them. Do not flag combined `npm run dev` as a product bug — it is intentionally blocked.

## Verification expectations

- New business rules need tests that assert the observable result (deny Org B, fail closed when unsigned).
- Database changes need migration coverage and rollback-aware review. Never `supabase db push` to production in a review “fix.”
- UI / chat changes should preserve keyboard and screen reader behavior, and keep history after refresh when that is the contract.
- Do not call the work production-ready without a live probe. Merge is not Done.
