import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as rubrica from '../../scripts/documental-rubrica.mjs'
import * as selector from '../../scripts/documental-elegir.mjs'

const config = JSON.parse(readFileSync('config/documental.json', 'utf8'))
const banco = JSON.parse(readFileSync('config/bancoDocumentales.json', 'utf8'))
const evaluar = rubrica.evaluarDocumental as (g: unknown, c: unknown, o?: unknown) => { estado: string, formato: string, errores: string[], avisos: string[], metricas: { palabras: number }, capitulosYoutube: string[] }

const relleno = (n: number, semilla: string) => Array.from({ length: n }, (_, i) => `${semilla}${i % 7}`).join(' ')
const foto = { tipo: 'foto', imagen: 'https://upload.wikimedia.org/x.jpg', credito: 'Wikimedia Commons' }
const video = { tipo: 'video', video: 'https://upload.wikimedia.org/v.webm', credito: 'Autor (Wikimedia Commons)', licencia: 'CC BY 3.0' }
let n = 0
const fotoUnica = () => ({ ...foto, imagen: `https://upload.wikimedia.org/x${n++}.jpg` })

function guionValido() {
  const cap = (id: string, palabras: number, extra = '') => ({ id, titulo: `Capítulo ${id}`, voz: `${relleno(palabras, 'dato')} ${extra}`.trim(), fuentes: ['f1'], visuales: [fotoUnica(), video] })
  const conPregunta = '¿Ustedes qué creen de esta disciplina?'
  return {
    tipo: 'documental', tema: 'cristiano-ronaldo', protagonista: 'Cristiano Ronaldo',
    preguntaCentral: '¿Arrogancia o disciplina que nadie soportaría?',
    titulos: ['Lo llamaron ARROGANTE | Cristiano Ronaldo | Documental', 'La DISCIPLINA que nadie entendió | Cristiano Ronaldo'],
    miniatura: { texto: 'ARROGANTE' },
    actos: [
      { id: 'pregunta', titulo: 'La pregunta', capitulos: [{ id: 'c00', titulo: 'La pregunta', voz: 'Lo odian o lo aman. ¿Arrogancia o disciplina que nadie soportaría?', fuentes: [], visuales: [fotoUnica(), video] }] },
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

  it('exige mitad video o animación y no repetir la misma foto más de 3 veces', () => {
    const g = guionValido()
    const misma = { tipo: 'foto', imagen: 'https://upload.wikimedia.org/igual.jpg', credito: 'X' }
    for (const acto of g.actos) for (const c of acto.capitulos) c.visuales = [misma, { ...misma }]
    const todo = evaluar(g, config, { banco }).errores.join(' | ')
    expect(todo).toMatch(/no tiene video ni animación/)
    expect(todo).toMatch(/Las fotos son 100 %/)
    expect(todo).toMatch(/La misma foto se usa 24 veces/)
  })

  it('testimonios: 3 como máximo, de 12 s como mucho y con subtítulo', () => {
    const g = guionValido()
    const t = { tipo: 'testimonio', video: 'https://upload.wikimedia.org/e.webm', credito: 'X', licencia: 'Dominio público', desde: 10, hasta: 18, texto: 'Hola' }
    g.actos[0].capitulos[0].visuales.push(t)
    expect(evaluar(g, config, { banco }).errores).toEqual([])
    for (const c of g.actos[1].capitulos) c.visuales.push({ ...t })
    g.actos[2].capitulos[0].visuales.push({ ...t, hasta: 40, texto: '' })
    const todo = evaluar(g, config, { banco }).errores.join(' | ')
    expect(todo).toMatch(/máximo 3/)
    expect(todo).toMatch(/sin URL https, crédito, licencia o subtítulo/)
    expect(todo).toMatch(/entre 0 y 12 s/)
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

describe('formatos del documental', () => {
  const conPregunta = '¿Ustedes qué creen de esto?'
  function guionDeFormato(formato: string, actos: string[], capitulosPorActo: number[], palabras: number) {
    const base = guionValido()
    let k = 1
    const cap = (extra = '') => ({ id: `c${String(k++).padStart(2, '0')}`, titulo: `Capítulo ${k}`, voz: `${relleno(palabras, 'dato')} ${extra}`.trim(), fuentes: ['f1'], visuales: [fotoUnica(), video] })
    return {
      ...base, formato,
      actos: actos.map((id, i) => i === 0 ? base.actos[0] : { id, titulo: id, capitulos: Array.from({ length: capitulosPorActo[i] }, (_, j) => cap(i === actos.length - 1 ? 'Al final, ¿arrogancia o disciplina? Ustedes ya tienen la respuesta, ¿qué piensan?' : j === 0 ? conPregunta : '')) })
    }
  }
  const formatos: Array<[string, string[], number[], number]> = [
    ['historia-corta', ['pregunta', 'origen', 'ascenso', 'giro', 'legado'], [1, 2, 2, 1, 1], 250],
    ['epoca-club', ['pregunta', 'origen', 'ascenso', 'apogeo', 'caida', 'legado'], [1, 2, 2, 2, 2, 1], 380],
    ['explicador', ['pregunta', 'contexto', 'evidencia', 'explicacion', 'respuesta'], [1, 2, 2, 2, 1], 300]
  ]

  it.each(formatos)('%s: un guion bien armado se aprueba con su propio largo y sus actos', (formato, actos, capitulos, palabras) => {
    const r = evaluar(guionDeFormato(formato, actos, capitulos, palabras), config, { banco })
    expect(r.errores).toEqual([])
    expect(r.estado).toBe('APROBADO')
    expect(r.formato).toBe(formato)
  })

  it('cada formato rechaza lo que no es suyo: largo, actos y formato desconocido', () => {
    const corta = guionDeFormato('historia-corta', formatos[0][1], formatos[0][2], 250)
    // Un guion de 8 a 11 minutos no sirve como biografía de 21 a 30.
    expect(evaluar({ ...corta, formato: undefined }, config, { banco }).errores.join('\n')).toMatch(/Largo: /)
    // Los actos de la época de club no sirven para la historia corta.
    expect(evaluar({ ...corta, actos: guionDeFormato('epoca-club', formatos[1][1], formatos[1][2], 380).actos }, config, { banco }).errores.join('\n')).toMatch(/Los actos deben ser, en orden: pregunta, origen, ascenso, giro, legado/)
    expect(evaluar({ ...corta, formato: 'inventado' }, config, { banco }).errores.join('\n')).toMatch(/Formato desconocido «inventado»/)
    // El largo de la historia corta se mide en minutos propios.
    const larga = guionDeFormato('historia-corta', formatos[0][1], formatos[0][2], 500)
    expect(evaluar(larga, config, { banco }).errores.join('\n')).toMatch(/entre 1250 y 1800 \(unos 8–11 min\)/)
  })

  it('la apertura estándar avisa si falta el dato con número, la fuente o la promesa', () => {
    const g = guionValido()
    g.actos[0].capitulos[0].voz = 'Lo odian o lo aman. ¿Arrogancia o disciplina que nadie soportaría?'
    const avisos = evaluar(g, config, { banco }).avisos.join('\n')
    expect(avisos).toContain('dato con número')
    expect(avisos).toContain('nombrar la fuente')
    expect(avisos).toContain('promesa')
    g.actos[0].capitulos[0].voz = 'Según la FIFA, en 2022 corrió 7 kilómetros. ¿Arrogancia o disciplina que nadie soportaría? Vamos a explicarlo.'
    expect(evaluar(g, config, { banco }).avisos.filter(a => a.startsWith('Apertura'))).toEqual([])
  })
})

describe('banco de temas ampliado', () => {
  const temas = banco.temas as Array<{ id: string, alias: string[], formato?: string, tipo: string, sensible: boolean, angulo: string }>
  const formatosValidos = Object.keys(config.formatos)

  it('tiene ids únicos, alias, formato válido y ángulo en forma de pregunta', () => {
    expect(new Set(temas.map(t => t.id)).size).toBe(temas.length)
    for (const t of temas) {
      expect(t.alias.length, t.id).toBeGreaterThan(0)
      expect(t.angulo, t.id).toBeTruthy()
      if (t.formato) {
        expect(formatosValidos, t.id).toContain(t.formato)
        expect(t.angulo, t.id).toMatch(/\?/)
      }
    }
  })

  it('suma épocas, clubes, clásicos e historias cortas; las épocas ligadas al narcotráfico exigen revisión expresa', () => {
    const porFormato = (f: string) => temas.filter(t => t.formato === f).length
    expect(porFormato('epoca-club')).toBeGreaterThanOrEqual(8)
    expect(porFormato('historia-corta')).toBeGreaterThanOrEqual(3)
    expect(temas.filter(t => t.tipo === 'clasico').length).toBeGreaterThanOrEqual(3)
    for (const id of ['america-de-cali-era-dorada', 'atletico-nacional-1989']) expect(temas.find(t => t.id === id)?.sensible, id).toBe(true)
  })

  it('el selector propone el formato de cada tema', () => {
    const ranking = selector.puntuarTemas(banco, [], { hoy: '2026-11-23' }) as Array<{ id: string, formato: string }>
    expect(ranking.find(t => t.id === 'colo-colo-1991')?.formato).toBe('epoca-club')
    expect(ranking.find(t => t.id === 'cristiano-ronaldo')?.formato).toBe('biografia')
  })
})
