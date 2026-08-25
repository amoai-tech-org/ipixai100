# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

# explain
- **explain** (`.claude/commands/explain.md`) — plain-English explanations. Trigger: `/explain`
Always-on voice: `.cursor/rules/explain.mdc` and `AGENTS.md`. When the user types `/explain`, follow that command (explain-only, do not change code). Every other reply still uses the always-on rule: analogy, no unexplained jargon, gist first.

# fastest
- **fastest** (`.claude/commands/fastest.md`) — vendor path before custom code. Trigger: `/fastest`
Always-on ladder: `.cursor/rules/fastest.mdc`. Before **each** task step, ask if a better/faster path exists and **use it**. When the user types `/fastest`, research only (no edits/commits). Prefer skip → reuse → managed/CLI/SDK → custom last. In-repo reuse details stay in `ponytail.mdc`.
