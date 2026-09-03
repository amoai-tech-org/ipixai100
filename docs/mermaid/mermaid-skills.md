# Mermaid skills — which one to use

**The gist:** Cookbook + printer are both in place. The cookbook now tells the agent to use mcp-mermaid for pictures. Do not install another kitchen.

**Think of it like:** Mermaid is a **recipe** (text). GitHub cooks it when it sees the recipe. A **skill** is the cookbook. **MCP** is a printer in Cursor chat.

| We already have | Job |
|-----------------|-----|
| `mermaid-diagrams` skill | Writes the recipe |
| [mcp-mermaid](https://github.com/hustcc/mcp-mermaid) | Prints a picture in this chat |

---

## Decision

| Do | Don’t |
|----|--------|
| Keep both of the above | Install ten more cookbooks |
| Skill already says: picture → mcp-mermaid | Copy [Agents365](https://github.com/Agents365-ai/mermaid-skill) as a second skill |
| Add Agents365 **only** if we must save PNG/PDF files on disk | Send diagrams to Kroki (their online checker) by default — it leaves the machine |

---

## Scoreboard (our grades /100)

Not vendor ratings. Counts from [skills.sh](https://www.skills.sh/?q=mermaid) / GitHub on **2026-09-02**.

| # | /100 | Name | In one sentence | Link |
|--:|-----:|------|-----------------|------|
| 1 | 86 | Agents365 | Recipe → check → save PNG/SVG/PDF | [GitHub](https://github.com/Agents365-ai/mermaid-skill) |
| 2 | 84 | Pretty Mermaid | Pretty SVG/PNG/ASCII, no Chrome | [GitHub](https://github.com/imxv/Pretty-mermaid-skills) |
| 3 | 82 | mcp-mermaid | Chat printer — **already on** | [GitHub](https://github.com/hustcc/mcp-mermaid) |
| 4 | 78 | WH-2099 | 23 recipe types, no picture | [GitHub](https://github.com/WH-2099/mermaid-skill) |
| 5 | 76 | softaworks | Same job as our skill | [skills.sh](https://www.skills.sh/softaworks/agent-toolkit/mermaid-diagrams) |
| 6 | 74 | PM utility | Which chart for a spec | [skills.sh](https://www.skills.sh/product-on-purpose/pm-skills/utility-mermaid-diagrams) |
| 7 | 70 | markdown-viewer | Stops GitHub breaking on `[1. Item]` | [skills.sh](https://www.skills.sh/markdown-viewer/skills/mermaid) |
| 8 | 68 | ccheney | Syntax for Mermaid v11.16 | [skills.sh](https://www.skills.sh/ccheney/robust-skills/mermaid-diagrams) |
| 9 | 67 | moai | Many types + Playwright pictures | [skills.sh](https://www.skills.sh/modu-ai/moai-adk/moai-library-mermaid) |
| 10 | 62 | patricio | Thin flowchart helper | [skills.sh](https://www.skills.sh/patricio0312rev/skills/mermaid-diagram-generator) |

---

## Pick by job

| You want | Example | Use |
|----------|---------|-----|
| Picture in this chat | Operator → CopilotKit → Planner | mcp-mermaid |
| Recipe in a git doc | Brand has many shoots | **Our** skill |
| PNG file in a PR | Services + databases | Agents365 (only then) |
| Dark SVG for README | `dev:ui` vs `dev:agent` | Pretty Mermaid |
| Odd type (kanban, radar) | — | WH-2099 |
| Spec for a PM | Launch timeline | PM utility |

---

## Ours vs Agents365

Ours tells the agent **which recipe**. Agents365 also **saves a photo of the plate**.

We already have a printer. So: **edit our cookbook**, don’t hire their kitchen.

| Broken in ours today | Status |
|----------------------|--------|
| Skill never says “use mcp-mermaid” | **Done** — workflow step 3 |
| git graph / pie promised, no cheat sheets | **Done** — `references/git-graph.md`, `pie-charts.md` |
| Cloud layout file exists, not in the menu | **Done** — `architecture-beta` in picker |
| Old FashionOS-era paths (`tasks/mermaid/`, `graph TD`) | **Done** — `docs/mermaid/`, `flowchart`; brand is **iPix** / [ipix.co](https://ipix.co) |

**Do not add:** a second mermaid skill, Kroki as default, “must use Chrome to look at the PNG.”

**Keep (Agents365 doesn’t have this):** org / brand / shoot names, CopilotKit + Planner examples.

---

## Install (only if we add something later)

| | |
|--|--|
| Agents365 | `npx skills add Agents365-ai/365-skills -g` |
| Pretty | `npx skills add imxv/pretty-mermaid-skills@pretty-mermaid -g -y` |
| mcp-mermaid | already in `~/.cursor/mcp.json` |
| Catalog | https://www.skills.sh/?q=mermaid |
