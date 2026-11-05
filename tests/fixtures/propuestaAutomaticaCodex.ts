export function crearPublicacionAutomaticaPrueba() {
  const categoryId = '00000000-0000-4000-8000-000000000001'
  const coverMediaId = '00000000-0000-4000-8000-000000000002'
  const tagIds = ['00000000-0000-4000-8000-000000000003']
  const texto = Array(66).fill('palabra').join(' ')
  const parrafos = Array.from({ length: 10 }, () => ({ type: 'paragraph' as const, content: [{ type: 'text' as const, text: texto }] }))
  return {
    proposal: {
      idempotencyKey: '00000000-0000-4000-8000-000000000004',
      runId: '00000000-0000-4000-8000-000000000005',
      categoryId,
      storyFingerprint: 'a'.repeat(64),
      title: 'Un cambio deportivo abre otra oportunidad para el equipo',
      summary: 'El reporte explica el cambio deportivo y sus consecuencias para el equipo.',
      contentType: 'noticia' as const,
      body: parrafos.map(parrafo => parrafo.content[0].text).join('\n\n'),
      bodyJson: { type: 'doc' as const, content: parrafos },
      seoTitle: 'Un cambio deportivo y sus consecuencias para el equipo',
      seoDescription: 'El reporte explica el cambio deportivo y sus consecuencias para el equipo.',
      socialBrief: 'El cambio deportivo abre una nueva oportunidad para el equipo.',
      sourceUrl: 'https://medio.example/reporte',
      sourceName: 'Medio de prueba',
      coverMediaId,
      tagIds,
      newTopics: [],
      relatedArticleIds: [],
      sources: [{ url: 'https://medio.example/reporte', titulo: 'Un cambio deportivo en el equipo', publisher: 'Medio de prueba', publishedAt: null, accessedAt: '2026-11-05T03:30:00.000Z', tipo: 'secundaria' as const, claims: ['El equipo anunció un cambio deportivo en su plantilla.'] }],
      editorialFlags: ['credited_photo_cover']
    },
    briefSeo: { targetQuery: 'cambio deportivo', searchIntent: 'actualidad' as const, parentCluster: null, freshnessWindowDays: 1, opportunitySource: 'https://medio.example/reporte', editorialDifferentiator: 'Explica las consecuencias del cambio para la plantilla y el próximo partido.' },
    review: { model: 'codex-test', categoryId, coverMediaId, tagIds, newTopicNames: [], categoryMatches: true as const, topicsMatch: true as const, imagePresent: true as const, titleFaithful: true as const, notes: 'Se revisaron la categoría, los temas, la portada y la fidelidad del título al cuerpo.' }
  }
}
