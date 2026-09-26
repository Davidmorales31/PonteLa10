import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { firmaCodexEsValida } from '~/server/utils/codexEditorialPrivado'
import {
  esquemaAgendaCodex,
  esquemaConsultaSaludCodex,
  esquemaPortadaCodex,
  esquemaPropuestaCodex
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
    const propuesta = {
      idempotencyKey: '45d8b1c5-47e7-42b8-9ac5-ea753c4a5ebf',
      runId: '14a5f2b0-a9c1-41b2-9b82-729f52c3b4d2',
      categoryId: 'ef3716e2-351e-4bc6-af69-883b17e91111',
      storyFingerprint: 'a'.repeat(64),
      title: 'Una historia deportiva suficientemente clara',
      summary: 'Un resumen editorial de prueba que explica por qué importa esta historia.',
      contentType: 'opinion' as const,
      body: 'p'.repeat(500),
      bodyJson: {
        type: 'doc' as const,
        content: [{
          type: 'paragraph' as const,
          content: [{ type: 'text' as const, text: 'p'.repeat(500) }]
        }]
      },
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
  })
})
