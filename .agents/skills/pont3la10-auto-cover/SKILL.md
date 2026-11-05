---
name: pont3la10-auto-cover
description: Find and prepare an accurately credited real photograph for a Pont3la10 article; never generate an AI cover.
---

# Pont3la10 Sourced Editorial Photos

Use only after the article's reporting is complete. Search the real source,
not only an image preview. Every delivered Codex draft requires a cover.

1. Search Wikimedia Commons, official sources or editorial source pages for a photograph that directly and accurately
   illustrates the story. Do not imply that an archival image depicts a current
   event, match, lineup, injury, or person when it does not.
2. Open the source page and verify the image's author/agency or source credit.
   Preserve an available license accurately, but never invent one or use the
   old pilot whitelist as a blanket blocker: Juan authorized the credited
   source path. If a relevant image and truthful credit cannot be obtained,
   record why, leave the candidate incomplete, and continue without delivery.
3. Download the image from its verified source. Never take a
   thumbnail from a search-results page, remove a watermark, or re-create a
   real player's likeness. The CMS optimizes to WebP; the visible credit must
   identify the actual author/agency or source. Keep the source page URL in
   the CMS so a reviewer can verify the attribution.
4. If no relevant image and credit can be obtained, retain the local text and
   dossier, mark the candidate incomplete, and deliver no CMS article. Never use
   an unrelated image or synthetic visual just to fill the space.
5. For the general credited-source path, prepare metadata with exactly
   `titulo`, `alt`, `pie`, `credito`, and `urlFuente` (HTTPS source page).
   Preserve the literal truthful credit; do not claim a license or ownership.
   Use `credited_photo_cover` on the final proposal.
   The verified Commons compatibility path instead uses
   exactly `titulo`, `alt`, `pie`, `autorFoto`, `licenciaFoto`, and `urlFuente`.
   `urlFuente` must be the HTTPS
   Wikimedia Commons file page (`/wiki/File:...`). The helper derives the
   visible credit as `autorFoto · licenciaFoto · Wikimedia Commons` and rejects
   unapproved license classes or other domains.
6. From the repository root, run
   `node scripts/preparar-portada-codex.mjs <imagen> <metadatos.json> <payload.json>`
   and then `node scripts/codex-editorial-submit.mjs media <payload.json>`. The
   helper verifies the real JPEG/PNG/WebP signature and 2.4 MB limit; the
   server optimizes and stores the credit and source page. Never print or log
   base64 image data.
7. Use the returned media ID. The cover credit and source link must be visible
   in the CRM image selector and article preview. Keep the exact licensing
   wording; never claim Pont3la10 owns the photograph.
8. Remove only the exact temporary metadata and payload files after submission.

This Skill cannot approve, schedule, or publish content.
