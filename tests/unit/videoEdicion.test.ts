import { describe, expect, it } from 'vitest'
import * as edicion from '../../scripts/video-edicion.mjs'
import * as descripcion from '../../scripts/video-descripcion.mjs'
import * as reels from '../../scripts/video-reels.mjs'
import * as familia from '../../scripts/video-estudio-familia.mjs'

type Edicion = { id: string, kicker: string, categoria: string, hashtags: string[], hashtagReel: string }
const edicionDe = edicion.edicionDe as (g: unknown) => Edicion
const nombreProyecto = edicion.nombreProyecto as (g: unknown) => string
const descripcionYoutube = descripcion.descripcionYoutube as unknown as (o: Record<string, unknown>) => string
const descripcionReel = reels.descripcionReel as unknown as (o: Record<string, unknown>) => string
const nombrePadre = familia.nombrePadre as (n: string) => string | null

describe('ediciones del video diario', () => {
  it('sin campo edicion el guion sigue siendo de fútbol colombiano', () => {
    expect(edicionDe({ fecha: '2026-11-21' }).id).toBe('colombia')
    expect(edicionDe({ edicion: 'desconocida' }).id).toBe('colombia')
    expect(nombreProyecto({ fecha: '2026-11-21' })).toBe('2026-11-21')
  })

  it('la edición internacional usa su carpeta, rótulo y categoría', () => {
    const guion = { fecha: '2026-11-21', edicion: 'Internacional' }
    expect(nombreProyecto(guion)).toBe('2026-11-21-internacional')
    expect(edicionDe(guion).kicker).toBe('NOTICIAS DEL FÚTBOL INTERNACIONAL')
    expect(edicionDe(guion).categoria).toBe('futbol-mundial')
  })

  it('el estudio reconoce los Reels de la edición internacional como hijos de su video', () => {
    expect(nombrePadre('2026-11-21-internacional-reel-2')).toBe('2026-11-21-internacional')
  })

  it('las descripciones llevan los hashtags de su edición', () => {
    const base = { guion: { bloques: [] }, manifiesto: { segmentos: [] } }
    expect(descripcionYoutube(base)).toContain('#FutbolColombiano')
    const internacional = descripcionYoutube({ ...base, guion: { edicion: 'internacional', bloques: [] } })
    expect(internacional).toContain('#FutbolInternacional')
    expect(internacional).not.toContain('#LigaBetPlay')
    expect(descripcionReel({ titular: 'x', slug: 'y' })).toContain('#LigaBetPlay')
    expect(descripcionReel({ titular: 'x', slug: 'y', edicion: edicionDe({ edicion: 'internacional' }) })).toContain('#FutbolInternacional')
  })
})
