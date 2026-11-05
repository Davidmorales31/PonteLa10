---
name: pont3la10-daily-editorial-run
description: Run Pont3la10's researched DeepSeek editorial batch, with authorized AI review and scheduling through its private API.
---

# Pont3la10 Daily Editorial Run

## Current scheduled mode — 2026-11-04

For scheduled runs, follow `docs/AUTOMATIZACION_EDITORIAL_IA.md` and
`config/automatizacionEditorial.json`. The owner explicitly delegated AI approval
and scheduling for this pipeline. These rules override the older review-only
instructions below; that legacy workflow applies only when explicitly requested.

1. Read the current policy and the trend/writing/SEO skills' current-mode notes.
   Check read-only health, then reserve today's run through `contexto`. Reuse its
   identity only for today's retries. Maximum two new run IDs per Bogotá day.
2. Research every active category. Target ten NEW articles per category, seventy
   when seven are active. Use up to twenty agenda candidates per category; save
   each dossier and its v2 assessment before drafting. Never duplicate to fill
   the target; record precise shortfalls and close partial if necessary.
3. Keep DeepSeek as the writer, as the owner confirmed. Call `borrador` once per
   stable key with the researched dossier; reuse a completed result. Do not pay
   for duplicate generations or retry an uncertain paid result without explicit
   authorization. Codex reviews and can correct the result without a new call.
   Keep the existing body/bodyJson equality, SEO,
   taxonomy, structured source metadata and 660-word contract. A single attributed
   source may suffice; no universal two-source or primary-source gate applies to
   automatic mode. Never misrepresent uncertainty or manufacture facts.
4. Use the site's active categories. Tendencias covers Latin American/general
   current affairs rather than stories about Google Trends. Use actual observed
   public interest; do not invent popularity or search counts. See the title
   guide in the policy, inspired by El Futbolero's protagonist/action/consequence.
5. Find and persist each relevant real photo using auto-cover. Review all exact
   category/topic IDs and any new topic names against the body, image presence
   and title fidelity. Build `review` as specified in the policy; persist the
   exact `{proposal, briefSeo, review}` envelope in the proposal checkpoint.
6. Call `node scripts/codex-editorial-submit.mjs propuesta-automatica <file.json>`.
   This uses the separate publication secret and requires a completed DeepSeek
   generation with the same identity and saved briefSeo. Never substitute the investigation
   key. On failure, retain the same payload
   and key; do not bypass a conflict. The API transaction creates, approves as IA
   and schedules at two-minute spacing. Do not invoke Cron manually.
7. Persist the receipt and verify CMS/context state, photo and taxonomy. A deduped
   article from another key has autoApproved=false and does not count. Exact
   receipt replay is not a new article. Count only unique new scheduled/published
   articles belonging to this run. Close completed only when each active category
   reaches ten; otherwise reconcile and close partial with the exact deficit.

## Legacy review-only mode

Use this as the coordinator for the daily scheduled Codex task in its existing
chat. Read the trend, investigative-writing and SEO skills before producing
candidates. Read auto-cover first. Every delivery requires a distinct, relevant
real photograph with verified credit and source. Never generate or submit an AI
cover. If no suitable photo can be verified, mark that candidate incomplete and
continue without delivering it. Never change the TikTok ingestion workflow. Use the
operational-monitor skill only for a separate read-only health check.

## Private API configuration

Run all private API requests through `scripts/codex-editorial-submit.mjs` from
the canonical repository root. The CLI silently loads the root `.env` and keeps
environment variables already present in the process as higher-priority
values. Scheduled tasks may not inherit variables from an interactive
PowerShell session, so never stop solely because `$env:` checks are empty and
never print or inspect secret values. If configuration is missing, the CLI
fails before sending a request.

Set `PONT3LA10_CODEX_EDITORIAL_API_BASE_URL` to the production editorial API
origin for scheduled runs. The CLI prefers it over the legacy
`PONT3LA10_CODEX_API_BASE_URL`, which the local football worker also uses.
Keep those destinations independent. Before research, verify private health
and the requested context. Diagnose a refused local connection by checking the
destination; preserve run and idempotency identities on uncertain transport.
Do not delete process variables to force a stale `.env` destination.

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
2. Prioritize the site's two main focuses in this order: Liga BetPlay
   (competitions, teams, fixtures, results, rules and analysis in Colombia),
   then Colombianos en Europa (verified club news, performances and continuity
   of Colombian players abroad). Then investigate every active category from
   context. Juan's required target for **every run** is at least ten unique
   proposals confirmed in CMS as `review`, with at least one proposal in each
   active category. The goal applies across all categories, not only football.
   Match only active categories/public topics from context; never fabricate IDs.
   Treat ten and one-per-category as minimums to pursue, not permission to pad:
   every item still needs a verified primary source, a distinct reader-facing
   angle, factual review, deduplication and its own verified photo. If evidence,
   originality, a suitable photo, or safe delivery blocks the goal, reconcile
   every opportunity, continue with eligible candidates, and report the exact
   per-category shortfall and concrete blockers. Opinión and Especiales stay
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
   - `portada`: mandatory. Search a relevant real photograph and
     open its source to identify an accurate visible credit. Keep source URL,
     author/agency when available, and a truthful archival/current caption.
     The CMS already stores/displays these fields. No invented license, creator
     or documentary implication. The user's authorization permits the credited
     source path without the old Commons-only license gate. If no suitable image
     and credit can be obtained, checkpoint the candidate as incomplete and
     deliver no article; never generate or upload AI imagery. Never deliver
     `coverMediaId: null`.
   - `media`: save the stable persisted media ID and safe
     receipt. On ambiguous persistence, reuse the checkpoint and idempotency
     key rather than regenerating or duplicating the image.
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
   matches, and propose at most one deduplicated public topic only when the catalog has no
   equivalent. Review the story's central entities against all relevant public
   topics; correct obvious omissions in the model selection before submission.
   Never fabricate an internal label, category, or related article. Verify the
   persisted category, topics and related articles after the review receipt;
   a model selection or local payload alone does not prove CMS labeling.
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
   submission with an AI cover, verify `coverMediaId` equals the persisted media
   receipt ID and `editorialFlags` includes `ai_generated_cover` but not
   `licensed_photo_cover` or `credited_photo_cover`. For a verified Commons
   license path use only `licensed_photo_cover`; for a sourced credited photo
   use only `credited_photo_cover`. Require a real persisted ID in every case.
   Never print
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
8. Confirm `articleId` and `estado: review` in the API receipt, then verify the
   saved article and taxonomy. Report the run ID, per-category counts, drafts created, skipped duplicates,
   unresolved candidates, and any safe required action. Distinguish partial
   completion from success; do not claim unreviewed categories are complete.
   Scheduled follow-ups stay in the configured chat. Keep unchanged/non-actionable
   checks quiet; notify on a new review draft, meaningful failure or needed action.

If required API configuration, research access or safe checkpoint
artifacts are unavailable, stop the affected candidate at the last completed
stage and report what is needed. A missing cover always blocks article delivery;
report the candidates actually verified and drafts confirmed. Do not
create filler to hit a numerical target or fabricate sources, drafts, images,
receipts, or successful API writes.
