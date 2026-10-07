import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { firmaCodexEsValida } from '~/server/utils/codexEditorialPrivado'
import {
  esquemaAgendaCodex,
  esquemaConsultaSaludCodex,
  esquemaPortadaCodex,
  esquemaPortadaIACodex,
  esquemaPropuestaCodex,
  calcularPrioridadEditorialCodex
} from '~/server/utils/esquemasCodexEditorial'

function crearFirma(timestamp: string, metodo: string, ruta: string, requestId: string, cuerpo: Buffer, secreto: string) {
  return createHmac('sha256', secreto)
    .update(`${timestamp}.${metodo}.${ruta}.${requestId}.`)
    .update(cuerpo)
    .digest('hex')
}

describe('API privada de propuestas Codex', () => {
  it('valida atribución y licencia reutilizable de la foto', () => {
    const portada = {
      nombreOriginal: 'colombia.webp',
      tipoMime: 'image/webp' as const,
      imagenBase64: 'a'.repeat(100),
      titulo: 'Selección Colombia',
      alt: 'Selección Colombia durante un partido internacional.',
      pie: 'Fotografía de archivo de la selección durante un partido internacional.',
      autorFoto: 'Carlos Pérez',
      licenciaFoto: 'CC BY 4.0' as const,
      urlFuente: 'https://commons.wikimedia.org/wiki/File:Colombia_football_team.jpg',
      credito: 'Carlos Pérez · CC BY 4.0 · Wikimedia Commons'
    }

    expect(esquemaPortadaCodex.safeParse(portada).success).toBe(true)
    expect(esquemaPortadaCodex.safeParse({
      ...portada,
      urlFuente: 'https://example.org/image.jpg'
    }).success).toBe(false)
    expect(esquemaPortadaCodex.safeParse({
      ...portada,
      licenciaFoto: 'CC BY-NC 4.0'
    }).success).toBe(false)
  })

  it('acepta una portada IA sin permitir fuente, crédito o licencia inventados', () => {
    const portadaIA = {
      nombreOriginal: 'portada-generada.webp',
      tipoMime: 'image/webp' as const,
      imagenBase64: Buffer.alloc(100, 2).toString('base64'),
      titulo: 'Ilustración editorial del tema',
      alt: 'Escena editorial genérica relacionada con la noticia'
    }

    expect(esquemaPortadaIACodex.safeParse(portadaIA).success).toBe(true)
    expect(esquemaPortadaIACodex.safeParse({
      ...portadaIA,
      urlFuente: 'https://example.org/fuente.jpg'
    }).success).toBe(false)
    expect(esquemaPortadaIACodex.safeParse({
      ...portadaIA,
      credito: 'Creative Commons'
    }).success).toBe(false)
    expect(esquemaPortadaIACodex.safeParse({
      ...portadaIA,
      imagenBase64: 'no es base64'
    }).success).toBe(false)
  })

  it('valida HMAC, contenido exacto y ventana temporal', () => {
    const instante = 1_790_000_000
    const timestamp = String(instante)
    const metodo = 'POST'
    const ruta = '/api/internal/codex/proposals'
    const requestId = '45d8b1c5-47e7-42b8-9ac5-ea753c4a5ebf'
    const cuerpo = Buffer.from('{"ok":true}')
    const firma = crearFirma(timestamp, metodo, ruta, requestId, cuerpo, 'secreto-de-prueba')

    expect(firmaCodexEsValida(timestamp, metodo, ruta, requestId, firma, cuerpo, 'secreto-de-prueba', instante)).toBe(true)
    expect(firmaCodexEsValida(timestamp, metodo, ruta, requestId, firma, Buffer.from('{"ok":false}'), 'secreto-de-prueba', instante)).toBe(false)
    expect(firmaCodexEsValida(timestamp, 'PUT', ruta, requestId, firma, cuerpo, 'secreto-de-prueba', instante)).toBe(false)
    expect(firmaCodexEsValida(timestamp, metodo, '/api/internal/codex/media', requestId, firma, cuerpo, 'secreto-de-prueba', instante)).toBe(false)
    expect(firmaCodexEsValida(timestamp, metodo, ruta, requestId, firma, cuerpo, 'secreto-de-prueba', instante + 301)).toBe(false)
    expect(firmaCodexEsValida(timestamp, metodo, ruta, requestId, firma, cuerpo, '', instante)).toBe(false)
  })

  it('no deja que una propuesta de Opinión omita la revisión de enfoque', () => {
    const fuente = {
      url: 'https://example.org/reportaje',
      titulo: 'Reporte de prueba sobre el tema',
      publisher: 'Medio de prueba',
      publishedAt: null,
      accessedAt: '2026-09-26T12:00:00Z',
      tipo: 'primaria' as const,
      claims: ['El documento oficial confirma la fecha del evento.']
    }
    const crearCuerpoDePrueba = (palabras: number) => {
      const bloques = Array.from({ length: Math.ceil(palabras / 66) }, (_, indice) => {
        const cantidad = Math.min(66, palabras - indice * 66)
        const texto = Array.from({ length: cantidad }, () => 'palabra').join(' ')
        return {
          type: 'paragraph' as const,
          content: [{ type: 'text' as const, text: texto }]
        }
      })
      return {
        texto: bloques.map(bloque => bloque.content[0].text).join('\n\n'),
        documento: { type: 'doc' as const, content: bloques }
      }
    }
    const cuerpoPrueba = crearCuerpoDePrueba(660)
    const propuesta = {
      idempotencyKey: '45d8b1c5-47e7-42b8-9ac5-ea753c4a5ebf',
      runId: '14a5f2b0-a9c1-41b2-9b82-729f52c3b4d2',
      categoryId: 'ef3716e2-351e-4bc6-af69-883b17e91111',
      storyFingerprint: 'a'.repeat(64),
      title: 'Una historia deportiva suficientemente clara',
      summary: 'Un resumen editorial de prueba que explica por qué importa esta historia.',
      contentType: 'opinion' as const,
      body: cuerpoPrueba.texto,
      bodyJson: cuerpoPrueba.documento,
      seoTitle: 'Una historia deportiva de prueba',
      seoDescription: 'Descripción de prueba suficientemente completa para validar el contrato editorial.',
      socialBrief: 'Contexto del tema para redes sociales.',
      sourceUrl: fuente.url,
      sourceName: fuente.publisher,
      coverMediaId: 'ed2af2d4-533e-4dab-9e9d-a48268297220',
      tagIds: [],
      newTopics: [],
      relatedArticleIds: [],
      sources: [fuente, { ...fuente, url: 'https://example.org/confirmacion', tipo: 'secundaria' as const }],
      editorialFlags: []
    }

    expect(esquemaPropuestaCodex.safeParse(propuesta).success).toBe(false)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      editorialFlags: ['needs_angle_review', 'licensed_photo_cover']
    }).success).toBe(true)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      editorialFlags: ['needs_angle_review', 'ai_generated_cover']
    }).success).toBe(true)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      editorialFlags: ['needs_angle_review', 'licensed_photo_cover', 'ai_generated_cover']
    }).success).toBe(false)
    const cuerpoCorto = crearCuerpoDePrueba(659)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      body: cuerpoCorto.texto,
      bodyJson: cuerpoCorto.documento,
      editorialFlags: ['needs_angle_review', 'licensed_photo_cover']
    }).success).toBe(false)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      coverMediaId: null,
      editorialFlags: ['needs_angle_review']
    }).success).toBe(true)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      coverMediaId: null,
      editorialFlags: ['needs_angle_review', 'licensed_photo_cover']
    }).success).toBe(false)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      coverMediaId: null,
      editorialFlags: ['needs_angle_review', 'ai_generated_cover']
    }).success).toBe(false)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      editorialFlags: ['needs_angle_review']
    }).success).toBe(false)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      editorialFlags: ['needs_angle_review', 'licensed_photo_cover'],
      newTopics: [{ name: 'Tema\u0007 deportivo', description: 'Descripción válida.' }]
    }).success).toBe(false)
    expect(esquemaPropuestaCodex.safeParse({
      ...propuesta,
      editorialFlags: ['needs_angle_review', 'licensed_photo_cover'],
      newTopics: [{ name: 'Tema deportivo', description: 'Descripción\u0085 inválida.' }]
    }).success).toBe(false)
  })

  it('restringe la RPC a service_role y no habilita escrituras directas desde clientes', () => {
    const migracion = readFileSync(
      new URL('../../supabase/migrations/20260926080057_codex_editorial_proposals.sql', import.meta.url),
      'utf8'
    )
    expect(migracion).not.toContain('auth.role()')
    expect(migracion).toContain('from public, anon, authenticated')
    expect(migracion).toContain('to service_role')
    expect(migracion).not.toContain('auth.role()')
    expect(migracion).toContain("'review'")
    expect(migracion).not.toMatch(/set status\s*=\s*'(?:approved|scheduled|published)'/i)
    expect(migracion).toContain("v_article_body_json, 'review'")
  })

  it('permite omitir portada sin relajar la seguridad de la RPC privada', () => {
    const migracion = readFileSync(
      new URL('../../supabase/migrations/20260926183207_permitir_propuestas_codex_sin_portada.sql', import.meta.url),
      'utf8'
    )

    expect(migracion).toContain('is_nullable = \'YES\'')
    expect(migracion).toContain('v_media_id is null')
    expect(migracion).toContain('v_media_id is not null')
    expect(migracion).toContain('licensed_photo_cover')
    expect(migracion).toContain('pg_catalog.pg_proc')
    expect(migracion).not.toContain('security definer')
    expect(migracion).not.toMatch(/grant\s+execute\s+on\s+function/i)
    expect(migracion).not.toMatch(/set\s+status\s*=\s*'(?:approved|scheduled|published)'/i)
  })

  it('permite la portada IA solo con su disclosure, sin debilitar la RPC', () => {
    const migracion = readFileSync(
      new URL('../../supabase/migrations/20260928010850_codex_ai_generated_covers.sql', import.meta.url),
      'utf8'
    )
    const ruta = readFileSync(new URL('../../server/api/internal/codex/media-ai.post.ts', import.meta.url), 'utf8')

    expect(migracion).toContain('ai_generated_cover')
    expect(migracion).toContain('media.source_url is null')
    expect(migracion).toContain("media.credit = 'Imagen generada con IA'")
    expect(migracion).toContain('media.caption =')
    expect(migracion).toContain('or v_is_security_definer')
    expect(migracion).toContain("has_function_privilege('service_role'")
    expect(migracion).toContain("has_function_privilege('anon'")
    expect(migracion).toContain("or (v_media_id is null and (\n      (p_input -> 'editorialFlags') @> '[\"licensed_photo_cover\"]'::jsonb\n      or (p_input -> 'editorialFlags') @> '[\"ai_generated_cover\"]'::jsonb\n    )\n$new$;")
    expect(ruta).toContain('source_url: null')
    expect(ruta).toContain('CREDITO_PORTADA_IA_CODEX')
    expect(ruta).toContain('PIE_PORTADA_IA_CODEX')
    expect(ruta).toContain("existente.bucket !== 'editorial-media'")
    expect(ruta).toContain("duplicado.bucket !== 'editorial-media'")
    expect(ruta).not.toContain('verificarAtribucionFotoCommons')
  })

  it('elige automáticamente la publicación más reciente con imagen pública existente', () => {
    const migracion = readFileSync(
      new URL('../../supabase/migrations/20260927131539_latest_public_home_feature_and_reading_time.sql', import.meta.url),
      'utf8'
    )
    expect(migracion).toContain('get_public_editorial_latest_article_with_cover')
    expect(migracion).toContain("article.status = 'published'")
    expect(migracion).toContain('bucket.public is true')
    expect(migracion).toContain('storage.objects')
    expect(migracion).toContain("media.mime_type like 'image/%'")
    expect(migracion).toContain("'lecturaMinutos'")
  })

  it('rechaza controles en temas públicos nuevos también dentro de la RPC', () => {
    const migracion = readFileSync(
      new URL('../../supabase/migrations/20260926080057_codex_editorial_proposals.sql', import.meta.url),
      'utf8'
    )
    expect(migracion).toContain("v_topic_name ~ '[[:cntrl:]]'")
    expect(migracion).toContain("coalesce(v_topic_description ~ '[[:cntrl:]]', false)")
    expect(migracion).toContain('set search_path = \'\'')
    expect(migracion).toMatch(/revoke all on function public\.submit_codex_editorial_proposal\(jsonb\)[\s\S]*?from public, anon, authenticated/i)
    expect(migracion).toMatch(/grant execute on function public\.submit_codex_editorial_proposal\(jsonb\)[\s\S]*?to service_role/i)
  })

  it('valida agenda por categoría y exige explicar oportunidades insuficientes', () => {
    const runId = '14a5f2b0-a9c1-41b2-9b82-729f52c3b4d2'
    const categoryId = 'ef3716e2-351e-4bc6-af69-883b17e91111'
    const oportunidad = {
      fingerprint: 'a'.repeat(64),
      term: 'Tendencia deportiva de prueba',
      titleHint: 'Una historia deportiva verificada para explorar',
      trendUrl: 'https://trends.google.com/trends/trendingsearches/daily?geo=CO',
      trendTitle: 'Tendencias actuales de Colombia',
      observedAt: '2026-09-26T12:00:00Z',
      relevanceReason: 'La tendencia conecta con actividad deportiva y merece investigarse antes de redactar.',
      scores: { recency: 90, relevance: 82, novelty: 75, editorialFit: 88 }
    }
    const agenda = {
      runId,
      status: 'in_progress' as const,
      categories: [{ categoryId, opportunities: [oportunidad] }]
    }

    // Los lotes parciales pueden reanudarse; el servidor determina el faltante
    // usando el total acumulado de oportunidades persistidas.
    expect(esquemaAgendaCodex.safeParse(agenda).success).toBe(true)
    expect(esquemaAgendaCodex.safeParse({
      ...agenda,
      categories: [{ ...agenda.categories[0], omittedReason: 'Solo apareció una señal; faltan fuentes independientes para justificar más temas.' }]
    }).success).toBe(true)
    expect(esquemaAgendaCodex.safeParse({
      ...agenda,
      categories: [{
        ...agenda.categories[0],
        opportunities: Array.from({ length: 8 }, (_, indice) => ({
          ...oportunidad,
          fingerprint: indice.toString(16).padStart(64, '0')
        }))
      }]
    }).success).toBe(false)
  })

  it('valida el scoring ED-25, normaliza Search Console ausente y exige revisión antes de crear', () => {
    const oportunidadV2 = {
      fingerprint: 'b'.repeat(64),
      term: 'Liga colombiana',
      titleHint: 'La Liga BetPlay entra en una jornada decisiva',
      trendUrl: 'https://trends.google.com/trends/trendingsearches/daily?geo=CO',
      trendTitle: 'Tendencias actuales de Colombia',
      observedAt: '2026-10-07T12:00:00Z',
      relevanceReason: 'La señal coincide con una competición activa y debe contrastarse con fuentes primarias.',
      scores: {
        demandSignal: 90,
        clusterProximity: 80,
        existingEntity: 70,
        novelty: 60,
        searchConsoleOpportunity: null,
        differentialValue: 100,
        updateability: 50,
        priorityScore: 80
      },
      assessment: {
        recommendation: 'create' as const,
        targetUrl: null,
        entityMatch: { type: 'competition' as const, slug: 'liga-betplay', name: 'Liga BetPlay' },
        cannibalizationRisk: 'none' as const,
        similarArticleIds: [],
        addsNewValue: true,
        noveltyRationale: 'La cobertura disponible no informa este cambio de jornada ni sus implicaciones para los lectores.',
        differentiator: 'La pieza explicaría el efecto sobre la clasificación y enlazaría el calendario oficial actualizado.',
        searchConsoleEvidence: null
      }
    }
    const agenda = {
      runId: '14a5f2b0-a9c1-41b2-9b82-729f52c3b4d2',
      status: 'in_progress' as const,
      categories: [{ categoryId: 'ef3716e2-351e-4bc6-af69-883b17e91111', opportunities: [oportunidadV2] }]
    }

    expect(calcularPrioridadEditorialCodex(oportunidadV2.scores)).toBe(80)
    expect(esquemaAgendaCodex.safeParse(agenda).success).toBe(true)
    expect(esquemaAgendaCodex.safeParse({
      ...agenda,
      categories: [{
        ...agenda.categories[0],
        opportunities: [{ ...oportunidadV2, scores: { ...oportunidadV2.scores, priorityScore: 79 } }]
      }]
    }).success).toBe(false)
    expect(esquemaAgendaCodex.safeParse({
      ...agenda,
      categories: [{
        ...agenda.categories[0],
        opportunities: [{ ...oportunidadV2, assessment: { ...oportunidadV2.assessment, recommendation: 'update' } }]
      }]
    }).success).toBe(false)
    expect(esquemaAgendaCodex.safeParse({
      ...agenda,
      categories: [{
        ...agenda.categories[0],
        opportunities: [{
          ...oportunidadV2,
          assessment: { ...oportunidadV2.assessment, cannibalizationRisk: 'high' }
        }]
      }]
    }).success).toBe(false)
    expect(esquemaAgendaCodex.safeParse({
      ...agenda,
      categories: [{
        ...agenda.categories[0],
        opportunities: [{
          ...oportunidadV2,
          scores: { ...oportunidadV2.scores, updateability: 60, priorityScore: 81 }
        }]
      }]
    }).success).toBe(false)
    expect(esquemaAgendaCodex.safeParse({
      ...agenda,
      categories: [{
        ...agenda.categories[0],
        opportunities: [{
          ...oportunidadV2,
          assessment: { ...oportunidadV2.assessment, addsNewValue: false }
        }]
      }]
    }).success).toBe(false)
    expect(esquemaAgendaCodex.safeParse({
      ...agenda,
      categories: [{
        ...agenda.categories[0],
        opportunities: [{
          ...oportunidadV2,
          scores: { ...oportunidadV2.scores, searchConsoleOpportunity: 70, priorityScore: 79 },
          assessment: {
            ...oportunidadV2.assessment,
            searchConsoleEvidence: {
              query: 'liga betplay calendario',
              pageUrl: 'https://www.pont3la10.com/liga-colombiana',
              reportPeriodEnd: '2026-10-06'
            }
          }
        }]
      }]
    }).success).toBe(true)
  })

  it('mantiene la consulta de salud privada, vacía y solo de lectura', () => {
    const migracion = readFileSync(new URL(
      '../../supabase/migrations/20260926091323_hu_ed_13_worker_heartbeat_y_salud.sql',
      import.meta.url
    ), 'utf8')
    const cliente = readFileSync(new URL(
      '../../scripts/codex-editorial-submit.mjs',
      import.meta.url
    ), 'utf8')

    expect(esquemaConsultaSaludCodex.safeParse({}).success).toBe(true)
    expect(esquemaConsultaSaludCodex.safeParse({ retry: true }).success).toBe(false)
    expect(cliente).toContain("salud: '/api/internal/codex/health'")
    expect(migracion).toContain('public.get_codex_editorial_health()')
    expect(migracion).toContain('to service_role')
    expect(migracion).toContain("'desconectado'")
    expect(migracion).toContain("'programadasVencidas'")
    expect(migracion).toContain("'cron'")
    expect(migracion).toContain("'ingestas.worker.salud'")
    expect(migracion).toContain('security definer')
    expect(migracion).toContain('private.ensure_ingestion_worker(\'ingestas.worker.salud\')')
    expect(migracion).toContain('revoke all on public.editorial_worker_heartbeats from public, anon, authenticated')
    expect(migracion).not.toContain('grant usage on schema private to authenticated')
    expect(migracion).not.toContain('p_last_seen_at')
    expect(migracion).toContain("'extension_no_disponible'")
    expect(migracion).toContain("'job_no_configurado'")
    expect(migracion).toContain("v_worker.last_seen_at < v_now - interval '120 seconds'")
    expect(migracion).toContain("last_seen_at < now() - interval '30 days'")
    expect(migracion).toContain("'edadColaMasAntiguaSegundos'")
    expect(migracion).toContain("'edadEvidenciaMasAntiguaSegundos'")
    expect(migracion).toContain("'atrasoMasAntiguoSegundos'")
    expect(migracion).not.toContain('return_message')
    expect(migracion).not.toContain('auth.role()')
    expect(migracion).not.toMatch(/update\s+public\.articles/i)
    expect(migracion).not.toMatch(/delete\s+from\s+public\.articles/i)
  })

  it('limita la agenda a service_role y evita exposición por RLS', () => {
    const migracion = readFileSync(
      new URL('../../supabase/migrations/20260926082738_hu_ed_10_codex_agenda_checkpoints.sql', import.meta.url),
      'utf8'
    )
    expect(migracion).toContain('create or replace function public.get_codex_editorial_context')
    expect(migracion).toContain('create or replace function public.save_codex_editorial_agenda')
    expect(migracion.match(/to service_role/g)?.length).toBeGreaterThanOrEqual(4)
    expect(migracion).toContain('where category.is_active')
    expect(migracion).toContain("'topics', coalesce(")
    expect(migracion).toContain('from public.editorial_tags tag')
    expect(migracion).toContain('where tag.is_active')
    expect(migracion).toContain("'proposals', coalesce(")
    expect(migracion).toContain('where proposal.run_id = v_run.run_id')
    expect(migracion).toContain('interval \'30 days\'')
    expect(migracion).toContain("'America/Bogota'")
    expect(migracion).toContain('categoriesCheckpointed')
    expect(migracion).toContain("if v_run.status = 'failed' then")
    expect(migracion).toContain("v_run_status in ('completed', 'partial')")
    expect(migracion).toContain("v_opportunity ->> 'trendTitle'")
    expect(migracion).toContain("v_opportunity -> 'scores' ->> 'editorialFit'")
    expect(migracion).toContain("coalesce(v_opportunity -> 'scores' ->> 'editorialFit', '') !~")
    expect(migracion).toContain("(v_opportunity -> 'scores' ->> 'editorialFit')::integer not between 0 and 100")
    expect(migracion).toContain('select count(*) into v_saved_category')
    expect(migracion).toContain('v_saved_category > 7')

    const migrationEd25 = readFileSync(new URL(
      '../../supabase/migrations/20261007152635_hu_ed25_scoring_oportunidades_editoriales.sql',
      import.meta.url
    ), 'utf8')
    expect(migrationEd25).toContain("'searchConsole', coalesce(")
    expect(migrationEd25).toContain("'entities', coalesce(")
    expect(migrationEd25).toContain('priorityScore')
    expect(migrationEd25).toContain('v_expected_priority')
    expect(migrationEd25).toContain("'La evidencia Search Console no pertenece al reporte real más reciente.'")
    expect(migrationEd25).toContain('El formato v1 solo puede reanudar un checkpoint histórico sin evaluación.')
    expect(migrationEd25).toContain('editorial_codex_draft_create_gate')
    expect(migrationEd25).toContain('editorial_codex_proposal_create_gate')
    expect(migrationEd25).toContain('Solo una recomendación create con valor nuevo puede generar un borrador.')
    expect(migrationEd25).toContain('security invoker')
    expect(migrationEd25).toContain('from public, anon, authenticated')
    expect(migrationEd25).toContain('to service_role')
  })
})
