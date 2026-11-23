import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as rubrica from '../../scripts/documental-rubrica.mjs'
import * as selector from '../../scripts/documental-elegir.mjs'

const config = JSON.parse(readFileSync('config/documental.json', 'utf8'))
const banco = JSON.parse(readFileSync('config/bancoDocumentales.json', 'utf8'))
const evaluar = rubrica.evaluarDocumental as (g: unknown, c: unknown, o?: unknown) => { estado: string, errores: string[], metricas: { palabras: number }, capitulosYoutube: string[] }

const relleno = (n: number, semilla: string) => Array.from({ length: n }, (_, i) => `${semilla}${i % 7}`).join(' ')
const foto = { tipo: 'foto', imagen: 'https://upload.wikimedia.org/x.jpg', credito: 'Wikimedia Commons' }

function guionValido() {
  const cap = (id: string, palabras: number, extra = '') => ({ id, titulo: `Capítulo ${id}`, voz: `${relleno(palabras, 'dato')} ${extra}`.trim(), fuentes: ['f1'], visuales: [foto] })
  const conPregunta = '¿Ustedes qué creen de esta disciplina?'
  return {
    tipo: 'documental', tema: 'cristiano-ronaldo', protagonista: 'Cristiano Ronaldo',
    preguntaCentral: '¿Arrogancia o disciplina que nadie soportaría?',
    titulos: ['Lo llamaron ARROGANTE | Cristiano Ronaldo | Documental', 'La DISCIPLINA que nadie entendió | Cristiano Ronaldo'],
    miniatura: { texto: 'ARROGANTE' },
    actos: [
      { id: 'pregunta', titulo: 'La pregunta', capitulos: [{ id: 'c00', titulo: 'La pregunta', voz: 'Lo odian o lo aman. ¿Arrogancia o disciplina que nadie soportaría?', fuentes: [], visuales: [foto] }] },
      { id: 'origen', titulo: 'Origen', capitulos: [cap('c01', 300, conPregunta), cap('c02', 300)] },
      { id: 'ascenso', titulo: 'Ascenso', capitulos: [cap('c03', 320, conPregunta), cap('c04', 320), cap('c05', 300)] },
      { id: 'crisis', titulo: 'Crisis', capitulos: [cap('c06', 320, conPregunta), cap('c07', 320), cap('c08', 300)] },
      { id: 'resolucion', titulo: 'Resolución', capitulos: [cap('c09', 320, conPregunta), cap('c10', 300)] },
      { id: 'legado', titulo: 'Legado', capitulos: [cap('c11', 250, 'Al final, ¿arrogancia o disciplina? Ustedes ya tienen la respuesta, ¿qué piensan?')] }
    ],
    preguntaFinal: '¿Y tú, lo admiras o no?',
    cierre: 'Suscríbete y activa la campana. Nos vemos el próximo viernes.',
    fuentes: [
      { id: 'f1', url: 'https://es.wikipedia.org/wiki/Cristiano_Ronaldo', titulo: 'Cristiano Ronaldo', medio: 'Wikipedia' },
      { id: 'f2', url: 'https://www.marca.com/a', titulo: 'a', medio: 'Marca' },
      { id: 'f3', url: 'https://as.com/b', titulo: 'b', medio: 'AS' },
      { id: 'f4', url: 'https://www.bbc.com/c', titulo: 'c', medio: 'BBC' },
      { id: 'f5', url: 'https://www.uefa.com/d', titulo: 'd', medio: 'UEFA' }
    ]
  }
}

describe('rúbrica del documental', () => {
  it('aprueba un guion con la estructura medida y da los capítulos de YouTube', () => {
    const r = evaluar(guionValido(), config, { banco })
    expect(r.errores).toEqual([])
    expect(r.estado).toBe('APROBADO')
    expect(r.capitulosYoutube[0]).toBe('0:00 La pregunta')
    expect(r.capitulosYoutube).toHaveLength(12)
  })

  it('rechaza saludo al inicio, actos fuera de orden, citas sin atribución y fotos sin crédito', () => {
    const g = guionValido()
    g.actos[0].capitulos[0].voz = 'Hola a todos, ¿arrogancia o disciplina?'
    ;[g.actos[2], g.actos[3]] = [g.actos[3], g.actos[2]]
    g.actos[1].capitulos[0].voz += ' «nunca voy a perder una final otra vez» y así fue.'
    g.actos[1].capitulos[1].visuales = [{ tipo: 'foto', imagen: 'https://x.com/a.jpg', credito: '' }]
    const r = evaluar(g, config, { banco })
    expect(r.estado).toBe('RECHAZADO')
    const todo = r.errores.join('\n')
    expect(todo).toMatch(/no puede empezar con «hola»/)
    expect(todo).toMatch(/Los actos deben ser, en orden/)
    expect(todo).toMatch(/Cita sin atribución/)
    expect(todo).toMatch(/Foto sin URL https o sin crédito/)
  })

  it('una cita atribuida sí pasa', () => {
    expect(rubrica.citasSinAtribucion('Según el diario, «nunca voy a perder una final otra vez».', config.verbosDeAtribucion)).toEqual([])
  })

  it('exige revisión expresa en temas sensibles y largo de 21 a 30 minutos', () => {
    const g = { ...guionValido(), tema: 'andres-escobar' }
    expect(evaluar(g, config, { banco }).errores.join('\n')).toMatch(/Tema sensible/)
    const corto = guionValido()
    corto.actos = corto.actos.map(a => ({ ...a, capitulos: a.capitulos.slice(0, 1) }))
    expect(evaluar(corto, config, { banco }).errores.join('\n')).toMatch(/Largo: /)
  })
})

describe('selector del tema', () => {
  const fotos = [{ temas: [
    { tema: 'Dibu Martínez', puntaje: 60, entidades: ['Emiliano Martínez'], titulares: [{ titulo: 'El Dibu ataja dos penales' }, { titulo: 'Dibu Martínez, figura' }] },
    { tema: 'Pedri', puntaje: 45, entidades: ['Pedri'], titulares: [] }
  ] }]

  it('el portero en tendencia sube al primer lugar aunque su interés de fondo no esté medido', () => {
    const ranking = selector.puntuarTemas(banco, fotos, { hoy: '2026-11-23' }) as Array<{ id: string, tendencia: number }>
    expect(ranking[0].id).toBe('emiliano-martinez')
    expect(ranking[0].tendencia).toBeGreaterThanOrEqual(60)
  })

  it('no repite un tema publicado hace menos de un año y suma la efeméride', () => {
    const conPublicado = { ...banco, temas: banco.temas.map((t: { id: string }) => (t.id === 'lionel-messi' ? { ...t, publicado: '2026-06-01' } : t)) }
    const ranking = selector.puntuarTemas(conPublicado, [], { hoy: '2026-11-23' }) as Array<{ id: string }>
    expect(ranking.some(t => t.id === 'lionel-messi')).toBe(false)
    const cerca = selector.puntuarTemas(banco, [], { hoy: '2026-06-15' }) as Array<{ id: string, bono: number }>
    expect(cerca.find(t => t.id === 'la-mano-de-dios')?.bono).toBeGreaterThan(0)
    expect(selector.diasHastaEfemeride('06-22', '2026-06-15')).toBe(7)
  })

  it('propone figuras en tendencia que no están en el banco, sin clubes', () => {
    const nuevos = selector.candidatosNuevos(banco, fotos, 30, ['Liverpool']) as Array<{ tema: string }>
    expect(nuevos.map(n => n.tema)).toEqual(['Pedri'])
  })

  it('reconoce el alias como palabra completa', () => {
    expect(selector.mencionaAlias('El Dibu ataja', ['dibu'])).toBe(true)
    expect(selector.mencionaAlias('Dibujo animado', ['dibu'])).toBe(false)
  })
})
