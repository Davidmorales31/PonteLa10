import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contarPalabras, evaluarGuion, segundosPara } from '../../scripts/video-rubrica-guion.mjs'

interface Criterio { id: string, ok: boolean, detalle: string }
interface Resultado { puntaje: number, aprobado: boolean, obligatoriosFallidos: string[], duracionEstimadaSegundos: number, palabrasTotales: number, criterios: Criterio[] }
const evaluar = evaluarGuion as (guion: unknown, config: unknown) => Resultado
const config = JSON.parse(readFileSync(new URL('../../config/videoDiario.json', import.meta.url), 'utf8'))

const relleno = (cantidad: number) => Array.from({ length: cantidad }, (_, i) => `dato${i}`).join(' ')

interface Plano { imagen: string, credito: string, movimiento: string }
interface Bloque { id: string, articuloSlug: string, fuente: string, rumor: boolean, caraBreve: string, voz: string, planos: Plano[] }
interface Guion { fecha: string, tituloVideo: string, gancho: { texto: string, fuente: string }, presentacion: { texto: string }, bloques: Bloque[], preguntaFinal: string, cierre: { texto: string } }

function bloque(id: string, extra: Partial<Bloque> = {}): Bloque {
  return {
    id,
    articuloSlug: `articulo-${id}`,
    fuente: 'Win Sports',
    rumor: false,
    caraBreve: 'Esto pasó hoy en el fútbol colombiano.',
    voz: `Según Win Sports, ${relleno(100)}`,
    planos: Array.from({ length: 6 }, (_, i) => ({ imagen: `https://x/${id}-${i}.jpg`, credito: 'Colprensa (vía Win Sports)', movimiento: 'zoom-in' })),
    ...extra
  }
}

function guionBase(): Guion {
  return {
    fecha: '2026-11-18',
    tituloVideo: 'América y Once Caldas van a la final de la Copa BetPlay: lo que dejó la noche',
    gancho: { texto: 'América y Once Caldas jugarán la final de la Copa BetPlay, según Dimayor.', fuente: 'Dimayor' },
    presentacion: { texto: 'Hoy en Pont3la10: la final de Copa, los cuadrangulares y el debut de Cali.' },
    bloques: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'].map(id => bloque(id)),
    preguntaFinal: '¿Quién crees que levanta la Copa?',
    cierre: { texto: 'Suscríbete, activa la campana y nos vemos en el siguiente video.' }
  }
}

describe('rúbrica del guion del video diario', () => {
  it('cuenta palabras y estima segundos', () => {
    expect(contarPalabras('  uno dos   tres ')).toBe(3)
    expect(contarPalabras(null)).toBe(0)
    expect(Math.round(segundosPara(155, 155))).toBe(60)
  })

  it('aprueba un guion completo', () => {
    const resultado = evaluar(guionBase(), config)
    expect(resultado.criterios.filter(c => !c.ok)).toEqual([])
    expect(resultado.aprobado).toBe(true)
    expect(resultado.puntaje).toBe(100)
    expect(resultado.duracionEstimadaSegundos).toBeGreaterThan(240)
  })

  it('rechaza un gancho con saludo', () => {
    const guion = guionBase()
    guion.gancho.texto = 'Hola amigos, bienvenidos otra vez al canal de noticias de Pont3la10 con mucho fútbol.'
    const resultado = evaluar(guion, config)
    expect(resultado.criterios.find(c => c.id === 'gancho_sin_saludo')?.ok).toBe(false)
    expect(resultado.aprobado).toBe(false)
  })

  it('exige fuente atribuida en cada bloque', () => {
    const guion = guionBase()
    guion.bloques[2] = bloque('b3', { voz: relleno(100), fuente: '' })
    const resultado = evaluar(guion, config)
    expect(resultado.criterios.find(c => c.id === 'bloques_con_fuente')?.detalle).toContain('b3')
    expect(resultado.obligatoriosFallidos).toContain('bloques_con_fuente')
  })

  it('exige que un rumor se cuente como rumor', () => {
    const guion = guionBase()
    guion.bloques[0] = bloque('b1', { rumor: true, voz: `Según Win Sports ${relleno(100)}`.replace('Según', 'Informó') })
    expect(evaluar(guion, config).criterios.find(c => c.id === 'rumor_atribuido')?.ok).toBe(false)
    guion.bloques[0] = bloque('b1', { rumor: true, voz: `Según Win Sports, es una versión sin confirmar. ${relleno(95)}` })
    expect(evaluar(guion, config).criterios.find(c => c.id === 'rumor_atribuido')?.ok).toBe(true)
  })

  it('exige crédito en cada foto y suficientes planos', () => {
    const guion = guionBase()
    guion.bloques[1].planos[0].credito = ''
    guion.bloques[3].planos = guion.bloques[3].planos.slice(0, 2)
    const resultado = evaluar(guion, config)
    expect(resultado.criterios.find(c => c.id === 'fotos_con_credito')?.detalle).toContain('b2')
    expect(resultado.criterios.find(c => c.id === 'cambio_visual')?.detalle).toContain('b4')
    expect(resultado.aprobado).toBe(false)
  })

  it('rechaza una duración fuera de rango y un título con demasiados ganchos', () => {
    const corto = guionBase()
    corto.bloques = corto.bloques.slice(0, 2)
    expect(evaluar(corto, config).obligatoriosFallidos).toContain('duracion_total')
    const titulo = guionBase()
    titulo.tituloVideo = 'Uno largo aquí | Dos largo aquí | Tres largo aquí | Cuatro largo aquí | Cinco largo aquí'
    expect(evaluar(titulo, config).criterios.find(c => c.id === 'titulo_video')?.ok).toBe(false)
  })

  it('exige pregunta final y cierre con suscripción', () => {
    const guion = guionBase()
    guion.preguntaFinal = 'Eso fue todo.'
    guion.cierre.texto = 'Nos vemos mañana.'
    const resultado = evaluar(guion, config)
    expect(resultado.criterios.find(c => c.id === 'pregunta_final')?.ok).toBe(false)
    expect(resultado.criterios.find(c => c.id === 'cierre')?.ok).toBe(false)
  })

  it('tolera un guion vacío sin lanzar', () => {
    const resultado = evaluar({}, config)
    expect(resultado.aprobado).toBe(false)
    expect(resultado.puntaje).toBeLessThan(50)
  })
})
