import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  esquemaCrearIngestaEditorial,
  normalizarUrlFuenteEditorial
} from '~/utils/editorial/ingestas'
import {
  esquemaEvidenciaIngestaEditorial,
  versionContratoEvidenciaIngesta
} from '~/utils/editorial/evidenciaIngesta'
import { esquemaPropuestaBorradorIa } from '~/utils/editorial/redaccionIa'

describe('ingestas editoriales', () => {
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
        duracionSegundos: 12,
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
  })

  it('exige traducción cuando el original está en inglés', () => {
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
        idioma: 'en',
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
