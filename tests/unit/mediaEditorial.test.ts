import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { procesarImagenEditorial } from '~/server/utils/procesadorImagenEditorial'
import {
  crearTituloDesdeArchivo,
  esquemaMetadatosMedioEditorial,
  limpiarNombreArchivoEditorial
} from '~/utils/media/editorial'

describe('biblioteca multimedia editorial', () => {
  it('exige texto alternativo salvo en imágenes decorativas', () => {
    const base = {
      titulo: 'Celebración en el estadio',
      textoAlternativo: '',
      esDecorativa: false,
      pieDeFoto: '',
      credito: '',
      urlFuente: ''
    }

    expect(esquemaMetadatosMedioEditorial.safeParse(base).success).toBe(false)
    expect(esquemaMetadatosMedioEditorial.safeParse({
      ...base,
      esDecorativa: true
    }).success).toBe(true)
    expect(esquemaMetadatosMedioEditorial.safeParse({
      ...base,
      textoAlternativo: 'Jugador celebrando frente a la tribuna.'
    }).success).toBe(true)
  })

  it('normaliza nombres y títulos sin conservar rutas locales', () => {
    expect(limpiarNombreArchivoEditorial(
      'C:\\usuarios\\equipo\\jugada_final!.PNG'
    )).toBe('jugada_final.PNG')
    expect(crearTituloDesdeArchivo('jugada_final.PNG'))
      .toBe('jugada final')
  })

  it('convierte imágenes válidas a WebP y conserva dimensiones', async () => {
    const original = await sharp({
      create: {
        width: 1200,
        height: 675,
        channels: 3,
        background: '#174ea6'
      }
    }).png().toBuffer()

    const resultado = await procesarImagenEditorial(original, 'image/png')
    const metadatos = await sharp(resultado.contenido).metadata()

    expect(resultado.tipoMime).toBe('image/webp')
    expect(resultado.ancho).toBe(1200)
    expect(resultado.alto).toBe(675)
    expect(resultado.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(metadatos.format).toBe('webp')
  })

  it('define bucket, RLS, auditoría y protección de referencias', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/0006_editorial_media_library.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain("'editorial-media'")
    expect(migracion).toContain('public.has_editorial_permission(\'media.subir\')')
    expect(migracion).toContain('public.has_editorial_permission(\'media.eliminar\')')
    expect(migracion).toContain('public.has_aal2()')
    expect(migracion).toContain('prevent_referenced_media_delete')
    expect(migracion).toContain('audit_media_change')
    expect(migracion).toContain('next_cover_media_id uuid')
    expect(migracion).not.toContain('service_role')
  })
})
