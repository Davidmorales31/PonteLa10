---
name: pont3la10-auto-cover
description: Create an attention-worthy Pont3la10 editorial cover illustration for a researched article using Codex image generation. Use when a verified dossier and draft are available; not for documentary evidence or fake press photos.
---

# Pont3la10 Automated Editorial Covers

Use the built-in image-generation tool for one original cover that clarifies the
story and invites a legitimate click. Follow `docs/HU_ED_11_CONTENIDO_DESDE_INVESTIGACION.md`.

1. Read the verified dossier and intended headline. Identify what can be shown
   accurately and what must remain generic or absent.
2. Create a landscape image that survives a 16:9 crop, with one clear focal
   point, natural light/texture, believable camera framing, and restrained
   Pont3la10 navy/electric-blue/yellow accents where appropriate.
3. Create intrigue through composition and human stakes, never fabricated
   scandal, injury, conflict, logos, sponsor marks, uniforms, or clickbait.
4. Do not depict a recognizable real person, a claimed real event, or a specific
   action as a photograph unless the user supplies a rights-cleared reference
   and explicitly requests an edit. Otherwise use a clearly illustrative,
   unidentifiable scene.
5. Add no text, title, logo, badge, or watermark inside the image. Keep the
   article's words and brand separate in the UI.
6. Inspect the actual image for artifacts, misleading details, anatomy, text,
   and crop safety. If it could be mistaken for documentary evidence, regenerate
   it or return an image-quality failure.
7. Save the inspected image to a temporary local file. Write a separate
   temporary JSON file with exactly `titulo`, `alt`, `pie`, and `credito`; the
   latter two must identify an AI-generated editorial illustration. From the
   repository root, run
   `node scripts/preparar-portada-codex.mjs <image> <metadata.json> <payload.json>`
   and then `node scripts/codex-editorial-submit.mjs media <payload.json>`. The
   helper checks the actual JPEG/PNG/WebP signature and a 2.4 MB limit; the
   server optimizes and registers the upload. Use the returned `mediaId` in the
   draft. Remove only the exact temporary metadata and payload files after
   submission; do not display or log the base64 payload.

If image generation or safe file delivery is unavailable, stop that candidate at
editorial attention. Never substitute a nonexistent article image, stock image
without licensing, or invented documentary photo. This Skill cannot approve,
schedule, or publish content.
