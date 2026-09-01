---
title: Mastra core concepts
description: Load when choosing agent vs workflow vs tool vs memory vs storage.
parent: mastra
impact: HIGH
impactDescription: Pick the right Mastra primitive before coding
tags: mastra, agents, workflows, tools, memory, storage
source: https://github.com/mastra-ai/skills/blob/main/skills/mastra/references/core-concepts.md
---

# Core Concepts Reference

Upstream: [mastra-ai/skills `core-concepts.md`](https://github.com/mastra-ai/skills/blob/main/skills/mastra/references/core-concepts.md) (skill 2.1.0).

Use this when deciding which Mastra primitive to use or when explaining the high-level shape of a Mastra application.

## Agents vs workflows

Agent: Autonomous, makes decisions, uses tools.
Use for open-ended tasks such as support, research, analysis, and tool-using assistants.

Workflow: Structured sequence of steps.
Use for defined processes such as pipelines, approvals, ETL, multi-step business logic, and resumable processes.

## Key components

- Tools: Extend agent capabilities through APIs, databases, external services, and deterministic functions.
- Memory: Maintain context through message history, working memory, semantic recall, and observational memory.
- Storage: Persist data with providers such as Postgres, LibSQL, and MongoDB.

## iPixai

- First agent is **Production Planner** (`production-planner`, plus `default` alias).
- Tools stay **compute-only** until HITL RPCs; domain writes go through SECURITY DEFINER RPCs + user JWT.
- Storage on the real path is **PostgresStore** (`schemaName: "mastra"`, `disableInit: true` except disposable preview). Do not add LibSQL on the prod path.
