import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  esquemaCrearIngestaEditorial,
  normalizarUrlFuenteEditorial
} from '~/utils/editorial/ingestas'
import { normalizarPropuestaProveedor } from '~/server/utils/ai/deepseekRedaccion'
import {
  esquemaEvidenciaIngestaEditorial,
  versionContratoEvidenciaIngesta
} from '~/utils/editorial/evidenciaIngesta'
import { esquemaPropuestaBorradorIa } from '~/utils/editorial/redaccionIa'

describe('ingestas editoriales', () => {
  it('retira atribuciones de TikTok del cuerpo y conserva párrafos desarrollados', () => {
    const entrada = {
      ingestaId: 'f0098a0f-33b8-4509-921d-f68f132f165e',
      tituloSugerido: '',
      instrucciones: '',
      urlFuente: 'https://www.tiktok.com/@autor/video/7000000000000000000',
      creditos: 'Video original: autor',
      categoriaId: null,
      tipoSugerido: 'noticia',
      segmentos: [{ id: 0, inicioSegundos: 0, finSegundos: 4, texto: 'Dato verificable.' }]
    }
    const propuesta = normalizarPropuestaProveedor({
      titulo: 'Una historia respaldada por la evidencia disponible',
      resumen: 'Resumen editorial de la información disponible.',
      tipo: 'noticia',
      documento: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Este primer fragmento desarrolla los hechos disponibles con el contexto necesario para que la audiencia entienda la historia.' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'El segundo fragmento aporta consecuencias y mantiene una lectura continua sin separar cada oración de forma artificial.' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Fuente: Video original: autor - https://www.tiktok.com/@autor/video/7000000000000000000' }] }
        ]
      },
      seo: {}, fuente: {}, segmentosFundamento: [{ id: 0 }
      ], afirmacionesPorCorroborar: [], advertencias: []
    }, entrada) as { documento: { content: Array<{ content: Array<{ text: string }> }> } }

    const parrafos = propuesta.documento.content.map(bloque => bloque.content[0]?.text || '')
    expect(parrafos.join(' ')).not.toContain('tiktok.com')
    expect(parrafos.join(' ')).not.toContain('Video original')
    expect(parrafos).toHaveLength(1)
    expect(parrafos[0]).toContain('primer fragmento')
    expect(parrafos[0]).toContain('segundo fragmento')
  })

  it('normaliza la URL, elimina rastreo y detecta la plataforma', () => {
    const fuente = normalizarUrlFuenteEditorial(
      'http://www.tiktok.com/@autor/video/123/?utm_source=red&lang=es#comentarios'
    )

    expect(fuente).toEqual({
      urlNormalizada: 'https://www.tiktok.com/@autor/video/123?lang=es',
      hostFuente: 'www.tiktok.com',
      plataforma: 'tiktok'
    })
  })

  it('ordena parámetros funcionales y retira identificadores de campaña', () => {
    const fuente = normalizarUrlFuenteEditorial(
      'https://ejemplo.com/noticia/?z=2&fbclid=secreto&a=1'
    )

    expect(fuente.urlNormalizada).toBe('https://ejemplo.com/noticia?a=1&z=2')
    expect(fuente.plataforma).toBe('web')
  })

  it.each([
    'http://localhost:3000/noticia',
    'http://127.0.0.1/privado',
    'http://10.0.0.8/recurso',
    'file:///etc/passwd',
    'https://usuario:clave@ejemplo.com/noticia'
  ])('rechaza fuentes que no deben procesarse: %s', (urlFuente) => {
    expect(() => normalizarUrlFuenteEditorial(urlFuente)).toThrow()
  })

  it('aplica reglas editoriales seguras por defecto', () => {
    const resultado = esquemaCrearIngestaEditorial.parse({
      urlFuente: 'https://www.youtube.com/watch?v=abc123'
    })

    expect(resultado.reglas).toEqual({
      tipoContenido: 'auto',
      conservarVideo: true,
      exigirCreditos: true,
      generarSeo: true,
      idioma: 'es-CO'
    })
    expect(resultado.categoriaId).toBeNull()
  })

  it('respalda permisos, RLS, deduplicación y cancelación en la migración', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/0013_ingesta_worker_durable.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain('enable row level security')
    expect(migracion).toContain("has_editorial_permission('ingestas.ver')")
    expect(migracion).toContain("has_editorial_permission('ingestas.registrar')")
    expect(migracion).toContain("private.ensure_ingestion_worker('ingestas.worker.reclamar')")
    expect(migracion).toContain("'workerIngesta'")
    expect(migracion).toContain("'evidence_ready'")
    expect(migracion).toContain('idx_editorial_ingestions_protocol_two_queue')
    expect(migracion).toContain('cancel_editorial_ingestion')
    expect(migracion).toContain('requeue_editorial_ingestion')
    expect(migracion).toContain('claim_next_editorial_ingestion')
    expect(migracion).toContain('LEGACY_PROCESSING_DISABLED')
    expect(migracion).toContain("status = 'evidence_ready'")
    expect(migracion).not.toContain("status = 'draft_created', article_id")
    expect(migracion).not.toContain('grant delete on public.editorial_ingestions')
  })

  it('mantiene la eliminación definitiva limitada a fallos y protegida por MFA', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/0014_eliminar_ingestas_fallidas.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain('delete_failed_editorial_ingestion')
    expect(migracion).toContain("v_ingestion.status <> 'failed'")
    expect(migracion).toContain('public.has_aal2()')
    expect(migracion).toContain("p_confirmation is distinct from 'ELIMINAR'")
    expect(migracion).toContain('delete from private.editorial_ingestion_attempts')
    expect(migracion).not.toContain('grant delete on public.editorial_ingestions')
  })

  it('limita temas automáticos al worker, los deduplica y deja auditoría', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/20260923100000_temas_publicos_automaticos.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain("private.ensure_ingestion_worker('ingestas.worker.crearTemas')")
    expect(migracion).toContain('jsonb_array_length(p_new_topics) > 3')
    expect(migracion).toContain('where slug = v_slug or lower(name) = lower(v_name)')
    expect(migracion).toContain("'ingesta.temas_automaticos_creados'")
    expect(migracion).toContain('pg_advisory_xact_lock')
    expect(migracion).toContain('prepare_editorial_article_from_ingestion')
    expect(migracion).not.toContain('insert into public.categories')
    expect(migracion).not.toContain('insert into public.editorial_labels')
  })

  it('valida evidencia final en español sin crear borrador', () => {
    const evidencia = esquemaEvidenciaIngestaEditorial.parse({
      versionContrato: versionContratoEvidenciaIngesta,
      metadatos: {
        plataforma: 'tiktok',
        videoId: '7000000000000000000',
        urlFuenteFinal: 'https://www.tiktok.com/@demo/video/7000000000000000000',
        titulo: 'Demo',
        autor: 'Autor',
        creditos: 'Video original: Autor',
        duracionSegundos: 181,
        consultadoEn: '2026-09-10T16:00:05Z'
      },
      original: {
        idioma: 'es',
        modelo: 'base',
        motor: 'faster-whisper',
        versionMotor: 'runtime',
        segmentos: [
          { id: 0, inicioSegundos: 0, finSegundos: 4, texto: 'Texto de prueba.' }
        ]
      },
      traduccion: null,
      verificacion: { estado: 'pendiente', fuentesIndependientes: [] },
      limpieza: { completada: true, archivosTemporalesRestantes: 0 },
      advertencias: []
    })

    expect(evidencia.original.idioma).toBe('es')
    expect(evidencia.metadatos.duracionSegundos).toBe(181)
  })

  it('admite el idioma detectado y exige traducción cuando no está en español', () => {
    expect(() => esquemaEvidenciaIngestaEditorial.parse({
      versionContrato: versionContratoEvidenciaIngesta,
      metadatos: {
        plataforma: 'tiktok',
        videoId: '7000000000000000000',
        urlFuenteFinal: 'https://www.tiktok.com/@demo/video/7000000000000000000',
        titulo: null,
        autor: null,
        creditos: 'Video original: autor de TikTok',
        duracionSegundos: 12,
        consultadoEn: '2026-09-10T16:00:05Z'
      },
      original: {
        idioma: 'fr',
        modelo: 'base',
        motor: 'faster-whisper',
        versionMotor: 'runtime',
        segmentos: [
          { id: 0, inicioSegundos: 0, finSegundos: 4, texto: 'Test text.' }
        ]
      },
      traduccion: null,
      verificacion: { estado: 'pendiente', fuentesIndependientes: [] },
      limpieza: { completada: true, archivosTemporalesRestantes: 0 },
      advertencias: []
    })).toThrow()
  })

  it('mantiene la propuesta de IA dentro del contrato editorial y con segmentos trazables', () => {
    const propuesta = esquemaPropuestaBorradorIa.safeParse({
      versionContrato: 1,
      titulo: 'Una noticia respaldada por la evidencia disponible',
      resumen: 'Resumen editorial de la información disponible.',
      tipo: 'noticia', documento: { type: 'doc', content: [] },
      seo: { titulo: '', descripcion: '', textoSocial: '' }, categoriaId: null, temaIds: [],
      fuente: { url: 'https://ejemplo.com/fuente', nombre: 'Fuente', autor: '', creditos: 'Crédito de la fuente' },
      segmentosFundamento: [{ id: 0, inicioSegundos: 0, finSegundos: 3, texto: 'Dato verificable.' }],
      afirmacionesPorCorroborar: [], advertencias: []
    })
    expect(propuesta.success).toBe(true)
  })
})
