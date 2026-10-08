---
name: pont3la10-investigative-writing
description: Draft a sourced Pont3la10 Spanish-language sports or digital-culture article from a verified research dossier, with taxonomy, related stories, and SEO metadata. Use only after source research is complete.
---

# Pont3la10 Investigative Writing

Write a publishable-quality draft whose every material factual claim can be
traced to the dossier. Follow the existing evidence and editorial contracts in
`docs/HU_ED_08_BORRADOR_IA.md` when present and the current HU-ED-11.

Use the editorial pillars and evidence gate in
`docs/PROGRAMA_CONTENIDO_ORIGINAL.md`, especially for candidates in the original
content program. Every Codex candidate needs a specific, evidence-backed
differentiator in `seleccionEditorial.diferenciadorEditorial` and at least one
identifiable primary source. Add corroboration when the claim requires it, but
do not reject genuine original interviews or data merely because no second
publisher exists. Treat agency copy as secondary context only: an agency rewrite
is never original reporting. A primary source alone does not make a story
original; the article must add reporting, data, analysis, or explanatory
context of its own. If those conditions are not met, reject/omit the candidate
rather than labeling or polishing it as original.

Use the Codex-specific DeepSeek provider and its contract. Mirror the proven
article length, paragraph development, and factual discipline of TikTok
ingestion without editing or routing through the TikTok worker/provider.

- Lead with the verified development and explain why it matters to the reader.
- Build context, chronology, protagonists, and consequences only from the
  sources. Distinguish confirmed facts from unresolved claims; omit unsupported
  details instead of filling gaps.
- Synthesize and analyze; do not translate, paraphrase paragraph by paragraph,
  or stitch together source articles. Never fabricate quotes, numbers, sources,
  statements, dates, interviews, or firsthand reporting.
- Use natural Colombian Spanish, a specific accurate headline, useful summary,
  coherent developed paragraphs, and SEO text faithful to the article. No
  keyword stuffing or fixed word count that forces filler.
- Return citations as structured source records mapped to claims, never as
  “Fuente:” lines inside the article body. Preserve the original links.
- Choose only active category/topic IDs from the server-provided catalog. Reuse
  existing public topics; propose a new public topic only when necessary and
  directly relevant. Never create internal labels or categories. Link only real
  published related articles supplied by the API.
- Before submission, explicitly compare the verified lead, named entities,
  competition/team, SEO query and source claims against the supplied public
  topic candidates and published-article candidates. Select exact IDs for
  genuinely relevant existing topics and up to three materially connected
  stories; never leave either list empty by default, but do not force a match
  based only on category. If a relevant match exists and the model omits it,
  correct the selection from the supplied IDs. Create at most one new public
  topic only if the catalog has no equivalent; never create a category or an
  internal label.
- Opinión requires a human-provided thesis and author; otherwise return an
  explicitly flagged neutral proposal for angle review, without attributed
  personal opinion. Especiales must not imply firsthand coverage that did not
  happen.
- Report missing corroboration, ambiguity, material risks, and items the human
  reviewer should inspect. A weak dossier should be rejected, not polished into
  false certainty.

Submit as a structured proposal to the private API. It may create only a private
`review` draft. Never approve, schedule, publish, or bypass an API validation.
An appropriate, verifiably licensed cover is optional: if none can be found,
submit the complete story with `coverMediaId: null` and no photo-license flag.
