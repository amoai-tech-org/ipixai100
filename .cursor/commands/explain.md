---
description: "Explain anything — code, a PR, an error, a decision, a concept — in plain English with a real-world analogy and a concrete example. No jargon."
argument-hint: "<thing to explain> [--eli5 | --dev] [--short]"
---

# /explain — make it easy to understand

Follow `.claude/commands/explain.md` as the full command. Always-on voice: `.cursor/rules/explain.mdc`.

**Arguments:** `$ARGUMENTS` — a concept, file/function, PR (`#235`), error, Linear issue, config, or "what you just did". Flags: `--eli5` · `--dev` · `--short`. Default audience: a smart non-specialist.

**Explain-only — do not change code.** Ground in the real file/PR/issue before writing. Shape:

1. **The gist** (one sentence)
2. **Think of it like** (everyday analogy)
3. **How it actually works** (concrete steps)
4. **A real example**
5. **Why it matters** + **one-line takeaway**
