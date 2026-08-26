import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  esquemaCrearIngestaEditorial,
  normalizarUrlFuenteEditorial
} from '~/utils/editorial/ingestas'

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
      '../../supabase/migrations/0010_editorial_ingestion_queue.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain('enable row level security')
    expect(migracion).toContain("has_editorial_permission('ingestas.ver')")
    expect(migracion).toContain("has_editorial_permission('ingestas.gestionar')")
    expect(migracion).toContain('idx_editorial_ingestions_active_url')
    expect(migracion).toContain('cancel_editorial_ingestion')
    expect(migracion).not.toContain('grant delete on public.editorial_ingestions')
  })
})
