# IPI-1042 runtime family (pin only)

Canonical GitHub: [amoai-tech/ipixai](https://github.com/amoai-tech/ipixai) (same SSOT as `AGENTS.md`).

`@mastra/memory` is declared as exact `1.26.1` (no `^`). That is the first official release that includes Mastra PR #21120 (drops `image-size`). Docker builds copy `package-lock.json` and run `npm ci` so they cannot float to a later 1.x.

This ticket **installs** `@mastra/pg`. It does **not** construct `PostgresStore`. Runtime storage stays `new LibSQLStore({ id: "mastra-storage", url: ":memory:" })`. Agent memory stays `new LibSQLStore({ id: "weather-agent-memory", url: "file::memory:" })`. Wiring Postgres is IPI-1043 / IPI-1044.

## Why not `@mastra/pg@1.13.0`

`1.13.0` **installs** on `@mastra/core@1.41.0` (peer is still `>=1.34 <2`) but **does not load**. Its `dist/index.js` named-imports `mergeWorkflowStepResult` from `@mastra/core/storage`. That export exists in Core **1.42+**, not 1.41.0. Repro: `import("@mastra/pg")` throws `SyntaxError: '@mastra/core/storage' does not provide an export named 'mergeWorkflowStepResult'`. No Postgres is involved. Peer MATCH ≠ load MATCH. `1.13.2+` peers require Core `>=1.42.1` — do not use on 1.41.

## Why not `@mastra/pg@1.21.1`

npm `@mastra/pg@1.21.1` peers `@mastra/core >= 1.53.0-0 < 2`. Installing that onto `@mastra/core@1.41.0` is an invalid tree.

## Why not bump the whole Mastra family to 1.53

That would force `@mastra/core`, `@mastra/memory`, `@mastra/libsql`, and `mastra` CLI off the CopilotKit starter pin. IPI-1042 asks for the fewest version changes. CopilotKit stays `1.68.1`.

## Chosen family

| Package | Version | Role |
| --- | --- | --- |
| `@copilotkit/react-core` | 1.68.1 | CopilotKit React (unchanged) |
| `@copilotkit/runtime` | 1.68.1 | CopilotKit runtime (unchanged) |
| `@ag-ui/client` | 0.0.58 | AG-UI client (unchanged override) |
| `@ag-ui/mastra` | 1.1.2 | AG-UI Mastra adapter (unchanged) |
| `@mastra/core` | 1.41.0 | Mastra core (unchanged) |
| `@mastra/memory` | **1.26.1** | Peer `@mastra/core >=1.4.1-0 <2` still covers 1.41.0. Smallest exact release with PR #21120 (no `image-size`). `1.18.0` typechecked but pulled a vulnerable `image-size`. |
| `@mastra/libsql` | 1.1.0-alpha.2 | Current storage (unchanged) |
| `@mastra/pg` | **1.12.1** | Exact pin. Built against Core 1.39; peer still covers 1.41; `dist` does **not** import `mergeWorkflowStepResult`. Loadable via `import("@mastra/pg")`. |
| `mastra` | 1.1.0-alpha.3 | CLI (unchanged) |
| `@ai-sdk/openai` | ^2.0.42 | AI SDK (unchanged) |

`@mastra/libsql` / `mastra` remain the starter alphas. `@mastra/memory` is the official 1.26.1 security pin, not an alpha.

## Compile scope

`Universal-design-prompt-4/**` is not imported by `src/**`. It is excluded from `tsconfig.json` so design-prompt TypeScript is not part of the app compile. `.claude` and `.cursor` skill assets are excluded for the same reason.

## Rollback

Revert `package.json`, `package-lock.json`, `tsconfig.json`, Vitest config/tests, and this file. Runtime stays on LibSQL.
