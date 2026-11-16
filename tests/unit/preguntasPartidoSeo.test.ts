import { describe, expect, it } from 'vitest'
import {
  construirFaqPartidoSeo,
  construirPreguntasPartidoSeo,
  type DatosPreguntasPartido
} from '../../utils/preguntasPartidoSeo'

const base: DatosPreguntasPartido = {
  local: 'Atlético Nacional',
  visitante: 'Once Caldas',
  fechaIso: '2026-11-20T01:30:00Z',
  estado: 'scheduled',
  golesLocal: null,
  golesVisitante: null,
  estadio: null,
  ciudad: null,
  competencia: 'liga-betplay'
}

describe('preguntas frecuentes de la ficha de partido', () => {
  it('responde solo con datos publicados cuando faltan sede, marcador y transmisión', () => {
    const preguntas = construirPreguntasPartidoSeo(base)

    expect(preguntas).toHaveLength(3)
    expect(preguntas[1]!.respuesta).toContain('no está confirmado')
    expect(preguntas[2]!.respuesta).toBe('El marcador oficial todavía no está publicado.')
    expect(preguntas.some(item => item.pregunta.includes('estadio'))).toBe(false)
  })

  it('añade marcador y sede cuando existen', () => {
    const preguntas = construirPreguntasPartidoSeo({
      ...base,
      estado: 'finished',
      golesLocal: 2,
      golesVisitante: 1,
      estadio: 'Atanasio Girardot',
      ciudad: 'Medellín'
    })

    expect(preguntas[2]!.respuesta).toBe('Resultado registrado: Atlético Nacional 2–1 Once Caldas en Liga BetPlay.')
    expect(preguntas[3]!.pregunta).toBe('¿En qué estadio se juega Atlético Nacional vs Once Caldas?')
    expect(preguntas[3]!.respuesta).toBe('La sede publicada en la ficha es Atanasio Girardot, en Medellín.')
  })

  it('solo menciona transmisiones confirmadas, verificadas y con fuente HTTPS', () => {
    const preguntas = construirPreguntasPartidoSeo({
      ...base,
      transmisiones: [
        { channel: 'Win Sports', countryCode: 'CO', status: 'confirmed', verifiedAt: '2026-11-14T10:00:00Z', sourceUrl: 'https://dimayor.com.co/x' },
        { channel: 'Canal Rumor', countryCode: 'CO', status: 'rumor', verifiedAt: '2026-11-14T10:00:00Z', sourceUrl: 'https://ejemplo.com' },
        { channel: 'Canal Sin Fuente', countryCode: 'CO', status: 'confirmed', verifiedAt: null, sourceUrl: 'https://ejemplo.com' },
        { channel: 'Canal HTTP', countryCode: 'CO', status: 'confirmed', verifiedAt: '2026-11-14T10:00:00Z', sourceUrl: 'http://ejemplo.com' }
      ]
    })

    expect(preguntas[1]!.respuesta).toContain('Win Sports')
    expect(preguntas[1]!.respuesta).not.toMatch(/Rumor|Sin Fuente|HTTP/)
  })

  it('construye FAQPage con las mismas preguntas y respuestas visibles', () => {
    const preguntas = construirPreguntasPartidoSeo(base)
    const faq = construirFaqPartidoSeo(preguntas) as { '@type': string, mainEntity: Array<{ name: string, acceptedAnswer: { text: string } }> }

    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity.map(item => item.name)).toEqual(preguntas.map(item => item.pregunta))
    expect(faq.mainEntity.map(item => item.acceptedAnswer.text)).toEqual(preguntas.map(item => item.respuesta))
    expect(construirFaqPartidoSeo([])).toBeNull()
  })
})
