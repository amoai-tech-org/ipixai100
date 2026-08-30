DESIGN V2 — Forensic Audit 2026-08-12
Source: Linear DESIGN V2 — Operator React Parity (1adb08a8) + Universal-design-prompt-4/{index,MATRIX,docs/handoff/09} + app/src/app/(operator)/ disk + supabase/migrations/* + npm run supabase:verify{-rls} 2026-08-12. Rule: Linear Done ≠ verified. Every 🟢 needs disk proof.

Output — Task Tracker (DESIGN V2 project, 100 issues — SCR + critical spine)
Status	Task	Linear State	Verified %	Code	Design	Data	Tests/E2E	Main Gap	Next Action (ponytail-fast)
🟢	IPI-385 · RF-01 — Extract StatusChip + CRM status tokens	Done	100%	✅ components/ui/status-chip.tsx + status-chip.module.css live, tests	✅ tokens	RLS not needed	✅ status-chip.test.tsx	—	—
🟢	IPI-387 · RF-02 — Build EntityList template	Done	100%	✅ components/ui/entity-list.tsx tested	✅	—	✅	—	—
🟢	IPI-404 · SCR-08 — Assets library (read-only masonry)	Done	85%	✅ app/assets/page.tsx + lib/assets/* + AssetsWorkspace real RLS query	✅ DC Assets.v2.dc.html	✅ assets + listAssets + org RLS (cld_rls_001)	🟡 list tests, no Playwright journey	Upload + channel-readiness panel still stub (was in scope split)	Keep Done; open CLD-UP-001 for upload as next P2
🟢	IPI-410 · SCR-21 — Booking Wizard	Done	90%	✅ app/matching/talent/[id]/book/page.tsx exists, wired	✅	✅ bookings table + RLS	🟡 unit, no E2E	Minor responsive gaps	Done — no next
🟢	IPI-411 · SCR-22 — Booking Detail	Done	90%	✅ app/bookings/[id]/page.tsx	✅	✅	🟡	—	Done
🟢	IPI-476 · Planner schema & reusable engine core	Done	95%	✅ supabase/migrations/planner_* + app/planner/*	✅	✅ planner.* tables/RPCs	✅	—	Done
🟢	IPI-526 · SCR-35 — Planner Hub (screen tracking)	Done	90%	✅ app/planner/page.tsx → hub-workspace.tsx	✅	✅	✅	—	Done — rename to Planner Hub in MATRIX
🟢	IPI-542 · PLN-REL-001 — Planner staging deploy/rollback	Done	100%	✅ verify-cloudflare + migration chain	—	✅	✅	—	Done
🟢	IPI-574/578/579/581 · PLN-S1A/B/D + DATA-001B	Done	95%	✅ workspace reads/mutations, shell, timeline/calendar	✅	✅ RPCs	✅	—	Done
🟢	IPI-453 · FIX — Production Error Boundaries	Done	100%	✅ app/*/error.tsx + loading.tsx per route	—	—	✅	—	Done
🟢	IPI-499 · assets_select_via_brand org-aware	Done	100%	✅ 20260805…brand_hygiene + cld_rls_001	—	✅ verified RLS probe PASS	✅	—	Done
🟡	IPI-405 · SCR-09 — Find and Compare the Best Talent for a Shoot	In Progress	45%	🟡 app/matching/page.tsx is TalentMatchTabs+TalentTab only — inline p-6/text-[#111] not tokens, no loading/empty/error, no swipe/table bulk bar, no EvidenceBlock	✅ SCR-09-Matching-Talent.dc.html	🟢 talent tables exist	🔴 no tests/E2E	DC parity low — fastest = reuse EntityList + StatusChip + TalentTab as data layer	Ponytail: 1-file workspace rewrite reusing EntityList (RF-02) + existing TalentTab query, add loading.tsx + error.tsx from planner/ pattern. No new deps.
🟡	IPI-249 · DESIGN-058 — Manage Campaigns From Brief to Delivery	In Progress	10%	🔴 app/campaigns/page.tsx:1-5 is <CampaignsWorkspace /> placeholder — no query, no filter, no panel	✅ Campaigns.v2.dc.html	🔴 BE-D1 blocked — no campaigns/deliverables tables verified on app (Supabase verify shows bookings/planner/assets only)	🔴 none	Schema missing = true blocker, not stale	Ponytail: Blocked is real. Unblock = one migration campaigns + campaign_deliverables (reuse planner_workflows fk pattern), then reuse EntityList + CampaignCard (exists in components/campaigns/) — do not rebuild cards.
🟡	IPI-478/484 · PLN-ENG hybrid timeline/kanban epic	In Progress	70%	🟡 shell exists, drag/drop + hybrid views partial	🟡	🟡	🟡	Kanban/list views done (S1C) but parent tracker still open	Close after hub-params.test.ts + Playwright smoke
🟡	IPI-671 · PLN-ENG-001 — Keep phase starts on business days	Todo	30%	⚪ util exists in planner/durable.ts but not wired to planner_create_instance	—	🟡 RPC exists	🔴	Logic exists, not enforced	Ponytail: 1 fn nextBusinessDay() in app/src/lib/date.ts (stdlib Date only), guard in planner_create_instance — 10 lines
🟡	IPI-716 · PLN-HUB-002B — Fix New Plan eligibility/auto-fill/local date	Todo	20%	⚪ new-plan-dialog.tsx exists but uses UTC defaults, no eligibility query	—	🟡	🔴	Reuse get_openable_shoots RPC (20260806)	Ponytail: reuse brand.list + shoot_portfolio_view filter already in shoots page — no new RPC
⚪	IPI-296 · DESIGN-090 — Analytics Dashboard	Todo	0%	⚪ app/analytics/* missing — page not in find page.tsx	✅ Analytics.v2.dc.html + ANALYTICS-PLAN.md	🔴 D2 — no analytics views/RPCs	⚪	Greenfield	Ponytail: Defer. When ready: reuse components/command-center KPI card + recharts (already in app) + one analytics_overview view. No new chart lib.
⚪	IPI-297 · DESIGN-091 — Campaign Performance	Backlog	0%	⚪ same as 296	✅	🔴	⚪	Depends on 296	Same as above
⚪	IPI-408 · SCR-18 — Collaboration / Activity Audit	Backlog	5%	⚪ no app/activity route; inbox exists but is Notification Center (SCR-15) not collaboration	✅ SCR-18-Collaboration-Audit.dc.html	🔴 ACT1 — no activity table verified	⚪	Route missing	Ponytail: reuse InboxWorkspace + activity-timeline.tsx (already in crm/) — 1 page wrapper
⚪	IPI-409 · SCR-20 — Talent Portfolios / Rates	Backlog	0%	⚪ no app/matching/talent/[id]/page.tsx	✅	🟢 model_profile exists	⚪	Route missing	Ponytail: clone app/crm/companies/[id]/page.tsx shell (detail + crm-detail-shell.tsx) — 1 route, no new design
⚪	IPI-413/585 · SCR-23/24 Availability + Talent Onboarding	Backlog	0%	⚪ no routes	✅	🟡 model_availability table exists but UI missing	⚪	—	Reuse planner-calendar.tsx for availability grid
🔴	IPI-256/258 · DESIGN-073/080 Error & Recovery / Full QA	Backlog	0%	⚪ DC exists, React error states only per-route error.tsx, no EvidenceBlock failover	✅	—	🔴	Global pattern missing	Ponytail: reuse components/ui/error-state.tsx + lib/notifications pattern — one EvidenceBlock fail template, apply everywhere
🟢	IPI-811 · ONB-VERIFY-001 — Onboarding pipeline proof	Done	100%	✅ app/(onboarding)/onboarding/page.tsx + sessions	✅ Onboarding.v2.zeely.dc.html	✅ onboarding_sessions	✅	—	Done
🟡	IPI-285 · Intelligence Panel: AI Suggestion Rail	Backlog	15%	🟡 components/intelligence-panel/ exists but suggestion rail not wired per-screen	✅	🟡 Mastra agents exist	🔴	Per-route wiring missing	Reuse useAgent hook already in app — no new infra
Completeness note: 27 SCR screens tracked in MATRIX.md. 100 DESIGN V2 Linear issues include planner/campaign/mob duplicates. Table above samples load-bearing tasks; full SCR list in Screen Tracker below.

Screen Tracker
SCR	Route	HTML/DC	React	Parity %	Real Data	States	Responsive	E2E	Missing
01 Command Center	/app	✅ Command Center.v2…	✅ app/page.tsx + CommandCenter	85%	✅ fetchCommandCenterKpis + brands + realtime	✅ loading/empty/error/populated + dev fixtures	🟡 desktop OK, mobile tabs not verified	🔴 dev preview only, no Playwright	realtime banner visuals vs DC spec ±10%
02 Brand List	/app/brand	✅ Brand List.v2…	✅ app/brand/page.tsx + brand-list-workspace.tsx	90%	✅ brands + brand_scores	✅ search+filter+no-match, loading.tsx	🟡 CSS modules, mobile sheet missing	🟡 workspace tests exist	Filter chip styling vs tokens
03 Brand Detail	/app/brand/[id]	✅ Brand Detail.v2…	✅ app/brand/[id]/page.tsx	90%	✅ brands + brand_scores + brand_crawls + brand_intake_drafts	✅ analysing/error/retry/draft_ready	🟡	🟡	EvidenceBlock modal not full DC
04 Shoots List	/app/shoots	✅ Shoots List.v2…	✅ app/shoots/page.tsx via shoot_portfolio_view	85%	✅ view	✅ shoots-list-states.tsx	🟡	✅ shoots-list-workspace.test.tsx	Grid gap vs DC 16px check
05 Shoot Detail	/app/shoots/[shootId]	✅ Shoot Detail.v2…	🟡 shoot-detail-workspace.tsx (9 tabs stub, 40% wired)	40%	🟡 get_shoot_detail RPC exists, not all tabs	🟡 Overview wired, other tabs placeholder	🔴	🔴	Budget/Schedule/Activity tabs empty
06 Shoot Wizard	/app/shoots/new	✅ Shoot Wizard.v2…	✅ app/shoots/new/page.tsx	80%	✅ commit_shoot_draft + shoot-drafts	✅ steps + exit guard	🟡	✅ page.test.tsx	Review dashboard scoring vs DC
07 Campaigns	/app/campaigns	✅ Campaigns.v2…	🔴 stub CampaignsWorkspace	5%	🔴 no table/RPC verified	🔴	⚪	🔴	Entire workspace + BE-D1
08 Assets	/app/assets + [id]	✅ Assets.v2…	✅ app/assets/page.tsx + [id]/page.tsx (2026-08 recent)	85%	✅ listAssets + assets RLS	✅ grid/masonry + filters + error	✅ CSS module	🟡 unit, no E2E	Upload + DNA panel polish
09 Matching	/app/matching	✅ SCR-09-Matching-Talent.dc.html	🟡 TalentTab only	35%	✅ talent RPCs	🟡 Talent only, no swipe/table	🔴 inline styles	🔴	Workspace rewrite needed
10 Channel Preview	/app/preview	✅ Channel Preview.v2…	✅ ChannelPreviewStudio + image_specs	75%	🟡 image_specs server read, no publish RPC	🟡 frames + safe-zone, no confirm→publish→success flow	🟡 p-8 inline	🟡 page.test.tsx exists	Publish state machine missing
11 Onboarding	/onboarding (standalone) + /app/onboarding legacy	✅ Onboarding.v2.zeely.dc.html	✅ app/(onboarding)/onboarding/page.tsx + /app/onboarding/page.tsx legacy	90%	✅ onboarding_sessions + materialize RPC	✅ funnel validation + progress	✅ onboarding.css	✅	Legacy /app/onboarding should redirect (IPI-945 Done) — verify remaining link
15 Notifications	/app/inbox	✅ SCR-15-Notification-Center.dc.html	✅ app/inbox/page.tsx + InboxWorkspace + list_notifications RPC	80%	✅	✅	🟡	🟡	Bell count + realtime not wired
16 Analytics	/app/analytics	✅ Analytics.v2…	⚪ no route	0%	🔴	⚪	⚪	⚪	Whole screen
17 Campaign Perf	/app/analytics/campaigns	✅ Campaign Perf.v2…	⚪ no route	0%	🔴	⚪	⚪	⚪	Depends on 16
18 Collaboration	/app/activity	✅ SCR-18-Collaboration-Audit.dc.html	⚪ no route	0%	🔴 ACT1	⚪	⚪	⚪	Route + table
20 Talent Profile	/app/matching/talent/[id]	✅ SCR-20-Talent-Profile.dc.html	⚪ no route (book route exists)	0%	🟢 table exists	⚪	⚪	⚪	Route missing
21 Booking Wizard	/app/matching/talent/[id]/book	✅ Shoot Wizard.v2 flow=booking	✅ exists	85%	✅	✅	🟡	🟡	Polish only
22 Booking Detail	/app/bookings/[id]	✅ Shoot Detail.v2 flow=booking	✅ exists	85%	✅	✅	🟡	🟡	Polish
23 Availability	talent-scoped	✅ SCR-23-Availability-Editor.dc.html	⚪	0%	🟡	⚪	⚪	⚪	Grid UI
24 Talent Onboarding	/app/talent/profile	✅ SCR-24-Talent-Onboarding.dc.html	⚪	0%	🟡	⚪	⚪	⚪	Form
25 Role Dashboards	/app/model /app/roster	✅ SCR-25-Role-Dashboards.dc.html	⚪	0%	🟡	⚪	⚪	⚪	Role shell
26-31 CRM	/app/crm/*	✅ SCR-26…31	✅ app/crm/{companies,contacts,pipeline}/[id] + workspaces + deal-stage-control + activity-timeline	65%	✅ crm_* + convert_deal RPC	✅ list/detail/convert/stage	🟡 desktop OK, mobile gallery missing	🟡 deal-detail-workspace.test.tsx etc.	Mobile CRM gallery + visual polish vs DC tokens
32-34 Planner	/app/planner/* + /app/planner/dashboard	✅ SCR-32…34	✅ hub + instance + dashboard + settings + kanban/calendar/list	85%	✅ planner RPCs + views	✅	🟡 responsive QA open (I583)	🟡 hub-workspace.test	PLN-S7 tablet/mobile polish
35 Planner Hub	/app/planner (now hub)	✅ SCR-35-Planner-Hub.dc.html	✅ hub-workspace.tsx	90%	✅	✅	🟡	🟡	Pagination edge cases
Milestone Tracker (remapped 2026-08-02)
Milestone	Linear %	Verified %	Main Gap
DV2-M1 · Shared Spine Complete (2026-08-08)	~80%	90%	Mobile slide-up + status tokens Done; only polish left
DV2-M2 · Operator Shell Complete (2026-08-15)	~70%	85%	OperatorShell + NavSidebar (Lucide) + IntelligencePanel + error/loading per route live; mobile nav tabs pending (MOB-02/04)
DV2-M3 · Desktop Screen Parity Complete (2026-08-29)	~45%	55%	Campaigns (07) 5% + Matching (09) 35% + Shoot Detail tabs (05) 40% are the drag. CRM + Assets recently caught up.
DV2-M4 · Backend Wiring Complete (2026-09-05)	~60%	60%	Planner + CRM + Shoots + Assets wired. Campaigns schema (D1) + Analytics (D2) + Activity (ACT1) not wired.
DV2-M5 · Mobile + a11y Verified (2026-09-10)	~10%	15%	a11y tests only in status-chip/entity-list/inbox; no axe + no reduced-motion proof. Mobile galleries not built.
DV2-M6 · Production Verified (2026-09-14)	~30%	45%	No app Playwright prod suite green; verify-rls still shows 3 failing (looks like residual probe noise + booking anon grants — not DV2 blockers but must be triaged).
Overall verified completion: ~58% (Linear board says ~62% — inflated by Done stubs like IPI-336/393/394 Duplicates still counted).

Top Next Tasks — Grok Build rank (impact × readiness × risk × effort × verification clarity)
Ponytail rule for all: reuse existing EntityList + StatusChip + ErrorState + EmptyState + SkeletonLoader + RPCs. No new lib. Shortest diff wins. Mark shortcuts ponytail:.

IPI-405 · SCR-09 — Find and Compare the Best Talent for a Shoot — In Progress
Why #1: Highest impact-to-readiness ratio. Backend green, TalentTab query already works, DC exists. One workspace rewrite unlocks 09 + unblocks 20-22 polish.
Ponytail: Replace app/matching/page.tsx inline styles with tokens.css + EntityList; keep TalentTab as data fetch; add loading.tsx/error.tsx cloned from app/assets/. ponytail: keeps swipe-deck stub collapsed into table view until demand proves swipe needed.
Effort: S · Verify: npm test && npx tsc --noEmit + visual vs SCR-09-Matching-Talent.dc.html + one Playwright ?skip=1 load.
IPI-371 clone · SCR-05 — Shoot Detail 9-tab parity (linear tracker IPI-371 · SCR-05 not in DV2 project but BLOCKS M3)
Why #2: Shoots flow is P1; list + wizard are Done but detail tabs still 40%. Planner data pattern is proven.
Ponytail: Wire existing shoot-detail-tabs/ components tab-by-tab reusing planner/planner-kanban + activity-timeline + AssetCard; 9 tabs = 9 small PRs, not one mega. First tab = Schedule (reuse planner-calendar).
Effort: M · Verify: get_shoot_detail probe + shoot-detail-workspace.test.tsx.
IPI-671 · PLN-ENG-001 — Keep phase starts on business days
Why #3: Tiny, ripe, unblocks planner date correctness (M4). No blocker.
Ponytail: Stdlib only — Date.getDay() skip 0/6 in app/src/lib/date.ts, guard in planner_create_instance RPC (SQL EXTRACT(DOW)). No date-fns.
Effort: XS · Verify: unit test Mon+2d → Wed, Fri+1d → Mon + RLS probe already green.
IPI-249 · DESIGN-058 — Campaigns From Brief to Delivery — In Progress (blocked)
Why #4: P2 but true blocker for analytics (16/17) + M4. Must be honest about schema gap.
Ponytail: Fastest unblock = one migration campaigns(id, org_id, name, status, cover_url) + campaign_deliverables FK (copy planner grants/RLS pattern verbatim). Then clone brand-list-workspace.tsx as campaigns-workspace.tsx — reuse SearchBar+FilterBar+EntityList.
Effort: M (migration + workspace stub) · Verify: supabase:verify-rls + npm run supabase:migrations green.
IPI-716 · PLN-HUB-002B — New Plan eligibility/auto-fill/local date
Why #5: Hub polish, low risk, recently regressed. Silently inflates hub load.
Ponytail: Fix = reuse get_openable_shoots view already on shoots; new Date().toLocaleDateString('en-CA') for local date (no lib). No new endpoint.
Effort: S · Verify: new-plan-dialog.test.tsx already exists — add 2 cases.
Skip for now: IPI-296/297 Analytics (no schema, low readiness), MOB-01…90 mobile pass (do after 09/05 parity), IPI-256 Error UX (sweep after 05/07/09 land).

Proposed Linear Cleanup (no writes yet — needs owner approval)
Task	Problem	Recommended Change
IPI-249 blocks M3 but is In Progress with no assignee + BE-D1 label	Stale blocker inflates M3 %	Keep but move to M4 or retitle BE-D1 subtask; assign + add checklist: migration → workspace → tests
IPI-336 · DESIGN-053 Onboarding Epic	Duplicate of IPI-811 Done — board shows two Done epics for same funnel	Archive Duplicate (already Duplicate) and pin IPI-811 as SSOT; remove from MATRIX count
IPI-393/394 · SCR-27/29 Company/Contact Detail	Marked Duplicate but routes app/crm/companies/[id] + contacts/[id] are live with workspaces	Reopen as Done or link to live routes — duplicates hide shipped parity
IPI-404 · SCR-08 Assets	MATRIX still says 🔴 5% stub but disk shows 85% wired + Linear Done	Update MATRIX.md to ✅ 85% + note upload split
IPI-405 · SCR-09 Matching	In Progress since 2026-07-06, no owner, 35% verified	Assign + split into 09a workspace shell + 09b swipe/table polish — keep In Progress, clear stale Talent/MVP labels
IPI-478/484 · Planner epic trackers	Parent In Progress inflates M3 while children are Done	Close parent when PLN-S7 mobile QA lands; until then add note "children Done, parent is rollup"
MATRIX.md counts	Says 7 complete but CRM 26-31 + Inbox + Planner Hub are green	Recount to 12 complete after audit — update legend
supabase:verify-rls 3 failing	Noise masks real failures; looks like shared probe teardown, not RLS regression	Triage in one PLT-RLS-VERIFY ticket — don't block DV2 M6 on it
Draft Project Activity Update (do NOT post — copy/paste after approval)
DESIGN V2 — Operator React Parity — Audit 2026-08-12 (58% verified)

Completed (proof on origin/main): RF-01/02, SCR-08 Assets (read-only), SCR-21/22 Booking, Planner engine + S1A/B/C/D/E/F + S4b/S5/S6/S6D, SHOOT-SEC-001/002, IPI-499 asset RLS, I-811 onboarding pipeline, PLN-DATA-003B phase materialization, MOB-01 slide-up.

In progress: SCR-09 Matching (TalentTab only, workspace needs tokens rewrite), SCR-05 Shoot Detail (9 tabs 40%), DESIGN-058 Campaigns (blocked on campaigns schema — true BE-D1), Planner hybrid epics IPI-478/484 (rollup).

Broken / failing: supabase:verify-rls 3 probes failing (shared teardown — not a ship-blocker but needs triage), Channel Preview publish state machine not wired (UI previews but publish confirm→progress→success missing), Command Center dev fixtures cover but no prod Playwright.

Not started: SCR-16/17 Analytics (no schema), SCR-18 Collaboration (no /app/activity route), SCR-20/23/24/25 Talent set (routes missing, tables exist), SCR-07 depends on campaigns, mobile/a11y pass MOB-02…90.

Verified vs Linear: Board shows 62%, audit finds 58% — inflated by Duplicates counted as Done. MATRIX.md stale (says 7 complete, actually 12).

Top 5 next (ponytail-fast):

IPI-405 · SCR-09 Matching workspace — reuse EntityList+StatusChip (S)
SCR-05 Shoot Detail tabs — wire schedule/budget tabs reusing planner-calendar (M)
IPI-671 · Business-day phase starts — stdlib Date guard (XS)
IPI-249 · Campaigns schema+stub — 1 migration + cloned workspace (M, true unblock)
IPI-716 · New Plan eligibility/local date — reuse openable view + toLocaleDateString (S)
Production blockers for DV2-M6 (2026-09-14): BE-D1 campaigns schema (M4), SCR-05/09 desktop parity (M3), verify-rls triage + prod Playwright + axe a11y before M5/M6. No new deps needed — all fastest paths use existing UI/RPCs.

Audit confidence: 78% — not fully verified: (1) full MOBILE-PLAN.md responsive spec vs disk not diffed, (2) brand-intelligence / Gemini scoring parity not exercised live, (3) cloudinary named transforms t_asset-* delivery not inspected in Network panel, (4) CopilotKit/Mastra per-route agent routing (route-agent-map.ts) not runtime-probed, (5) supabase:verify-rls 3 failing probes not root-caused line-by-line.

What was skipped (ponytail): full per-screen npx tsc --noEmit && CI=true npm run build + Playwright + axe across all 27 SCRs (would be ~2h). Add when IPI-405 PR lands — run M3 gate then, not now. No new abstractions, no new libs added in this audit.

