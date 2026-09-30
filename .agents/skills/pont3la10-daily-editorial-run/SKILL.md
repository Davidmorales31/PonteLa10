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
   requested run's `runId` and `runDate`, current-run proposals, candidate
   checkpoints, and `actionTargets` using the trend-research skill. Dates and the five-run cap use
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
3. Before drafting, classify each opportunity independently from its article
   format. Emit `recommendedAction` and a specific `actionReason` of 20–600
   characters in every agenda opportunity. Choose `create_article` only for a
   genuinely new useful URL; choose `update_article` only with an exact existing
   ID from `actionTargets.articles`; choose `update_hub` only with an exact ID
   from `actionTargets.hubs` (currently empty until the hub catalog exists).
   `create_data_story` needs verifiable first-party or structured data evidence;
   `create_game_candidate` records an idea but never creates or publishes a
   game; use `manual_review` when evidence or the target is ambiguous; use
   `discard` only with a concrete reason. An update action must carry both
   `targetResourceId` and matching `targetResourceType` (`article` or `hub`);
   every other action must carry both as `null`. Never invent an ID or substitute
   a category, tag, draft, or URL for a resource target.
4. Deduplicate before investigation and before image generation using category
   plus fingerprint. If the API context already contains a proposal for that
   candidate, do not generate or submit another one.
5. For each candidate, read `pont3la10-seo-editorial` after research and before
   submission. Use Codex research for trends and claim verification; call the
   private `borrador` endpoint once per stable idempotency key so the server
   invokes the Codex-only DeepSeek provider, whose article-writing criteria
   mirror the proven TikTok standard while keeping both provider routes and
   worker behavior isolated. Reuse the cached result on resume; do not make a fresh DeepSeek
   request to repair a timeout or lost response. If the API returns
   `DEEPSEEK_RESULTADO_INCIERTO`, stop that candidate and report it; do not set
   `retryUncertain: true` unless Juan explicitly authorizes that paid retry.

6. For each candidate, use the checkpoint CLI from the repository root. Save
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
   Declare `contentIntent` explicitly and choose only one supported value:
   `search_utility`, `breaking`, `explainer`, `evergreen`, `data_story`,
   `special`, `opinion`, `game_support`, `social_first` or `update`. It is
   separate from `contentType`; never infer it from the type. For `update`,
   include the exact existing related article that is being updated.

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

7. Never repeat completed research or image-search calls on resume. Reuse
   stored dossiers, draft, and any verified cover/media ID. For an uncertain API
   outcome, replay the exact saved proposal payload and idempotency key; inspect the API
   context first. Do not create a replacement identity to bypass a conflict.
8. The admin opportunity panel may record a human decision for any candidate;
   it does not create an article, execute a target update, approve, schedule,
   publish, or bypass the regular CMS workflow. Only a human editor may open the
   normal CMS draft form after choosing `create_article` or `create_data_story`.
   Submit article proposals only through `scripts/codex-editorial-submit.mjs`.
   The pipeline may
   create or update a private `review` draft only. Never approve, schedule,
   publish, or bypass server-side validation; human approval is the boundary.
9. Report the run ID, per-category counts, drafts created, skipped duplicates,
   unresolved candidates, and any safe required action. Distinguish partial
   completion from success; do not claim all categories met the target unless
   API receipts prove it.

If required API configuration, research access, ImageGen, or safe checkpoint
artifacts are unavailable, stop the affected candidate at the last completed
stage and report what is needed. Never submit a Codex draft with a missing
cover; keep researching other candidates and report a shortfall honestly if
fewer than 15 complete, image-backed drafts can be confirmed. Do not fabricate
sources, drafts, images, receipts, or successful API writes.
