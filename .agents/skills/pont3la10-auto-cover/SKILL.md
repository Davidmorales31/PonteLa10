---
name: pont3la10-auto-cover
description: Find and prepare a genuinely reusable, accurately credited sports/editorial photograph for a Pont3la10 article; never fabricate documentary photography.
---

# Pont3la10 Sourced Editorial Photos

Use only after the article's reporting is complete. Follow HU-ED-11 and the
source-page license, not just the image preview.

1. Search Wikimedia Commons for a photograph that directly and accurately
   illustrates the story. Do not imply that an archival image depicts a current
   event, match, lineup, injury, or person when it does not.
2. Open the Commons file page and verify its creator and reuse terms. Only use
   `CC0 1.0`, `CC BY 4.0`, or clearly stated `Dominio público`. Do not use
   `NC`, `ND`, `BY-SA`, unclear, or missing licenses in this first production
   pilot. If the author, license, or provenance cannot be verified, do not use
   the image; record the omission and continue the article without a cover.
3. Download the original image from that Commons file page. Never take a
   thumbnail from a search-results page, remove a watermark, or re-create a
   real player's likeness. The CMS optimizes to WebP; the visible credit must
   identify the author, exact allowed license, and Wikimedia Commons. The file
   page link is retained so a reviewer can verify the credit/license.
4. If no relevant image passes verification, do not fail or discard the story.
   Record that no suitable licensed photo was found, skip the `portada` and
   `media` checkpoint stages, and submit the text-only proposal with
   `coverMediaId: null` and without `licensed_photo_cover`. Never use an
   unrelated image just to fill the space.
5. When a photo passes verification, prepare a temporary JSON file containing
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

Never fall back to AI imagery or an unlicensed stock image. This Skill cannot
approve, schedule, or publish content.
