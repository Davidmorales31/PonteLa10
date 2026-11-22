import { describe, expect, it } from 'vitest'
import { azarDesde, elegirFormato, fechaBogota, formatosElegibles } from '../../scripts/redes-selector-formato.mjs'
import { construirComposicionArticulo } from '../../scripts/redes-publicar-articulo.mjs'

const parrafo = (text: string) => ({ content: [{ text }] })
const nota = (extra = {}) => ({
  id: 'n1', slug: 'nota-uno', titulo: 'Nacional pierde con Junior', resumen: 'Resumen corto de la nota.',
  documento: { content: [parrafo('Primera oración suficientemente larga para ser un punto clave. Segunda oración también bastante larga para el carrusel. Tercera oración clave igual de larga para completar tres puntos.')] },
  ...extra
})

describe('selector de formato visual de redes', () => {
  it('el azar es reproducible y está en [0, 1)', () => {
    expect(azarDesde('a|2026-11-20')).toBe(azarDesde('a|2026-11-20'))
    expect(azarDesde('a|2026-11-20')).not.toBe(azarDesde('b|2026-11-20'))
    for (const s of ['x', 'y', 'z']) expect(azarDesde(s)).toBeGreaterThanOrEqual(0)
  })

  it('solo es elegible lo que la nota puede cumplir', () => {
    const sola = formatosElegibles({ id: 'x', titulo: 'Sin nada especial', resumen: '' })
    expect(sola).toEqual(['impacto', 'banda'])
    expect(formatosElegibles(nota())).toContain('carrusel')
    const conCita = nota({ documento: { content: [parrafo('Dijo: «Vamos a pelear hasta el último partido de la temporada con todo».')] } })
    expect(formatosElegibles(conCita)).toContain('cita')
    expect(formatosElegibles(nota({ titulo: 'Pasto se queda con 3 jugadores' }))).toContain('ficha')
  })

  it('círculo y versus esperan a la fase de fotos', () => {
    expect(formatosElegibles(nota())).not.toContain('circulo')
    expect(formatosElegibles(nota(), { fotosExtra: 1 })).toContain('circulo')
  })

  it('no repite el formato de las dos últimas piezas', () => {
    const hoy = fechaBogota()
    for (let i = 0; i < 40; i++) {
      const f = elegirFormato(nota({ id: `n${i}` }), { historial: [{ formato: 'impacto', fecha: hoy }, { formato: 'banda', fecha: hoy }] })
      expect(['impacto', 'banda']).not.toContain(f)
    }
    // Con la última pieza en impacto, la siguiente cambia aunque impacto ya se haya usado muchas veces hoy.
    const f = elegirFormato(nota({ id: 'q' }), { historial: Array.from({ length: 30 }, () => ({ formato: 'impacto', fecha: hoy })) })
    expect(f).not.toBe('impacto')
  })

  it('varía entre notas distintas y no tiene tope por formato ni por día', () => {
    const usados = new Set(Array.from({ length: 60 }, (_, i) => elegirFormato(nota({ id: `v${i}` }))))
    expect(usados.size).toBeGreaterThanOrEqual(3)
    const hoy = fechaBogota()
    // 100 piezas de hoy en todos los formatos: sigue eligiendo uno válido (nunca se bloquea ni cae a un formato fijo).
    const muchas = Array.from({ length: 100 }, (_, i) => ({ formato: ['impacto', 'banda', 'carrusel'][i % 3] as string, fecha: hoy }))
    expect(formatosElegibles(nota())).toContain(elegirFormato(nota(), { historial: muchas }))
  })
})

describe('composición con imágenes locales', () => {
  it('una diapositiva por imagen, sin texto ni logo encima', () => {
    const c = construirComposicionArticulo(nota({ tituloPortada: 'Titular' }), null, '', ['m1', 'm2', 'm3'])
    expect(c.diapositivas).toHaveLength(3)
    expect(c.diapositivas[1]).toEqual({ plantilla: 'una', imagenes: [{ medioId: 'm2' }], logos: [], textos: [] })
  })
  it('sin imágenes locales conserva el formato clásico', () => {
    const c = construirComposicionArticulo(nota(), 'abc', '')
    expect(c.diapositivas[0].textos).toHaveLength(1)
  })
})
