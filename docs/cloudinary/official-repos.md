# Official Cloudinary repos — adapt, don’t rebuild

**Execution order:** [roadmap.md](./roadmap.md) · **requirements:** [prd.md](./prd.md) · **tracker:** [todo.md](./todo.md). Dumps: [../archive/cloudinary/](../archive/cloudinary/).

**For:** iPixai V2 media (`docs/cloudinary/`).  
**Rule:** Console → CLI → MCP → Node SDK → next-cloudinary → examples → custom last.  
**Do not** `npx create-cloudinary-next` over this repo. **Do not** treat Cloudinary Search / Asset Management as the business database (that stays Supabase).

Inspect these GitHub trees **before** writing a new helper. Copy patterns and file names, then bind AUTH-002 org + RLS.

**Paste-on-ticket docs (≤5 per Linear issue):** [../links.md](../links.md) — Cloudinary section. This file is **GitHub / example folders** only.

---

## How to adapt (instead of custom code)

| Need | Adapt | Do not build |
| --- | --- | --- |
| Operator upload UI | `CldUploadWidget` + `signatureEndpoint` / `prepareUploadParams` | Custom dropzone, S3-style multipart, unsigned preset |
| Sign a browser upload | `cloudinary.utils.api_sign_request` in a Route Handler | Hand-rolled HMAC; Cloudflare Worker signer |
| Public / marketing image | `CldImage` | Using DAM signed URLs on the marketing site |
| Private / authenticated DAM | **Server signed-URL helper + named transforms** | Treating `CldImage` as the DAM security boundary |
| Webhook verify | `cloudinary.utils.verifyNotificationSignature` | Home-grown SHA unless SDK cannot cover EdDSA v2 |
| Delete | Node `uploader.destroy` + webhook archive | Dual delete UIs |
| Large files (later) | SDK `upload_large` / widget large upload | Custom chunk protocol |
| Admin list/search (later) | `asset-management-js` **ops only** | Replacing `listAssets` |
| Automation (later) | n8n Cloudinary node **or** MediaFlows | In-house job runner for “approve → tag → notify” |
| Fashion variants (later) | FashionistaAI **eager + poll** pattern | Sync GenAI in the request path |

**iPix adapters (the only custom layer):** trusted org, brand/shoot ownership, `200` after Supabase persist, exact-version approval. Everything else should be SDK/example/legacy COPY+CLEAN.

---

## Ranked for iPix (2026-08-31)

Scores: fit for Next.js + signed DAM + less custom code. **Runtime needs 1–3.** Ops: CLI + MCP. Reconcile: asset-management-js. Do not add `cloudinary_js` / `cloudinary-react` to `package.json`.

| Rank | Repo | Score | Use |
| ---: | --- | ---: | --- |
| 1 | [cloudinary/cloudinary_npm](https://github.com/cloudinary/cloudinary_npm) | 100 | Sign, webhook verify, upload/destroy, signed URLs |
| 2 | [cloudinary-community/next-cloudinary](https://github.com/cloudinary-community/next-cloudinary) | 100 | `CldUploadWidget`; `CldImage` public only |
| 3 | [cloudinary-community/cloudinary-examples](https://github.com/cloudinary-community/cloudinary-examples) | 98 | COPY+CLEAN signed widget + route handler |
| 4 | [cloudinary/mcp-servers](https://github.com/cloudinary/mcp-servers) | 98 | Inspect before coding; read-only until cutover |
| 5 | [cloudinary/cloudinary-cli](https://github.com/cloudinary/cloudinary-cli) | 96 | Named transforms, upload, search, Admin |
| 6 | [cloudinary/asset-management-js](https://github.com/cloudinary/asset-management-js) | 95 | Reconcile list/search — not library SoT |
| 7 | [cloudinary/api-schemas](https://github.com/cloudinary/api-schemas) | 94 | Contract/types |
| 8 | [cloudinary-community/cloudinary-util](https://github.com/cloudinary-community/cloudinary-util) | 88 | URL parse/normalize if needed |
| 9 | [cloudinary/js-url-gen](https://github.com/cloudinary/js-url-gen) | 80 | Only if named transforms cannot express the URL |
| 10 | [cloudinary/structured-metadata-mcp](https://github.com/cloudinary/structured-metadata-mcp) | 90 | Post-MVP CLD-META |
| 11 | [cloudinary-devs/product-launch-agent-single-tool](https://github.com/cloudinary-devs/product-launch-agent-single-tool) | 94 | First `findAssets` agent |
| 12 | [cloudinary-devs/product-launch-agent](https://github.com/cloudinary-devs/product-launch-agent) | 90 | Later campaign agent |

**Reference only (no runtime):** [create-cloudinary-next](https://github.com/cloudinary-devs/create-cloudinary-next) (audit env; **DROP** unsigned preset), [n8n-nodes-cloudinary](https://github.com/cloudinary/n8n-nodes-cloudinary), FashionistaAI, Event-Gallery UX, [auth.md](https://github.com/cloudinary/auth.md).

**Inspect order:** `#1 → #5 → #4 → #2 → #3`. Reconcile: `#6`. Delivery stuck: `#8` then `#9`.

---

## Example folders to open first (`cloudinary-examples`)

Prefer Next App Router samples:

| Folder | Use |
| --- | --- |
| `examples/nextjs-clduploadwidget-signed` | Primary operator upload |
| `examples/nextjs-upload-widget-signed` | Same pattern, alternate layout |
| `examples/nextjs-clduploadwidget` | Widget events/queue only |
| `examples/nextjs-cldimage` | Library/detail thumbs (public or unsigned **marketing** only) |
| `examples/nextjs-cldvideoplayer` | Later video |
| `examples/nextjs-route-handlers-upload` | Sign route shape |
| `examples/netlify-function-webhook-endpoint` | Webhook **shape** only — implement as Next Route Handler, not Netlify |
| `examples/react-ts-media-library` | Post-MVP Media Library Widget |
| `examples/nextjs-server-actions-upload` | **Not** the operator default (server `upload_stream`). Keep widget. |

Official signed-widget tutorial repo: [cloudinary-devs/cld-signed-upload-examples](https://github.com/cloudinary-devs/cld-signed-upload-examples).

---

## Task → repo map (inspect before implement)

Docs URLs for the same tickets: [../links.md](../links.md) (Cloudinary section). Open GitHub **and** those docs.

| Task | Open first | Then | Adapt / DROP |
| --- | --- | --- | --- |
| **IPI-1108 · CLD-FOUNDATION-001** | Console, [cloudinary-cli](https://github.com/cloudinary/cloudinary-cli), [mcp-servers](https://github.com/cloudinary/mcp-servers) | [cloudinary_npm](https://github.com/cloudinary/cloudinary_npm) README then [next-cloudinary](https://github.com/cloudinary-community/next-cloudinary) | Install; **DROP** unsigned preset; no wrapper unless repeated iPix behavior |
| **IPI-1109 · MEDIA-DATA-001** | — (Supabase) | mcp-servers read-only if checking live assets | No Cloudinary SDK as SoT |
| **IPI-1122 · SB-MEDIA-HARDEN-001** | — (Supabase grants/FK) | [control_access_to_media](https://cloudinary.com/documentation/control_access_to_media) so approval ≠ ACL | One forward migration after **1040** |
| **IPI-1110 · CLD-SIGN-001** | cloudinary_npm `api_sign_request` | `nextjs-clduploadwidget-signed`, `nextjs-route-handlers-upload` | COPY+CLEAN legacy unified sign + AUTH-002 |
| **IPI-1111 · CLD-WEBHOOK-001** | cloudinary_npm `verifyNotificationSignature` | notifications docs; examples webhook folder as **shape** | Next route; **raw `request.text()` then verify then parse**; `200` after DB write; no catch-all 200; HMAC only in Core |
| **IPI-1112 · CLD-DELIVERY-001** | cloudinary_npm signed URL + named transforms | legacy `url.ts`; `CldImage` only if a surface is public | Authenticated DAM: signed helper is canonical; js-url-gen only if stuck |
| **IPI-1113 · CLD-E2E-001** | cloudinary_npm upload + destroy | legacy pipeline script | Disposable asset; no prod customers |
| **IPI-1114 · CLD-RECONCILE-001** | asset-management-js **or** Admin API in npm | mcp-servers list | Read-only; not Search-as-DB |
| **IPI-1115 · CLD-CUTOVER-001** | mcp-servers env-config (triggers) | notifications `auth_scheme` | Preview URL first; rollback ipix.co |
| **IPI-1116 · CLD-UPLOAD-001** | next-cloudinary `CldUploadWidget` | `nextjs-clduploadwidget-signed`; legacy `asset-upload-panel.tsx` | No custom uploader |
| **IPI-1069 ASSETS-001** | IPI-1112 signed thumbs | Event-Gallery **UX** only | `listAssets` stays Supabase; no public `CldImage` for DAM |
| **SHOOT-ASSETS-001** | Event-Gallery UX | same widget as upload | `shoot_id` in Supabase |
| **MEDIA-APPROVAL-001** | — | FashionistaAI polling only if async derivatives later | Approval in Postgres, not Cloudinary ACL |
| **MEDIA-DELIVERY-001** | npm signed authenticated URLs | next-cloudinary named / legacy `url.ts` | Approved version only |
| **CLD-VIDEO-001** | `CldVideoPlayer` / `nextjs-cldvideoplayer` | cloudinary-video-player-react | After MVP |
| **CLD-MLW-001** | `react-ts-media-library` | — | After MVP |
| **CLD-CHUNK-001** | npm `upload_large` / asset-management-js chunks | widget large | After MVP |
| **CLD-OPS-001** | mcp-servers + asset-management usage | n8n later | Console + docs, no fake metrics |
| **CLD-MEDIAFLOWS / n8n** | mcp-servers MediaFlows, n8n-nodes-cloudinary | — | Post-MVP automation |
| **Fashion AI** | Cloudinary-FashionistaAI | — | Advanced only |

**IPI-1040 · MIGRATION-001** and **IPI-1065 · APP-001** have no Cloudinary GitHub dependency.

---

## Cursor inspect order (every Cloudinary PR)

```text
1. This map + Linear task
2. docs/links.md Cloudinary row for this IPI (≤5 official URLs)
3. Repo folder in the table above (not archived)
4. Installed package types in node_modules
5. Proven COPY+CLEAN from a pinned GitHub source named on the ticket (never implement from local /home/sk/ipix)
6. Smallest iPix adapter (org/RLS/200-after-write)
```
