---
title: Mastra evals and human feedback
description: Load when verifying agent quality, regression behavior, multi-turn conversations, or collecting human feedback.
parent: mastra
impact: HIGH
---

# Evals and feedback

Installed `@mastra/core 1.63.2` includes embedded docs for `runEvals`, gates/verdicts, multi-turn evals, CI usage, scorers, and observability feedback. Use installed docs/types before remote examples.

## What to use

| Need | Prefer |
| --- | --- |
| Deterministic behavior proof | Gates / quick checks: tool called, output contains/excludes, no error |
| Non-deterministic quality | Scorers with explicit thresholds |
| One pass/fail result | `runEvals()` verdict |
| Conversation quality | Multi-turn evals |
| CI regression gate | Mastra evals inside the existing test runner; current docs include Vitest integration |
| Real operator/user signal | Observability feedback anchored to thread/trace/span |

## iPix use

For Planner and Brand Intelligence, combine deterministic gates for required tools/approval behavior with scorers for quality. Treat human feedback as learning evidence, not automatic permission to mutate prompts, policies, or Brand Brain truth.

Cheapest proof first: pure/unit assertions → targeted Mastra eval → integration → E2E. Do not call an AI scorer when a deterministic assertion can prove the requirement.
