---
name: pont3la10-operational-monitor
description: Check Pont3la10's editorial health, safely resume already-prepared idempotent deliveries, and report issues without regenerating, approving, or publishing content.
---

# Pont3la10 Operational Monitor

Use for the six-hour check after HU-ED-13 is installed and the private service
configuration is available. Health queries are read-only. The only permitted
mutation is one retry of an already-prepared, idempotent API delivery from a
local checkpoint; never regenerate editorial content or images here.

1. From the repository root, verify only whether
   `PONT3LA10_CODEX_API_BASE_URL` and `NUXT_CODEX_EDITORIAL_API_SECRET` exist in
   the process environment. Never print, inspect, or copy their values. If either
   is missing, report configuration unavailable and stop.
2. Create a temporary JSON file containing exactly `{}` and run:
   `node scripts/codex-editorial-submit.mjs salud <temporary-json-file>`.
   Delete only that exact temporary file after the command completes. Do not put
   credentials or private article data in it.
3. Interpret the returned snapshot. `worker.estado=desconocido` means no signal
   has ever been recorded; `desconectado` means its heartbeat is older than the
   configured freshness window; `detenido` means the worker reported stopped.
   Never describe these states as active.
4. Interpret the health response and keep identifiers private. For the local
   `codex.ultimaCorrida.runId`, list checkpoints with
   `node scripts/codex-editorial-checkpoint.mjs listar <runId>`; inspect candidate
   stages only when the health state is `failed`/`partial` or a delivery may have
   timed out. Never enumerate another run or print checkpoint payloads. Use
   `exportar <runId> <categoryId> <fingerprint> propuesta replay.json` to place
   the exact saved body in the candidate's ignored folder without echoing it;
   remove only that exact replay file after the API call and receipt checkpoint.
5. Safe recovery rules:
   - Do not enqueue or requeue ingestions. The durable worker claims/reclaims
     work itself. If it is disconnected/stopped, report that the PC/worker must
     be started; do not claim Codex can wake it.
   - Do not invoke article publication. Supabase Cron retries due publications
     each minute. If they remain overdue, report Cron state and direct the owner
     to inspect the CRM/Supabase; never publish twice from this monitor.
   - For an already prepared candidate, resume only the next technical API
     delivery using saved bytes/payload and the saved media ID when available.
     A media upload may be retried from the exact checkpointed image and metadata
     because the server deduplicates by content hash. A proposal must use the
     exact persisted payload/idempotency key. Export the saved `propuesta` stage
     to an ignored file; never reconstruct it from memory or print it. If its
     `entrega` receipt exists, skip it. If the last response was ambiguous, check API context first, then
     replay that same request at most once per monitor run. Never create a
     replacement key to bypass a conflict.
   - Do not invoke research, writing, topic selection, or image generation. If
     a candidate lacks a completed dossier, draft, or image, leave it untouched
     for the next daily run or human review.
   - Record the resumed API receipt in its `entrega` checkpoint. If its expected
     prior stage is missing, do not skip ahead; report the candidate for review.
6. Surface nonzero queue/evidence ages, expired processing leases, failed
   ingestions, failed/partial Codex runs, scheduled publications overdue, and
   Cron states `extension_no_disponible`, `job_no_configurado`, or `desconocido`.
   Include only safe counts, ages, timestamps, and status codes in the report.
7. If all systems are healthy and no actionable change occurred, remain quiet.
   If recovery was attempted, report only its outcome and safe next action. If a
   warning persists, explain the evidence and the one human action needed.

The health query has no parameters and remains read-only. Recovery is limited to
the exact already-prepared idempotent delivery described above. Never expose
Cron's raw return message, credentials, request signatures, prompts, source
URLs, checkpoint contents, or article bodies in the report.
