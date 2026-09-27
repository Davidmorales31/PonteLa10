---
name: pont3la10-daily-editorial-run
description: Run or resume Pont3la10's daily research-to-review editorial batch through its private API, without approving or publishing stories.
---

# Pont3la10 Daily Editorial Run

Use this as the coordinator for the daily scheduled Codex task. Read the trend,
investigative-writing, and auto-cover skills before producing candidates. Use
the operational-monitor skill only for a separate read-only health check.

## Private API configuration

Run all private API requests through `scripts/codex-editorial-submit.mjs` from
the canonical repository root. The CLI silently loads the root `.env` and keeps
environment variables already present in the process as higher-priority
values. Scheduled tasks may not inherit variables from an interactive
PowerShell session, so never stop solely because `$env:` checks are empty and
never print or inspect secret values. If configuration is missing, the CLI
fails before sending a request.

## Run and resume safely

1. Load active categories, public topics, recent published coverage, the
   requested run's `runId` and `runDate`, current-run proposals, and candidate
   checkpoints using the trend-research skill. Dates and the five-run cap use
   `America/Bogota`. Reuse exactly the same `runId` for retries/resumes only
   when its `runDate` is today's Colombia date. A run from a prior date is
   immutable for this workflow: do not reopen it, even if it remains
   `in_progress`; preserve its audit record and checkpoints. For today's first
   scheduled run, request a new UUID and let the private context endpoint
   atomically reserve it against the five-run cap. If the endpoint reports a
   run-date conflict (`CORRIDA_CODEX_FECHA_DISTINTA` or SQLSTATE `22023`),
   verify the date and use a new UUID only when the old run belongs to a prior
   Colombia date and today's cap has not been reached. Never retry a date
   conflict with the same old ID or use new IDs to evade today's cap.
2. Cover every active category. Aim for five to seven complete proposals per
   category when research supports them; at least 15 complete proposals total
   is the run-wide floor. This is never permission to invent, duplicate, or pad
   stories. If evidence cannot support the floor, record the gaps honestly.
   Opinión and Especiales stay flagged for human angle/format review.
3. Deduplicate before investigation and before image generation using category
   plus fingerprint. If the API context already contains a proposal for that
   candidate, do not generate or submit another one.
4. For each candidate, read `pont3la10-seo-editorial` after research and before
   submission. Use Codex research for trends and claim verification; call the
   private `borrador` endpoint once per stable idempotency key so the server
   invokes the Codex-only DeepSeek provider, whose article-writing criteria
   mirror the proven TikTok standard while keeping both provider routes and
   worker behavior isolated. Reuse the cached result on resume; do not make a fresh DeepSeek
   request to repair a timeout or lost response. If the API returns
   `DEEPSEEK_RESULTADO_INCIERTO`, stop that candidate and report it; do not set
   `retryUncertain: true` unless Juan explicitly authorizes that paid retry.

5. For each candidate, use the checkpoint CLI from the repository root. Save
   each completed stage as soon as it is ready, and read the checkpoint before
   resuming work:

   - `expediente`: trend signal, source records, claim/source map, uncertainty.
   - `borrador`: complete structured article proposal, taxonomy and SEO.
   - `portada`: optional image bytes stored by content hash and verified
     editorial metadata. Use only a pertinent photo with a verified permitted
     license; otherwise record the omission and continue without a cover.
   - `media`: optional stable returned media ID and safe upload receipt; omit
     this stage when no suitable licensed photo exists.
   - `propuesta`: exact API proposal payload plus stable idempotency key.
   - `entrega`: API response identifying the private review draft.

   Map the saved `borrador` response into the strict `propuesta` contract:
   `propuesta.titulo/resumen/documento/seo` become title, summary, body/bodyJson,
   and SEO fields; `seleccionEditorial.tagIds/temasNuevos/relatedArticleIds`
   become the corresponding taxonomy and relationship fields. Keep the dossier's
   source records and primary URL; never let DeepSeek replace or invent them.
   Check the returned taxonomy against the API-supplied public topic and
   published-story candidates before mapping the payload. A blank selection is
   not a default: select relevant exact IDs when warranted, omit unrelated
   matches, and propose a deduplicated public topic only when the catalog has no
   equivalent. Never fabricate an internal label, category, or related article.
   Derive human-review flags from the content type and verified photo receipt.

   Before saving or submitting each proposal, count the words in its plain-text
   `body` after trimming and collapsing whitespace. A complete Codex article
   must contain at least 660 words (three actual minutes at the site's
   220-words-per-minute rate); prefer the existing 850–1,200-word editorial
   target when the evidence supports it. The `propuesta` resource of
   `scripts/codex-editorial-submit.mjs` enforces the 660-word floor locally,
   and the Production API validates it too after deployment. If a draft is
   shorter, do not submit it or pad it: research and corroborate more, obtain a
   complete redraft, or mark that candidate incomplete and continue with a
   different verified candidate. Never count title, summary, SEO, sources, or
   metadata toward the article-body minimum.

   Use `node scripts/codex-editorial-checkpoint.mjs leer <runId> <categoryId> <fingerprint>`
   to inspect saved stages. Use `guardar` for JSON stages, `portada` for the
   verified original photo plus metadata, and `payload-portada` with an output filename
   relative to that candidate's folder (for example `portada.payload.json`) to
   create the upload payload there. Never print
   the base64 media payload or store credentials in checkpoints.
   Use `exportar` to materialize an exact saved stage to a file inside its
   ignored candidate folder without printing article/source content to terminal.

6. Never repeat completed research or image-search calls on resume. Reuse
   stored dossiers, draft, and any verified cover/media ID. For an uncertain API
   outcome, replay the exact saved proposal payload and idempotency key; inspect the API
   context first. Do not create a replacement identity to bypass a conflict.
7. Submit only through `scripts/codex-editorial-submit.mjs`. The pipeline may
   create or update a private `review` draft only. Never approve, schedule,
   publish, or bypass server-side validation; human approval is the boundary.
8. Report the run ID, per-category counts, drafts created, skipped duplicates,
   unresolved candidates, and any safe required action. Distinguish partial
   completion from success; do not claim all categories met the target unless
   API receipts prove it.

If required API configuration, research access, or safe checkpoint artifacts
are unavailable, stop the affected candidate at the last completed stage and
report what is needed. A missing suitable image is not a blocker: submit
`coverMediaId: null` and leave out `licensed_photo_cover`. Do not fabricate
sources, drafts, images, receipts, or successful API writes.
