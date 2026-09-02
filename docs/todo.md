# iPix working catalog

**Start lock:** live Linear `blockedBy` / `blocks`. Numbers are presentation only.

**Status:** 🟢 · 🟡 · 🔴 · 🔵

Each task: dot, full title, purpose, score, phase, tech stack, one URL. Two blank lines between tasks.

When a task is 🟢, move its full block to [`changelog.md`](changelog.md) (newest first). Do not leave completed work in this file.

Epics organize work; they are not execution steps.

---

## Now (finish; do not stack a fourth runtime PR)

| 12 | 🟡
**IPI-1045 · STREAM-001 — Let Authenticated iPix Users Stream Planner Responses Safely**
Finish secure authenticated Planner streaming (signed-in Preview journey still required)
100/100
M1
CopilotKit, Mastra, Supabase Auth, AG-UI
https://linear.app/amo100/issue/IPI-1045/ipi-1045-stream-001-let-authenticated-ipix-users-stream-planner


| 14 | 🟡
**IPI-1065 · APP-001 — Give Operators One Consistent iPix Workspace Across the App**
Build the shared `/app` workspace shell for all product areas
99/100
M1
Next.js, React, CopilotKit, Supabase Auth
https://linear.app/amo100/issue/IPI-1065/ipi-1065-app-001-give-operators-one-consistent-ipix-workspace-across


| — | 🔵
**IPI-1108 · CLD-FOUNDATION-001 — Validate Cloudinary Tooling, SDKs, Environment, and Existing Configuration**
Early cross-cutting Cloudinary foundation (SDKs, env, existing config). Reuse this before HOME/BRAND/SHOOT imagery and before M3 media infra. Not late media work.
94/100
M1
Cloudinary SDK/API
https://linear.app/amo100/issue/IPI-1108/ipi-1108-cld-foundation-001-validate-cloudinary-tooling-sdks


| 15 | 🟡
**IPI-1053 · MARKETING-NAV-001 — Reuse the Existing iPix Marketing Header, Footer, and Shared Layout**
Build shared public marketing chrome without mixing it with operator routes
82/100
M1 parallel
Next.js, React, CSS
https://linear.app/amo100/issue/IPI-1053/ipi-1053-marketing-nav-001-reuse-the-existing-ipix-marketing-header


| 16 | 🟡
**IPI-1040 · MIGRATION-001 — Prove New iPix Database Changes Can Be Added Without Replaying Old Migrations**
Certify the safe forward-only Supabase migration path
99/100
Parallel Security
Supabase CLI, Postgres
https://linear.app/amo100/issue/IPI-1040/ipi-1040-migration-001-prove-new-ipix-database-changes-can-be-added


| 17 | 🟡
**IPI-897 · SB-SEC-009 — Lock Down Default Planner Privileges for New Tables**
Prevent future Planner tables inheriting unsafe grants
93/100
Parallel Security
PostgreSQL ACL, Supabase
https://linear.app/amo100/issue/IPI-897/ipi-897-sb-sec-009-lock-down-default-planner-privileges-for-new-tables


| 23 | 🟡
**IPI-1127 · ACCESS-CLAIM-001 — Make Planner Thread Ownership an Atomic Shared Claim**
Prevent two Vercel instances/orgs racing to own the same new thread. Linear: In Progress; 1124 🟢; blocks CORE. Follow the 1040 forward-migration procedure for the claim table. Not after CORE.
98/100
M1 release safety
Postgres, Supabase migrations, CopilotKit
https://linear.app/amo100/issue/IPI-1127/ipi-1127-access-claim-001-make-planner-thread-ownership-an-atomic


---

## M1 remaining — Foundation (no Planner/tools)

MEM and Replay run in parallel with the Planner lane. Do not wait for PLANNER/TOOL (those are M2 after STREAM). HOST-RUNNER starts as soon as STREAM-001 is stable. ACCESS-CLAIM is In Progress under Now.

| 24 | 🔵
**IPI-1117 · HOST-RUNNER-001 — Make Planner Stop Work Across Vercel Instances**
Make Stop/cancel work across multiple Vercel workers. Start when STREAM-001 is stable.
95/100
M1 release safety
Vercel, CopilotKit, Mastra
https://linear.app/amo100/issue/IPI-1117/ipi-1117-host-runner-001-make-planner-stop-work-across-vercel


| 18 | 🔵
**IPI-1050 · MEM-001 — Let the Planner Remember the Conversation After Refresh and Restart**
Restore durable conversational continuity. Parallel with Replay and the Planner lane.
98/100
M1
Mastra Memory, @mastra/pg, Supabase Postgres
https://linear.app/amo100/issue/IPI-1050/ipi-1050-mem-001-let-the-planner-remember-the-conversation-after


| 19 | 🔵
**IPI-1088 · COPILOT-REPLAY-001 — Reload the Planner UI from the saved conversation after refresh**
Repaint the same persisted conversation after browser refresh/restart. Parallel with Memory and the Planner lane.
98/100
M1
CopilotKit threads, Mastra, Postgres
https://linear.app/amo100/issue/IPI-1088/ipi-1088-copilot-replay-001-reload-the-planner-ui-from-the-saved


| 20 | 🔵
**IPI-1031 · CORE-HOST-REF — Hosted synthetic Core proof on existing project**
Prove hosted Postgres persistence and non-interference safely
97/100
M1 certification
Supabase Postgres, Mastra, Vercel
https://linear.app/amo100/issue/IPI-1031/ipi-1031-core-host-ref-hosted-synthetic-core-proof-on-existing-project


| 21 | 🔵
**IPI-1051 · UI-001 — Let an iPix Operator Use the Planner in One Simple Authenticated Screen**
Put the real Planner inside the authenticated operator workspace
98/100
M1
Next.js, CopilotKit, Mastra
https://linear.app/amo100/issue/IPI-1051/ipi-1051-ui-001-let-an-ipix-operator-use-the-planner-in-one-simple


| 22 | 🔵
**IPI-1041 · CORE-001 — Prove the New iPix AI Foundation Survives Refresh, Restart, and Cross-Org Access Attempts**
Final M1 Foundation certification
100/100
M1 exit gate
Playwright, CopilotKit, Mastra, Supabase
https://linear.app/amo100/issue/IPI-1041/ipi-1041-core-001-prove-the-new-ipix-ai-foundation-survives-refresh


| 25 | 🔵
**IPI-1058 · MARKETING-LOGIN-001 — Reuse the Proven iPix Login Experience With the New Supabase Auth Setup**
Restore the production login experience
86/100
M1
Next.js, Supabase Auth
https://linear.app/amo100/issue/IPI-1058/ipi-1058-marketing-login-001-reuse-the-proven-ipix-login-experience


| 26 | 🔵
**IPI-1089 · ONBOARD-001 — Let a New iPix User Sign Up, Create Their First Brand, and Reach the Operator Workspace**
Complete first-user onboarding and first-org creation. After login.
94/100
M1
Supabase Auth, Next.js, Brands
https://linear.app/amo100/issue/IPI-1089/ipi-1089-onboard-001-let-a-new-ipix-user-sign-up-create-their-first


| 27 | 🔵
**IPI-1090 · AUTH-RECOVERY-001 — Let iPix Users Recover Access When They Forget Their Password**
Add production account recovery. Parallel after login.
87/100
M1
Supabase Auth, Next.js
https://linear.app/amo100/issue/IPI-1090/ipi-1090-auth-recovery-001-let-ipix-users-recover-access-when-they

## Parallel · Security (not on the M1 serial path)

IPI-1040 and IPI-897 are listed once under Now. ACCESS-CLAIM is also listed once under Now.

| 28 | 🔵
**IPI-1039 · SB-V2-003 — Give Every Supabase Security Warning an Owner and Clear Action**
Close or explicitly own remaining database security warnings
92/100
Parallel Security
Supabase Advisor, Postgres, RLS
https://linear.app/amo100/issue/IPI-1039/ipi-1039-sb-v2-003-give-every-supabase-security-warning-an-owner-and


| 29 | 🔵
**IPI-863 · AUTH-V2-001 — Block Known Leaked Passwords for iPix Accounts**
Enable leaked-password protection
84/100
Parallel Security
Supabase Auth
https://linear.app/amo100/issue/IPI-863/ipi-863-auth-v2-001-block-known-leaked-passwords-for-ipix-accounts

## M2 · Brand & Planning

PLANNER → TOOL is the M2 capability lane. Start it as soon as STREAM-001 is complete. HOME, BRAND, and SHOOT run in parallel after APP-001; Cloudinary-backed imagery reuses CLD-FOUNDATION.

| 30 | 🔵
**IPI-1048 · PLANNER-001 — Make the Production Planner the Main iPix AI Assistant**
Replace demo/weather behavior with the real fashion-production Planner. Start when STREAM-001 is complete.
98/100
M2
Mastra, CopilotKit, AI SDK
https://linear.app/amo100/issue/IPI-1048/ipi-1048-planner-001-make-the-production-planner-the-main-ipix-ai


| 31 | 🔵
**IPI-1049 · TOOL-001 — Let the Planner Build Shoot Type, Deliverables, Shot List, and Budget Safely**
Give Planner its first useful structured production tools. After PLANNER-001.
97/100
M2
Mastra tools, TypeScript, CopilotKit
https://linear.app/amo100/issue/IPI-1049/ipi-1049-tool-001-let-the-planner-build-shoot-type-deliverables-shot


| 32 | 🔵
**IPI-1066 · HOME-001 — Reuse the Proven iPix Command Center in the New App**
Give operators a useful organization landing page. Parallel with BRAND and SHOOT after APP. Reuse CLD-FOUNDATION when imagery is Cloudinary-backed.
91/100
M2
Next.js, React, Supabase
https://linear.app/amo100/issue/IPI-1066/ipi-1066-home-001-reuse-the-proven-ipix-command-center-in-the-new-app


| 33 | 🔵
**IPI-1068 · BRAND-001 — Let Operators Browse Brands and Open Complete Brand Profiles**
Make Brands a first-class operator workspace. Parallel with HOME and SHOOT after APP. Reuse CLD-FOUNDATION when imagery is Cloudinary-backed.
97/100
M2
Next.js, Supabase, RLS
https://linear.app/amo100/issue/IPI-1068/ipi-1068-brand-001-let-operators-browse-brands-and-open-complete-brand


| 36 | 🔵
**IPI-1067 · SHOOT-001 — Let Operators Browse Shoots and Open Complete Shoot Records**
Establish the canonical Shoot workspace. Parallel with HOME and BRAND after APP. Reuse CLD-FOUNDATION when imagery is Cloudinary-backed.
97/100
M2
Next.js, Supabase/Postgres
https://linear.app/amo100/issue/IPI-1067/ipi-1067-shoot-001-let-operators-browse-shoots-and-open-complete-shoot


| 34 | 🔵
**IPI-1093 · BRAND-INTEL-001 — Turn a Brand Website Into an Approved Brand DNA Profile**
Research brand → draft Brand DNA → human approval. Before Brand Knowledge. AI-EVIDENCE is not a hard blocker.
98/100
M2
Mastra, Gemini, CopilotKit HITL, Supabase
https://linear.app/amo100/issue/IPI-1093/ipi-1093-brand-intel-001-turn-a-brand-website-into-an-approved-brand


| — | 🔵
**IPI-172 · AI-EVIDENCE-001 — Persist Provider-Neutral Evidence and Citations for iPix AI Decisions**
One shared evidence envelope for AI recommendations that must be audited later. Extract from a real consumer; do not build a generic evidence platform first. Prefer domain `jsonb` until a second domain needs tables. After Brand Intel as the first evidence-producing consumer — does not hard-block Brand Intel.
—
M2
Mastra, Supabase, CopilotKit
https://linear.app/amo100/issue/IPI-172/ipi-172-ai-evidence-001-persist-provider-neutral-evidence-and


| 35 | 🔵
**IPI-1128 · BRAND-KNOWLEDGE-001 — Give AI Decisions Approved Brand Evidence With Citations**
Make approved Brand evidence reusable and citable by AI. After Brand Intel.
97/100
M2
Supabase, pgvector, Mastra, RLS
https://linear.app/amo100/issue/IPI-1128/ipi-1128-brand-knowledge-001-give-ai-decisions-approved-brand-evidence


| 37 | 🔵
**IPI-1130 · COPILOT-A11Y-001 — Keep CopilotSidebar from hiding focused controls**
Fix Planner accessibility/focus behavior
78/100
M2
CopilotKit, React, accessibility
https://linear.app/amo100/issue/IPI-1130/ipi-1130-copilot-a11y-001-keep-copilotsidebar-from-hiding-focused


| 38 | 🔵
**IPI-1057 · MARKETING-HOME-001 — Reuse the Existing iPix Marketing Homepage in the New App**
Restore public homepage
82/100
M2 parallel
Next.js, React
https://linear.app/amo100/issue/IPI-1057/ipi-1057-marketing-home-001-reuse-the-existing-ipix-marketing-homepage


| 39 | 🔵
**IPI-1060 · MARKETING-SERVICES-001 — Reuse the Existing iPix Photography Service Pages**
Restore service pages
72/100
M2 parallel
Next.js, React
https://linear.app/amo100/issue/IPI-1060/ipi-1060-marketing-services-001-reuse-the-existing-ipix-photography


| 40 | 🔵
**IPI-1063 · MARKETING-SEO-001 — Keep the New iPix Marketing Site Searchable and Correctly Indexed**
Preserve SEO, redirects, metadata, canonical URLs
75/100
M2 parallel
Next.js SEO
https://linear.app/amo100/issue/IPI-1063/ipi-1063-marketing-seo-001-keep-the-new-ipix-marketing-site-searchable


| 41 | 🔵
**IPI-1064 · MARKETING-MEDIA-001 — Reuse and Optimize the Existing iPix Marketing Images, Sliders, and Visual Content**
Optimize public media
63/100
M2 parallel
Next.js, media/Cloudinary
https://linear.app/amo100/issue/IPI-1064/ipi-1064-marketing-media-001-reuse-and-optimize-the-existing-ipix

## M3 · Production — Shoot journey

Mandatory: CONTEXT → PLAN → APPROVAL → SAVE. QUALITY gates the M3 release path (after SAVE, before wizard polish). TRACE runs in parallel with this work and is required before RELEASE. Optional brief import is a branch into CONTEXT, not part of the serial chain. Shoots without a PDF still work. Brief approval is not ShootPlan approval.

| 46 | 🔵
**IPI-1087 · PLANNER-CONTEXT-001 — Keep the Active Brand and Shoot Brief Available During Planning**
Keep Brand + Shoot context available to Planner. Before PLAN, because PLAN depends on active Brand/Shoot context.
92/100
M3
Mastra, Supabase
https://linear.app/amo100/issue/IPI-1087/ipi-1087-planner-context-001-keep-the-active-brand-and-shoot-brief


| — | 🔵
**IPI-1137 · SHOOT-BRIEF-IMPORT-001 — Turn an Existing Shoot Brief or PDF Into Editable Planner Context**
Optional branch into PLANNER-CONTEXT. Extract a client/creative brief into an editable draft; only approved fields feed Planner context. Does not create a shoot or become a second context store. Not on the mandatory serial chain.
—
M3 optional
Mastra, file/PDF extract, CopilotKit HITL, Supabase
https://linear.app/amo100/issue/IPI-1137/shoot-brief-import-001-turn-an-existing-shoot-brief-or-pdf-into


| 42 | 🔵
**IPI-1081 · PLAN-001 — Make the Planner Return a Complete Structured Shoot Plan**
Produce a validated structured ShootPlan. After PLANNER-CONTEXT.
100/100
M3
Mastra, structured output
https://linear.app/amo100/issue/IPI-1081/ipi-1081-plan-001-make-the-planner-return-a-complete-structured-shoot


| 43 | 🔵
**IPI-1084 · APPROVAL-001 — Let Operators Review, Edit, Approve, or Reject AI Plans Before Anything Is Saved**
Human review before consequential writes. Immediately after PLAN.
100/100
M3
CopilotKit HITL, Mastra
https://linear.app/amo100/issue/IPI-1084/ipi-1084-approval-001-let-operators-review-edit-approve-or-reject-ai


| 44 | 🔵
**IPI-1083 · SHOOT-SAVE-001 — Save an Approved Shoot Once and Under the Correct Organization**
Persist only approved shoots under trusted org identity. Immediately after approval.
100/100
M3
Supabase, Postgres, RLS
https://linear.app/amo100/issue/IPI-1083/ipi-1083-shoot-save-001-save-an-approved-shoot-once-and-under-the


| 47 | 🔵
**IPI-1086 · PLANNER-QUALITY-001 — Catch Planner Mistakes Before They Reach Operators**
Validate Planner output before operators depend on it. Gates the M3 release path — not only post-build validation. After SAVE, before wizard polish.
96/100
M3 release gate
Mastra evals, tests
https://linear.app/amo100/issue/IPI-1086/ipi-1086-planner-quality-001-catch-planner-mistakes-before-they-reach


| 45 | 🔵
**IPI-1085 · SHOOT-WIZARD-001 — Let Operators Build and Review a Complete Production-Ready Shoot**
Complete production details after AI planning
96/100
M3
Next.js, React, Supabase, HITL
https://linear.app/amo100/issue/IPI-1085/ipi-1085-shoot-wizard-001-let-operators-build-and-review-a-complete


| 48 | 🔵
**IPI-1082 · PLANNER-TRACE-001 — Show Where Planner Requests Succeeded, Slowed, or Failed**
Add traceability and production debugging. Parallel with M3 workflow implementation; required before RELEASE.
88/100
M3
Mastra observability
https://linear.app/amo100/issue/IPI-1082/ipi-1082-planner-trace-001-show-where-planner-requests-succeeded

## M3 · Production — Cloudinary / media infra

CLD-FOUNDATION is M1 (alongside APP). This lane starts after the 1040 migration procedure.

```text
1040 MIGRATION → 1109 MEDIA-DATA → 1122 SB-MEDIA-HARDEN
→ (1110 SIGN ∥ 1111 WEBHOOK ∥ 1112 DELIVERY)
→ 1069 ASSETS (after 1112 + APP; not cutover)
→ 1113 E2E (after sign + webhook)
1114 RECONCILE ∥ after the core pipe is readable
1115 CUTOVER last
```

| 50 | 🔵
**IPI-1109 · MEDIA-DATA-001 — Prove Asset Tables Stay Org-Safe for V2**
Audit media ownership and tenant safety
96/100
M3
Supabase, RLS, Cloudinary
https://linear.app/amo100/issue/IPI-1109/ipi-1109-media-data-001-prove-asset-tables-stay-org-safe-for-v2


| 51 | 🔵
**IPI-1122 · SB-MEDIA-HARDEN-001 — Harden Supabase Media Grants and Canonical Shoot Links for Cloudinary V2**
Fix grants and canonical shoot/media relationships
99/100
M3
Supabase, Postgres, RLS
https://linear.app/amo100/issue/IPI-1122/sb-media-harden-001-harden-supabase-media-grants-and-canonical-shoot


| 52 | 🔵
**IPI-1110 · CLD-SIGN-001 — Sign Cloudinary Uploads for the Trusted Organization**
Secure uploads under trusted server-side org context. Parallel with webhook and delivery after media harden.
97/100
M3
Cloudinary signed uploads, Supabase Auth
https://linear.app/amo100/issue/IPI-1110/cld-sign-001-sign-cloudinary-uploads-for-the-trusted-organization


| 53 | 🔵
**IPI-1111 · CLD-WEBHOOK-001 — Mirror Cloudinary Uploads and Deletes into Supabase**
Sync Cloudinary lifecycle events into app truth. Parallel with sign and delivery after media harden.
97/100
M3
Cloudinary webhooks, Supabase
https://linear.app/amo100/issue/IPI-1111/cld-webhook-001-mirror-cloudinary-uploads-and-deletes-into-supabase


| 54 | 🔵
**IPI-1112 · CLD-DELIVERY-001 — Serve Org-Safe Cloudinary Previews with Named Transforms**
Serve safe transformed previews. Parallel with sign and webhook after media harden. Unlocks ASSETS-001 with APP.
93/100
M3
Cloudinary transformations
https://linear.app/amo100/issue/IPI-1112/cld-delivery-001-serve-org-safe-cloudinary-previews-with-named


| 58 | 🔵
**IPI-1069 · ASSETS-001 — Let Operators Browse Assets and Manage Asset Records**
Give operators a real asset workspace. Start when CLD-DELIVERY and APP are ready; does not wait for CLD-UPLOAD or cutover.
90/100
M3
Next.js, Supabase, Cloudinary
https://linear.app/amo100/issue/IPI-1069/ipi-1069-assets-001-let-operators-browse-assets-and-manage-asset


| 55 | 🔵
**IPI-1113 · CLD-E2E-001 — Prove One Disposable Upload Reaches Supabase Ready**
Prove upload → webhook → Ready end to end. After sign + webhook are working.
96/100
M3
Cloudinary, Supabase, E2E
https://linear.app/amo100/issue/IPI-1113/cld-e2e-001-prove-one-disposable-upload-reaches-supabase-ready


| 56 | 🔵
**IPI-1114 · CLD-RECONCILE-001 — Detect Cloudinary and Supabase Drift Without Mutating Production**
Detect media drift safely. Parallel after the core media pipe is readable. Does not block cutover by itself.
88/100
M3
Cloudinary Admin API, Supabase
https://linear.app/amo100/issue/IPI-1114/cld-reconcile-001-detect-cloudinary-and-supabase-drift-without


| 57 | 🔵
**IPI-1115 · CLD-CUTOVER-001 — Cut Cloudinary Notifications Over to V2 Safely**
Final media infrastructure cutover. Last in this lane.
94/100
M3
Cloudinary webhooks, deployment
https://linear.app/amo100/issue/IPI-1115/cld-cutover-001-cut-cloudinary-notifications-over-to-v2-safely

## M3 · Production — Media product

IPI-1097 · MEDIA-001 owns the journey. ASSETS-001 is listed once after CLD-DELIVERY in media infra.

```text
1116 UPLOAD → 1118 ATTACH → (1136 DNA ∥ 1138 QA) → 1119 APPROVAL → 1120 DELIVERY
```

DNA and QA are related, not blocking each other. DNA needs an approved Brand Brain. QA uses Cloudinary metadata and named transforms first.

| 59 | 🔵
**IPI-1097 · MEDIA-001 — Upload, Review, Approve, and Deliver Shoot Assets**
Upload, review, approve, and deliver shoot assets
100/100
M3
Cloudinary, Next.js, Supabase, HITL
https://linear.app/amo100/issue/IPI-1097/ipi-1097-media-001-upload-review-approve-and-deliver-shoot-assets


| 60 | 🔵
**IPI-1116 · CLD-UPLOAD-001 — Let Operators Upload Shoot Selects with the Cloudinary Widget**
Operator upload UX
96/100
M3
Cloudinary Upload Widget, Next.js
https://linear.app/amo100/issue/IPI-1116/cld-upload-001-let-operators-upload-shoot-selects-with-the-cloudinary


| 61 | 🔵
**IPI-1118 · SHOOT-ASSETS-001 — Attach Uploaded Assets to the Correct Saved Shoot**
Link uploaded assets to canonical saved shoots
98/100
M3
Supabase, Cloudinary
https://linear.app/amo100/issue/IPI-1118/shoot-assets-001-attach-uploaded-assets-to-the-correct-saved-shoot


| — | 🔵
**IPI-1136 · ASSET-DNA-001 — Analyze Uploaded Shoot Assets Against the Approved Brand Brain**
Score the exact Cloudinary version against the approved Brand Brain. Assists the operator; never auto-approves. After attach; parallel with Asset QA. Needs Brand Intel (and Brand Knowledge if cited knowledge is required). Parent: MEDIA-001.
—
M3
Mastra, Cloudinary, CopilotKit HITL, Brand Brain
https://linear.app/amo100/issue/IPI-1136/asset-dna-001-analyze-uploaded-shoot-assets-against-the-approved-brand


| — | 🔵
**IPI-1138 · ASSET-QA-001 — Check Asset Quality and Channel Readiness Before Approval**
Technical and channel readiness on the exact asset version. Deterministic metadata and named transforms first; vision only when geometry cannot answer. Does not wait for DNA. Parent: MEDIA-001.
—
M3
Cloudinary metadata, named transforms, channel specs
https://linear.app/amo100/issue/IPI-1138/asset-qa-001-check-asset-quality-and-channel-readiness-before-approval


| 62 | 🔵
**IPI-1119 · MEDIA-APPROVAL-001 — Approve or Reject the Exact Cloudinary Asset Version**
Approve an exact immutable asset version
98/100
M3
Cloudinary, Supabase, HITL
https://linear.app/amo100/issue/IPI-1119/media-approval-001-approve-or-reject-the-exact-cloudinary-asset


| 63 | 🔵
**IPI-1120 · MEDIA-DELIVERY-001 — Deliver Only Approved Named-Transform Asset Versions**
Deliver exactly what was approved
97/100
M3
Cloudinary delivery, Supabase
https://linear.app/amo100/issue/IPI-1120/media-delivery-001-deliver-only-approved-named-transform-asset

## M3 · Talent / Booking

| 64 | 🔵
**IPI-1094 · BOOKING-DATA-001 — Create the Shared Shoot, Talent, Studio, and Availability Booking Contract**
Establish booking data contract
85/100
M3 parallel
Supabase/Postgres
https://linear.app/amo100/issue/IPI-1094/ipi-1094-booking-data-001-create-the-shared-shoot-talent-studio-and


| 65 | 🔵
**IPI-1071 · TALENT-BOOKING-001 — Let Operators Find Talent and Manage Bookings**
Build operator booking workspace
79/100
M3 parallel
Next.js, Supabase
https://linear.app/amo100/issue/IPI-1071/ipi-1071-talent-booking-001-let-operators-find-talent-and-manage


| 66 | 🔵
**IPI-1095 · BOOKING-AI-001 — Let the Booking Coordinator Coordinate Production Bookings**
AI-assisted production booking coordination
72/100
M3 parallel
Mastra, CopilotKit
https://linear.app/amo100/issue/IPI-1095/ipi-1095-booking-ai-001-let-the-booking-coordinator-coordinate


| 67 | 🔵
**IPI-1096 · PAYMENT-001 — Collect and Confirm a Shoot Booking Deposit Safely**
Add safe shoot deposit/payment flow
70/100
M3 parallel
Stripe, Supabase
https://linear.app/amo100/issue/IPI-1096/ipi-1096-payment-001-collect-and-confirm-a-shoot-booking-deposit

## M3 exit

After CORE, ACCESS-CLAIM, HOST-RUNNER, Planner QUALITY and TRACE, Shoot SAVE, and media proof — not before.

| 68 | 🔵
**IPI-1091 · RELEASE-001 — Deploy the New iPix App to Vercel and Prove the Complete Production Journey**
Certify the real production user journey
100/100
M3 exit
Vercel, Playwright, Supabase, Mastra
https://linear.app/amo100/issue/IPI-1091/ipi-1091-release-001-deploy-the-new-ipix-app-to-vercel-and-prove-the

## M4 · Campaigns

| 69 | 🔵
**IPI-36 · BRAND-RESEARCH-001 — Research Competitors, Trends, and Market Opportunities With Evidence**
Gather current market evidence
90/100
M4
Mastra, Gemini, web research, Supabase
https://linear.app/amo100/issue/IPI-36/ipi-36-brand-research-001-research-competitors-trends-and-market


| 70 | 🔵
**IPI-1129 · BRAND-OPPORTUNITY-001 — Rank Market Opportunities Against Each Brand**
Rank evidence-backed opportunities
92/100
M4
Mastra, Brand Knowledge, Supabase
https://linear.app/amo100/issue/IPI-1129/ipi-1129-brand-opportunity-001-rank-market-opportunities-against-each


| 71 | 🔵
**IPI-42 · CAMPAIGN-STRATEGY-001 — Turn an Approved Opportunity Into an Interactive Campaign Strategy**
Turn opportunity into strategy
95/100
M4
Mastra, CopilotKit HITL
https://linear.app/amo100/issue/IPI-42/ipi-42-campaign-strategy-001-turn-an-approved-opportunity-into-an


| 72 | 🔵
**IPI-157 · CAMPAIGN-PLAN-001 — Turn an Approved Strategy Into an Executable Campaign Plan**
Turn strategy into executable plan
94/100
M4
Mastra, Cloudinary, Supabase
https://linear.app/amo100/issue/IPI-157/ipi-157-campaign-plan-001-turn-an-approved-strategy-into-an-executable


| 73 | 🔵
**IPI-77 · CAMPAIGN-COPY-001 — Create Brand-Safe Channel Copy From Approved Assets and Strategy**
Draft channel copy safely
90/100
M4
Mastra, LLM, Brand Knowledge
https://linear.app/amo100/issue/IPI-77/ipi-77-campaign-copy-001-create-brand-safe-channel-copy-from-approved


| 74 | 🔵
**IPI-1131 · BRAND-CHECK-001 — Check Copy and Media Against the Approved Brand Brain**
Validate brand compliance before publish
94/100
M4
Mastra, Brand Knowledge, Cloudinary
https://linear.app/amo100/issue/IPI-1131/ipi-1131-brand-check-001-check-copy-and-media-against-the-approved


| 75 | 🔵
**IPI-338 · CHANNEL-PREVIEW-001 — Preview Approved Campaign Content Before Publishing**
Human preview before publishing
92/100
M4
Next.js, CopilotKit, Cloudinary
https://linear.app/amo100/issue/IPI-338/ipi-338-channel-preview-001-preview-approved-campaign-content-before


| 76 | 🔵
**IPI-195 · PUBLISH-001 — Publish Only Approved Campaign Content Through Postiz**
Publish only approved campaign content
98/100
M4
Postiz, Mastra, Supabase, HITL
https://linear.app/amo100/issue/IPI-195/ipi-195-publish-001-publish-only-approved-campaign-content-through

## M5 · Measurement

| 77 | 🔵
**IPI-1073 · ANALYTICS-001 — Bring the Existing Analytics Workspace Into the New App Without Fake Metrics**
Show deterministic real campaign/product/asset metrics
90/100
M5
Supabase, Metabase, Postiz, Cloudinary
https://linear.app/amo100/issue/IPI-1073/ipi-1073-analytics-001-bring-the-existing-analytics-workspace-into-the

## M6 · Learning

| 78 | 🔵
**IPI-1133 · LEARN-001 — Recommend Brand Brain Improvements From Real Campaign Results**
Turn measured results into reviewed Brand Brain change proposals
88/100
M6
Mastra, CopilotKit HITL, Supabase
https://linear.app/amo100/issue/IPI-1133/ipi-1133-learn-001-recommend-brand-brain-improvements-from-real

## M7 · Scale / Advanced

Mastra workflow tasks (994 → 1003) are not a strict serial train. Activate each only after a real repeated workflow need is proven.

| 79 | 🔵
**IPI-1070 · CRM-001 — Bring the Proven iPix CRM Workspace Into the New App**
Restore CRM workspace
67/100
M7
Next.js, Supabase
https://linear.app/amo100/issue/IPI-1070/ipi-1070-crm-001-bring-the-proven-ipix-crm-workspace-into-the-new-app


| 80 | 🔵
**IPI-1072 · OPERATIONS-001 — Bring the Operator Inbox and Coordination Workflow Into the New App**
Restore operator inbox/coordination
67/100
M7
Next.js, Supabase
https://linear.app/amo100/issue/IPI-1072/ipi-1072-operations-001-bring-the-operator-inbox-and-coordination


| 81 | 🔵
**IPI-1074 · PLANS-001 — Bring the Existing Production Planning Workspace Into /app/plans**
Add saved production plans without creating a second Planner
62/100
M7
Next.js, Supabase
https://linear.app/amo100/issue/IPI-1074/ipi-1074-plans-001-bring-the-existing-production-planning-workspace


| 82 | 🔵
**IPI-994 · MASTRA-WF-001 — Establish Reusable iPix Workflow Foundation**
Generalize proven workflows. Activate only after a real repeated workflow need is proven — not a serial train into later WF tasks.
65/100
M7
Mastra Workflows
https://linear.app/amo100/issue/IPI-994/ipi-994-mastra-wf-001-establish-reusable-ipix-workflow-foundation


| 83 | 🔵
**IPI-995 · MASTRA-WF-002 — Standardize and Govern the Existing iPix Tool Registry**
Standardize tool contracts/permissions
68/100
M7
Mastra tools
https://linear.app/amo100/issue/IPI-995/ipi-995-mastra-wf-002-standardize-and-govern-the-existing-ipix-tool


| 84 | 🔵
**IPI-998 · MASTRA-WF-005 — Standardize Human-in-the-Loop Approval**
Reuse approval patterns across workflows
72/100
M7
Mastra, CopilotKit HITL
https://linear.app/amo100/issue/IPI-998/ipi-998-mastra-wf-005-standardize-human-in-the-loop-approval


| 85 | 🔵
**IPI-999 · MASTRA-WF-006 — Harden Long-Lived Workflow Recovery, Reconnect & Idempotency**
Make long workflows restart-safe
70/100
M7
Mastra, Postgres
https://linear.app/amo100/issue/IPI-999/ipi-999-mastra-wf-006-harden-long-lived-workflow-recovery-reconnect


| 86 | 🔵
**IPI-996 · MASTRA-WF-003 — Add Mastra Task Tracking & Progress UI**
Show workflow progress
58/100
M7
Mastra, CopilotKit, React
https://linear.app/amo100/issue/IPI-996/ipi-996-mastra-wf-003-add-mastra-task-tracking-and-progress-ui


| 87 | 🔵
**IPI-997 · MASTRA-WF-004 — Add Parallel Workflow Execution**
Add concurrency where proven useful
55/100
M7
Mastra Workflows
https://linear.app/amo100/issue/IPI-997/ipi-997-mastra-wf-004-add-parallel-workflow-execution


| 88 | 🔵
**IPI-1000 · MASTRA-WF-007 — Add Plan Review Before Complex Execution**
Add reusable pre-execution review
62/100
M7
Mastra, CopilotKit
https://linear.app/amo100/issue/IPI-1000/ipi-1000-mastra-wf-007-add-plan-review-before-complex-execution


| 89 | 🔵
**IPI-1003 · MASTRA-WF-010 — Add Workflow Observability, Evals & Performance Scoring**
Measure workflow reliability and quality. Activate only after a real repeated workflow need is proven — not a required last car of a WF serial train.
60/100
Advanced
Mastra evals/observability
https://linear.app/amo100/issue/IPI-1003/ipi-1003-mastra-wf-010-add-workflow-observability-evals-and


| 90 | 🔵
**IPI-1001 · MASTRA-WF-008 — Prove One Safe Dynamic Workflow End-to-End**
Validate dynamic workflows
48/100
Advanced
Mastra dynamic workflows
https://linear.app/amo100/issue/IPI-1001/ipi-1001-mastra-wf-008-prove-one-safe-dynamic-workflow-end-to-end


| 91 | 🔵
**IPI-1002 · MASTRA-WF-009 — Standardize External Tool & MCP Integration**
Standardize external tool/MCP integrations
48/100
Advanced
Mastra, MCP
https://linear.app/amo100/issue/IPI-1002/ipi-1002-mastra-wf-009-standardize-external-tool-and-mcp-integration


| 92 | 🔵
**IPI-780 · MASTRA-PG-004 — Define and Verify Safe Mastra Data Retention**
Add production data-retention policy
55/100
Advanced
Mastra, Supabase Postgres
https://linear.app/amo100/issue/IPI-780/ipi-780-mastra-pg-004-define-and-verify-safe-mastra-data-retention


| 93 | 🔵
**IPI-1121 · HOST-CF-001 — Establish iPix Cloudflare Workers Hosting**
Optional later Cloudflare hosting path
35/100
Advanced
Cloudflare Workers
https://linear.app/amo100/issue/IPI-1121/ipi-1121-host-cf-001-establish-ipix-cloudflare-workers-hosting

## Execution graph (catalog order)

```text
NOW
IPI-1045 STREAM-001
IPI-1065 APP-001  ∥  IPI-1108 CLD-FOUNDATION
IPI-1053 MARKETING-NAV
IPI-1040 MIGRATION
IPI-897  SB-SEC-009
IPI-1127 ACCESS-CLAIM  🟡  (blocks CORE; 1040 procedure for DDL)

M1 (after STREAM stable)
IPI-1117 HOST-RUNNER

M1 (parallel with Planner lane; do not wait PLANNER/TOOL)
IPI-1050 MEM  ∥  IPI-1088 REPLAY

IPI-1031 CORE-HOST-REF
IPI-1051 UI-001
IPI-1045 STREAM + UI + MEM/REPLAY
        └──→ IPI-1041 CORE-001

LOGIN / FIRST USER
IPI-1058 LOGIN → IPI-1089 ONBOARD
IPI-1090 RECOVERY  ∥ after login

PARALLEL SECURITY
IPI-1040 MIGRATION
IPI-1039 ADVISOR
IPI-863  LEAKED PASSWORDS
1040 procedure → IPI-897 prod ACL
1040 procedure → IPI-1127 DDL apply
Linear hard: IPI-1124 🟢 → IPI-1127

M2 PLANNER LANE (start when STREAM-001 complete)
IPI-1048 PLANNER → IPI-1049 TOOL

M2 WORKSPACE (after APP; Cloudinary via 1108)
IPI-1066 HOME  ∥  IPI-1068 BRAND  ∥  IPI-1067 SHOOT

M2 BRAND INTEL
IPI-1093 BRAND-INTEL
        └──→ IPI-172 AI-EVIDENCE  (not a hard block on 1093)
IPI-1128 BRAND-KNOWLEDGE  (after 1093)

M3 SHOOT (mandatory)
IPI-1087 CONTEXT → IPI-1081 PLAN → IPI-1084 APPROVAL → IPI-1083 SAVE
        → IPI-1086 QUALITY  (release gate, before wizard)
IPI-1085 WIZARD
IPI-1082 TRACE    ∥ workflow; required before RELEASE

OPTIONAL BRIEF
IPI-1137 IMPORT  →  IPI-1087 CONTEXT   (branch only; not first in the serial list)

M3 MEDIA INFRA
1040 → 1109 → 1122 → (1110 SIGN ∥ 1111 WEBHOOK ∥ 1112 DELIVERY)
1069 ASSETS after 1112 + APP (does not wait upload or cutover)
1113 E2E after sign + webhook
1114 RECONCILE ∥ after pipe readable
1115 CUTOVER last

M3 MEDIA PRODUCT
1116 UPLOAD → 1118 ATTACH → (1136 DNA ∥ 1138 QA) → 1119 APPROVAL → 1120 DELIVERY

M3 EXIT
IPI-1091 RELEASE after CORE + ACCESS-CLAIM + HOST-RUNNER
         + QUALITY + TRACE + SHOOT-SAVE + media proof
```
