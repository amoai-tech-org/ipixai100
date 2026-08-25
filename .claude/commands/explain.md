---
description: "Explain anything — code, a PR, an error, a decision, a concept — in plain English with a real-world analogy and a concrete example. No jargon."
argument-hint: "<thing to explain> [--eli5 | --dev] [--short]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# /explain — make it easy to understand

**Arguments:** `$ARGUMENTS` — what to explain: a concept, a file/function, a PR (`#235`), an error message, a Linear issue (`IPI-387`), a config, or "what you just did". Flags: `--eli5` (simplest possible), `--dev` (peer engineer, still plain), `--short` (one-screen answer). Default audience: **a smart person who isn't a specialist in this** (a stakeholder / PM / new teammate).

**Goal:** the reader *gets it* on the first read — no re-reading, no glossary, no bluffing.

Always-on companion: `.cursor/rules/explain.mdc` (every reply). This command is the full, grounded write-up.

---

## The rules (what "easy to understand" means here)

1. **Analogy first.** Open with a real-world comparison the reader already understands (an address book, LEGO bricks, a receipt, a bouncer at a door). Then map it to the actual thing.
2. **No unexplained jargon.** If a technical term is unavoidable, define it inline in 4–6 words the first time: *"RLS (the database's own per-row permission check)"*. Never assume the acronym.
3. **Concrete over abstract.** Use real values from the actual code/data, not placeholders. "8 of 10 shoots have a cover" beats "some records have the field".
4. **Big picture → then detail.** Lead with the one-sentence "what and why". Only then unpack how. A reader who stops after paragraph one should still have the gist.
5. **Show the shape.** A tiny table, a 3-line before/after, or an arrow diagram beats a paragraph when structure matters.
6. **Say why it matters.** End with the consequence in the reader's terms — what breaks without it, what it unlocks, what they can now do.
7. **Be honest.** Name the caveat, the risk, or the thing that's still unproven. "Easy to understand" never means "smoothed over".
8. **Right-size.** `--eli5` → no tech terms at all, kitchen-table language. `--dev` → precise but still analogy-led. `--short` → skip to Big picture + Why-it-matters + one-line takeaway.

---

## Workflow

1. **Ground it in reality first — don't explain from memory.** Look at the actual thing before describing it:
   - code / file → `PATH="$HOME/.local/bin:$PATH" graphify query "<concept>"` first if it spans files, then `Read`
   - PR → `gh pr view <N> --json title,body,files` + `gh pr diff <N>`
   - error → read the failing line + surrounding code
   - Linear issue → Linear MCP `get_issue` (full title, never a bare ID)
   - live data claim → probe it (preview / `mastra_preview` only — never production writes), never guess
2. **Find the everyday analogy** that matches the *behavior*, not just the surface.
3. **Write it in this shape** (drop sections that don't apply; obey `--short`):

```markdown
## <thing> — in plain terms

**The gist:** <one sentence — what it is and why it exists>.

**Think of it like:** <real-world analogy>. <how the analogy maps>.

**How it actually works:**
- <step / part 1 — concrete>
- <step / part 2>
(a 3-line before→after or arrow diagram if it clarifies)

**A real example:** <walk one actual case through, using real values>.

**Why it matters:** <consequence in the reader's terms — what breaks without it / what it unlocks>.

**One-line takeaway:** <the sentence they'd repeat to someone else>.
```

4. **Re-read as the audience.** Any sentence that needs a glossary → rewrite it. If the explanation is longer than it needs to be, cut.

---

## Guardrails

- **Explain-only — never change code** from this command. If the reader then wants a fix, hand off to `/pr fix` or normal editing.
- **Accuracy beats simplicity.** A simple-but-wrong explanation is worse than none. If a check is needed to be sure, run it — don't hand-wave. Label **NOT VERIFIED** when you did not check.
- This repo is iPixai (CopilotKit + Mastra at the git root). Never `cd app`. Never combined `npm run dev`. Never mutate production Supabase.
- Sensitive/serious topic → keep the analogy sober, not cute.

---

## Worked example — `/explain makeMemoryResourceId`

> **The gist:** a naming rule that stamps every chat memory with *who* and *which org*, so two operators never share the same history drawer.
>
> **Think of it like:** hotel room keys. Same hallway (the memory store), but your key only opens your room — not the guest next door's. The function is the machine that cuts the key from "this signed-in person + this org".
>
> **Why the key-cutter exists:** if every chat used the same label (`"default"`), Org B could walk into Org A's Production Planner thread after a refresh. The stamp is what keeps tenant history apart.
>
> **A real example:** operator `user-abc` in org `org-ss26` gets a resource id like `org-ss26:user-abc`. Refresh keeps the SS26 shot-list chat. A different org's JWT cannot open that drawer.
>
> **One-line takeaway:** it's the difference between "everyone shares one notebook" and "each org has its own locked notebook".

```text
/explain #246                 # a PR, for a stakeholder
/explain --eli5 "what is RLS" # kitchen-table simple
/explain --dev PostgresStore resourceId   # precise, peer-level
/explain --short what you just did
```
