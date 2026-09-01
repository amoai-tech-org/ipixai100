---
description: "Find the fastest verified way to complete a task — managed feature → CLI/SDK → official repo → custom, before writing code."
argument-hint: "<IPI-XXX|task name|description>"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "WebFetch", "WebSearch", "Task"]
---

# /fastest — Find the Fastest Verified Way to Complete a Task

**Arguments:** `$ARGUMENTS` — Linear issue (`IPI-407`), task name, or free-text description.

**Principle:** Read-only research. Analyze the selected task and find the most efficient, verified implementation path **before writing any code**. Do not implement until the efficient path is verified — this command never edits files or commits.

Always-on: `.cursor/rules/verified-fast-path.mdc` (verify the evidence required by the selected rung; native vendor before old iPix/Lumina or custom) and `.cursor/rules/fastest.mdc` (if a faster path exists **without weakening evidence**, use it). This command is the full research table — **no edits**. In-repo smallest diff: `.cursor/rules/ponytail.mdc`.

---

## Instructions

1. Run `PATH="$HOME/.local/bin:$PATH" graphify query "<task topic>"` before any Read, Grep, Glob, or Bash exploration of the codebase.
2. Read the full task, acceptance criteria, blockers, and linked PRs. Use the full name: **`IPI-NNN · SPEC — Title`**.
3. Then inspect the current codebase to avoid rebuilding existing work.
4. Load the relevant project skills and repository instructions (`AGENTS.md`, `CLAUDE.md`, matching skill from `.claude/skills/`).
5. Verify live platform state using available MCPs, CLIs, and dashboards (Linear, Vercel, Supabase **preview only**, Mastra docs MCP, CopilotKit docs MCP). Do **not** mutate production Supabase.
6. Fetch **current official documentation only** (Context7 / vendor MCP / vendor docs). No blogs when official docs exist.
7. Search official GitHub organizations for:
   - maintained repositories
   - SDKs and packages
   - starter projects
   - examples
   - templates
   - tutorials
   - recipes
   - GitHub Actions, and relevant agent tooling (workflows, skills, subagents) worth suggesting alongside them
8. **Path selection is not defined here.** Stop at first fit using the canonical ladder in `.cursor/rules/verified-fast-path.mdc` only. Do not keep a second ordered path in this command.
9. Identify:
   - stale assumptions
   - duplicate work
   - existing reusable code
   - unnecessary custom code
   - blockers
   - security risks
   - failure points
   - missing tests
   - simpler alternatives
10. Do not implement until the efficient path is verified.
11. Keep the `SUPA` label whenever the task materially involves Supabase.

---

## Required output

Always use the full task name:

`IPI-XXX · TASK-ID — Full Task Name`

Return:

| Area | Finding |
| --- | --- |
| Current approach | |
| More efficient approach | |
| Managed/dashboard option | |
| Official CLI/SDK/package | |
| Official repo/example/recipe | |
| Existing code to reuse | |
| Custom code still required | |
| Errors and failure points | |
| Critical fixes | |
| Tests and verification | |
| Estimated effort saved | |
| Confidence | |

Finish with:

```text
Recommended path:
1.
2.
3.

Avoid:
-

Verdict: Proceed / Rewrite task / Split task / Park / Duplicate / Cancel
Efficiency score: XX/100
Implementation readiness: XX/100
```

Cite every external recommendation with an official source.

---

## Notes

- **Vendor vs in-repo:** `/fastest` answers "does a vendor/platform already solve this?" `ponytail.mdc` answers "what in this codebase can I extend?" Run both mentally; this command is the vendor pass.
- This repo is iPixai (git root, `src/`). Never `cd app`. Never combined `npm run dev` (**DEV-STAB-001**).
- Never edit, commit, or open a PR from this command — output research and a recommendation only.
