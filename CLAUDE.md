# CLAUDE.md

## Secrets / Infisical

Follow the repository-wide secret policy in `AGENTS.md`.

For this repo:
- Infisical config: `.infisical.json` (repo root)
- Run secret-dependent commands with:
  `infisical run --env=dev -- <command>`
- No Infisical session? Fall back to a local `.env` (never commit it)
- Do not read `.env` when Infisical is available.
- Never print secret values.
- Presence checks may output only variable name + `✅/❌`.
- If a required variable is missing, report only its name and stop.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
