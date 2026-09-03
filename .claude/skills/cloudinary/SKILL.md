---
name: cloudinary
description: >
  Cloudinary media hub for iPixai — routes to official cloudinary-devs skills plus Node SDK
  patterns. Use whenever the user mentions Cloudinary, image/video upload, CDN delivery,
  transformation URLs, f_auto/q_auto, CldImage, CldUploadWidget, next-cloudinary, signed
  uploads, webhooks/DAM/MediaFlows, or fashion/product media. Prefer specialized official
  skills (cloudinary-next, cloudinary-transformations, cloudinary-docs, cloudinary-react)
  when the task matches; use this hub for routing and Node-only server work.
version: 3.1.0
metadata:
  priority: 2
---

# Cloudinary Skills Hub (iPixai)

**Source of truth for SDK patterns:** official [cloudinary-devs/skills](https://github.com/cloudinary-devs/skills) installed **in this repo** (copied, not symlinked to old iPix):

| Official skill | Path |
|----------------|------|
| `cloudinary-docs` | `.claude/skills/cloudinary-docs/` (+ `.agents/skills/`) |
| `cloudinary-next` | `.claude/skills/cloudinary-next/` |
| `cloudinary-react` | `.claude/skills/cloudinary-react/` |
| `cloudinary-transformations` | `.claude/skills/cloudinary-transformations/` |

**Also:** plugin-cloudinary MCP for live account ops. Tracker: `docs/cloudinary/todo.md`. App code: `src/` (not old `app/`).

Do **not** paste whole reference trees into context. Load only the skill + files needed for the task.

---

## Routing

| User intent | Load |
|-------------|------|
| Docs / webhooks / DAM / MediaFlows / llms.txt | **`cloudinary-docs`** |
| Next.js / `next-cloudinary` / `CldImage` / Upload Widget / signed upload routes | **`cloudinary-next`** |
| Transformation URL syntax / `f_auto` / named transforms | **`cloudinary-transformations`** |
| Legacy React / Vite / `@cloudinary/react` | **`cloudinary-react`** |
| Node Admin/upload API dumps (not in official package) | [`references/node/node.md`](references/node/node.md) |

### Priority

1. Official specialized skill matching the task  
2. `cloudinary-docs` alongside when the use-case spills outside that skill  
3. Hub `references/node/` for Node Admin/upload dumps only  
4. MCP for live cloud/transform/preset inspection  

### Don't use this hub for

- Supabase Storage → `ipix-supabase`  
- AI image generation → provider / edge skills  
- Generic UI without Cloudinary → design/frontend skills  

---

## How to use

1. Classify the task → open the matching **official** skill `SKILL.md`.  
2. Load only the reference files that skill points at.  
3. Cross-check critical APIs against installed `cloudinary` / `next-cloudinary` types + MCP.  
4. Prefer named transforms + eager derivatives for authenticated delivery (see `docs/cloudinary/todo.md` contracts).

## Update

```bash
npx skills add cloudinary-devs/skills --skill '*' --agent cursor --agent claude-code --copy -y
```

Keep `--copy` so files live under `/home/sk/ipixai` (no pointer to `/home/sk/ipix`).
