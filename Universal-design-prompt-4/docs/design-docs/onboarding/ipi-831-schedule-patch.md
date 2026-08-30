## Schedule — 2026-08-01 task-verifier refresh

Parent tracker only. **Do not open an implementation PR from this epic.**

### Verified current state — 2026-08-01

| Fact | Status |
| -- | -- |
| IPI-809 · SEC-ONB-001 tenant isolation | Done — do not reopen |
| IPI-833 · ONB2-UI-001 standalone `/onboarding` | Done on prod |
| IPI-837 · Google OAuth redirect | In Progress — PR #700; `main` still hardcodes `/app` |
| `onboarding_sessions` / materialize RPC | Absent — IPI-832 |
| Mastra DNA fail-closed | Still `{ ok: boolean }` — IPI-834 |
| Realtime publishes `brands` | No — IPI-835 |
| QA DB for Playwright | Rewrite Steps first — IPI-829 |
| Legacy `/app/onboarding` | Keep until IPI-836 green |

Audit: `tasks/design-docs/onboarding/task-verifier-audit-2026-08-01.md`

### Delivery graph — parallel then converge

```mermaid
flowchart TD
    SEC["IPI-809 SEC Done"]
    UI["IPI-833 UI Done"]
    OAUTH["IPI-837 OAuth PR 700"]
    DB["IPI-832 DB sessions RPC"]
    AI["IPI-834 DNA Mastra"]
    QA["IPI-829 QA DB rewrite first"]
    INT["IPI-835 Integration"]
    VER["IPI-836 Verify allowlist"]

    SEC --> VER
    UI --> OAUTH
    UI --> INT
    OAUTH -.->|preferred not hard for pub slice| INT
    DB --> INT
    AI --> INT
    INT --> VER
    QA --> VER
    QA -.->|nice for race only| DB
```

**Shared contract before parallel coding:** lock session/brand/crawl/draft IDs and `OnboardingSessionStatus = draft | materialized`. Do **not** invent a unified mega-status enum that mixes session + `brands.intake_status` + UI phases.

### Task sequence

```mermaid
sequenceDiagram
    participant L as Lanes parallel
    participant C as Contracts stable
    participant I as IPI-835 Integration
    participant V as IPI-836 Verify

    Note over L: Week of 2026-08-01
    L->>L: IPI-837 smoke merge PR 700
    L->>L: IPI-832 A migration then B module
    L->>L: IPI-834 schema plus Mastra fail-closed
    L->>L: IPI-829 rewrite Steps then QA env
    L->>C: IDs and status boundaries agreed
    C->>I: Wire session crawl Realtime approve
    I->>V: Happy path plus resume on QA
    V->>V: Server allowlist one prod brand ready
```

### Gantt — planned delivery window

Durations are planning estimates — adjust as PRs land.

```mermaid
gantt
    title ONB2 epic IPI-831 parallel then converge
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Done
    IPI-809 SEC tenant isolation           :done, sec, 2026-07-20, 2026-07-30
    IPI-833 UI standalone onboarding       :done, ui, 2026-07-22, 2026-07-30

    section Parallel now
    IPI-837 OAuth redirect PR 700          :active, crit, oauth, 2026-07-31, 3d
    IPI-832 DB sessions and materialize    :crit, db, 2026-08-01, 7d
    IPI-834 DNA Mastra contract            :ai, 2026-08-01, 7d
    IPI-829 QA DB rewrite then provision   :qa, 2026-08-01, 5d

    section Optional polish
    IPI-841 COMPONENTS.md docs             :doc, 2026-08-01, 2d
    IPI-840 hash sync polish               :hash, 2026-08-02, 2d
    IPI-843 mobile reduced-motion preview  :mob, 2026-08-04, 3d

    section Converge
    IPI-835 Integration Realtime approve   :crit, int, after db, 8d
    IPI-836 Playwright plus allowlist      :crit, ver, after int, 5d

    section Milestones
    Contracts stable 832 plus 834          :milestone, m1, after db, 0d
    Integration green                      :milestone, m2, after int, 0d
    Beta gate one brand ready              :milestone, m3, after ver, 0d
```

Note: IPI-835 also waits on IPI-834 finishing in the same week as IPI-832 — treat `after db` as the contracts-stable gate when both land.

### Implementation order

| Order | Issue | Can start? | Blocked by |
| -- | -- | -- | -- |
| Done | IPI-809 · SEC-ONB-001 | — | — |
| Done | IPI-833 · ONB2-UI-001 | — | — |
| Now parallel | IPI-837 · AUTH-OAUTH-001 | Finish smoke, merge #700 | 833 Done |
| Now parallel | IPI-832 · ONB2-DB-001 | Slices A/B; race C needs QA | Not hard-blocked by 829 |
| Now parallel | IPI-834 · ONB2-AI-001 | Yes | — |
| Now parallel | IPI-829 · ONB-QA-001 | After Steps rewrite — no fake migration repair | — |
| Then | IPI-835 · ONB2-INT-001 | After 832 + 834; 837 preferred | 832, 833, 834 |
| Last | IPI-836 · ONB2-VERIFY-001 | Scaffold early; complete last | 835, 829, 809 |
| Optional | IPI-840 / IPI-841 / IPI-843 | Anytime | Fold 843 into 836 |

**IPI-832 is not hard-blocked by IPI-829.** Tenant isolation is enforced at IPI-836.

---
