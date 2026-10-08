---
name: pont3la10-daily-editorial-run
description: Run or resume Pont3la10's daily research-to-review editorial batch through its private API, without approving or publishing stories.
---

# Pont3la10 Daily Editorial Run

Use this as the coordinator for the daily scheduled Codex task. Read the trend,
investigative-writing, SEO, auto-cover, and `pont3la10-ai-editorial-cover`
skills before producing candidates. The AI-cover skill is exclusive to this
Codex task; never change the TikTok ingestion workflow. Use the
operational-monitor skill only for a separate read-only health check.

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
2. Prioritize research in this order: Liga BetPlay A/B and Colombia national
   teams; verified news about Colombian players in Europe; then another active
   category only when there is a distinct, evidence-backed opportunity that
   serves the product strategy. Review active categories without forcing equal
   output. There is no per-category or run-wide draft quota: zero drafts is a
   valid result when no candidate merits `create`. Opinión and Especiales stay
   flagged for human angle/format review.
   Apply the source and differentiation gate in
   `docs/PROGRAMA_CONTENIDO_ORIGINAL.md` to every Codex candidate. Do not advance
   a dossier supported only by agency rewrites or without a specific
   differentiator and an identifiable primary source. Corroborate claims when
   needed, but do not reject a genuine original interview or own-data story just
   because it has no second publisher. The API checks that the declared primary
   URL matches a source typed as primary; human review must still verify that
   the work is not an agency rewrite and adds its claimed original value.
3. Deduplicate before investigation and before image generation using category
   plus fingerprint. If the API context already contains a proposal for that
   candidate, do not generate or submit another one.
   Persist the research agenda/checkpoint before any draft request. For an
   ED-25 v2 candidate, only `assessment.recommendation = create` with
   `assessment.addsNewValue = true` may enter the draft/cover/proposal pipeline.
   For `update`, `merge`, `expand`, or
   `discard`, preserve and report the recommendation, target URL/entity,
   cannibalization risk, and evidence, but do not create a second article or
   modify published content. These recommendations do not count as completed
   article drafts. A legacy candidate without `assessment` may be resumed under
   its original checkpoint; never downgrade a v2 candidate to the legacy path.
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
   - `portadaIA`: required ImageGen editorial illustration after the draft
     passes quality checks. Read and follow `pont3la10-ai-editorial-cover` and
     `pont3la10-editorial-imagery`; inspect, optimize, and checkpoint the
     result. If it cannot be generated safely, skip this candidate rather than
     create a text-only Codex draft. Do not replace this task's ImageGen step
     with the optional licensed-photo search path.
   - `media`: required stable returned media ID and safe upload receipt from
     `media-ia`; on an ambiguous persistence response, reuse the checkpoint and
     idempotency key rather than regenerating, duplicating, or submitting
     without the media ID.
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
   to inspect saved stages. Use `guardar` for JSON stages and `portada-ia` for
   an inspected ImageGen result and its title/alt metadata. Use
   `payload-portada-ia` with an output filename relative to that candidate's
   folder. Submit generated illustrations using `media-ia`. Before proposal
   submission, verify `coverMediaId` equals the persisted media receipt ID and
   `editorialFlags` includes `ai_generated_cover` but not
   `licensed_photo_cover`; the CLI and private API reject proposals without a
   persisted cover. Never print
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

If required API configuration, research access, ImageGen, or safe checkpoint
artifacts are unavailable, stop the affected candidate at the last completed
stage and report what is needed. Never submit a Codex draft with a missing
cover; report the candidates actually verified and drafts confirmed. Do not
create filler to hit a numerical target or fabricate sources, drafts, images,
receipts, or successful API writes.
