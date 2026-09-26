---
name: pont3la10-daily-editorial-run
description: Run or resume Pont3la10's daily research-to-review editorial batch through its private API, without approving or publishing stories.
---

# Pont3la10 Daily Editorial Run

Use this as the coordinator for the daily scheduled Codex task. Read the trend,
investigative-writing, and auto-cover skills before producing candidates. Use
the operational-monitor skill only for a separate read-only health check.

## Run and resume safely

1. Load active categories, public topics, recent published coverage, the
   authoritative daily `runId`, current-run proposals, and candidate checkpoints
   using the trend-research skill. Never hard-code IDs or create a second run
   merely because a prior task was interrupted.
2. Target at least 15 complete proposals total per daily run, distributed as
   evenly as the current evidence and active categories allow. This is a
   minimum production goal, not permission to invent, duplicate, or pad stories;
   report a shortfall with concrete evidence gaps. Do not interpret it as 15 per
   category. Continue across all active categories until 15 proposals have been
   accepted by the API or every viable candidate is exhausted. Opinión and
   Especiales stay explicitly flagged for human angle/format review.
3. Deduplicate before investigation and before image generation using category
   plus fingerprint. If the API context already contains a proposal for that
   candidate, do not generate or submit another one.
4. For each candidate, use the checkpoint CLI from the repository root. Save
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

   Use `node scripts/codex-editorial-checkpoint.mjs leer <runId> <categoryId> <fingerprint>`
   to inspect saved stages. Use `guardar` for JSON stages, `portada` for the
   verified original photo plus metadata, and `payload-portada` with an output filename
   relative to that candidate's folder (for example `portada.payload.json`) to
   create the upload payload there. Never print
   the base64 media payload or store credentials in checkpoints.
   Use `exportar` to materialize an exact saved stage to a file inside its
   ignored candidate folder without printing article/source content to terminal.

5. Never repeat completed research or image-search calls on resume. Reuse
   stored dossiers, draft, and any verified cover/media ID. For an uncertain API
   outcome, replay the exact saved proposal payload and idempotency key; inspect the API
   context first. Do not create a replacement identity to bypass a conflict.
6. Submit only through `scripts/codex-editorial-submit.mjs`. The pipeline may
   create or update a private `review` draft only. Never approve, schedule,
   publish, or bypass server-side validation; human approval is the boundary.
7. Report the run ID, per-category counts, drafts created, skipped duplicates,
   unresolved candidates, and any safe required action. Distinguish partial
   completion from success; do not claim all categories met the target unless
   API receipts prove it.

If required API configuration, research access, or safe checkpoint artifacts
are unavailable, stop the affected candidate at the last completed stage and
report what is needed. A missing suitable image is not a blocker: submit
`coverMediaId: null` and leave out `licensed_photo_cover`. Do not fabricate
sources, drafts, images, receipts, or successful API writes.
