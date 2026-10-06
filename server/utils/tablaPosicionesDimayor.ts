import { normalizarClaveEquipoLiga } from '~/server/utils/partidosSeoPublicos'

const urlLigaA = 'https://dimayor.com.co/liga-betplay-dimayor/'
const urlLigaB = 'https://dimayor.com.co/torneo-betplay-dimayor/'
const limiteHtmlBytes = 1_500_000
const limiteTablaBytes = 35_000
const limiteSeparacionTituloTabla = 5_000

export type CompetenciaLigaDimayor = 'liga-betplay' | 'torneo-betplay'

export interface FilaTablaDimayor {
  posicion: number
  equipo: string
  jugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferenciaGoles: number
  puntos: number
}

export interface TablaDimayor {
  competencia: CompetenciaLigaDimayor
  fase: string
  titulo: string
  filas: FilaTablaDimayor[]
  url: string
}

export interface BaseTablaLigaAutorizada {
  competition_slug: string
  season: string
  phase: string
  team_key: string
  team_name: string
  is_public: boolean
  publication_rights_confirmed: boolean
}

export interface ActualizacionTablaLigaDimayor extends BaseTablaLigaAutorizada {
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  source_name: 'DIMAYOR'
  source_url: string
  checked_at: string
}

type TransporteDimayor = (url: string, init: RequestInit) => Promise<Response>

/** Descarga solo las dos páginas oficiales permitidas y exige tablas completas. */
export async function descargarTablasPosicionesDimayor(
  transporte: TransporteDimayor = (url, init) => fetch(url, init)
): Promise<TablaDimayor[]> {
  const fuentes: Array<[CompetenciaLigaDimayor, string]> = [
    ['liga-betplay', urlLigaA],
    ['torneo-betplay', urlLigaB]
  ]
  return Promise.all(fuentes.map(async ([competencia, url]) => {
    const respuesta = await transporte(url, {
      headers: { Accept: 'text/html', 'User-Agent': 'Pont3la10/1.0 (+https://www.pont3la10.com)' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error'
    })
    if (!respuesta.ok || new URL(respuesta.url || url).hostname !== 'dimayor.com.co') {
      throw new Error('DIMAYOR_SOURCE_UNAVAILABLE')
    }
    const html = await leerHtmlLimitado(respuesta)
    const tablas = parsearTablasPosicionesDimayor(html, competencia)
    if (!tablas.length) throw new Error('DIMAYOR_TABLE_NOT_FOUND')
    return tablas
  })).then(tablas => tablas.flat())
}

/**
 * Interpreta las tablas HTML públicas de DIMAYOR. Si la página repite la misma
 * tabla en un modal oculto, se colapsa; dos versiones distintas son ambiguas.
 */
export function parsearTablasPosicionesDimayor(
  html: string,
  competencia: CompetenciaLigaDimayor
): TablaDimayor[] {
  if (typeof html !== 'string' || !html.trim() || html.length > limiteHtmlBytes) return []
  const cabeceras = [...html.matchAll(/<div\b[^>]*class=["'][^"']*\bstandings-header\b[^"']*["'][^>]*>\s*<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)]
  const porFase = new Map<string, TablaDimayor>()

  for (const cabecera of cabeceras) {
    const titulo = textoHtml(cabecera[1] || '')
    const fase = resolverFaseDimayor(titulo, competencia)
    if (!fase) continue
    const inicioTitulo = cabecera.index ?? 0
    const inicioTabla = html.indexOf('<table', inicioTitulo + cabecera[0].length)
    if (inicioTabla < 0 || inicioTabla - inicioTitulo > limiteSeparacionTituloTabla) continue
    const finTabla = html.indexOf('</table>', inicioTabla)
    if (finTabla < 0 || finTabla - inicioTabla > limiteTablaBytes) continue
    const apertura = html.slice(inicioTabla, html.indexOf('>', inicioTabla) + 1)
    if (!/\bclass=["'][^"']*\bdimayor-table\b/i.test(apertura)) continue

    const filas = parsearFilasTabla(html.slice(inicioTabla, finTabla + '</table>'.length))
    if (!filas.length || !esTablaCompletaInternamente(filas)) continue
    const tabla: TablaDimayor = {
      competencia,
      fase,
      titulo,
      filas,
      url: competencia === 'liga-betplay' ? urlLigaA : urlLigaB
    }
    const anterior = porFase.get(fase)
    if (anterior && huellaTabla(anterior) !== huellaTabla(tabla)) return []
    porFase.set(fase, tabla)
  }

  return [...porFase.values()]
}

/** Proyecta una tabla únicamente si cada fila ya tiene autorización explícita. */
export function proyectarTablaDimayorAutorizada(
  tabla: TablaDimayor,
  filasBase: BaseTablaLigaAutorizada[],
  fechaNegocio: string,
  consultadoEn = new Date().toISOString()
): ActualizacionTablaLigaDimayor[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNegocio) || !Number.isFinite(Date.parse(consultadoEn))) return []
  const temporadaActual = resolverTemporadaActual(fechaNegocio)
  const filasTemporada = filasBase.filter(fila => fila.competition_slug === tabla.competencia
    && fila.season === temporadaActual
    && fila.is_public === true && fila.publication_rights_confirmed === true)
  const porEquipo = filasTemporada.filter(fila => fila.phase === tabla.fase)
  if (porEquipo.length !== tabla.filas.length || !porEquipo.length) return []

  const basePorNombre = new Map<string, BaseTablaLigaAutorizada>()
  for (const fila of porEquipo) {
    const clave = normalizarClaveEquipoLiga(fila.team_name)
    if (!clave || basePorNombre.has(clave)) return []
    basePorNombre.set(clave, fila)
  }

  const nombresFuente = new Set<string>()
  const posiciones = new Set<number>()
  const actualizaciones: ActualizacionTablaLigaDimayor[] = []
  for (const fila of tabla.filas) {
    const clave = normalizarClaveEquipoLiga(fila.equipo)
    const base = basePorNombre.get(clave)
    if (!base || nombresFuente.has(clave) || posiciones.has(fila.posicion)) return []
    nombresFuente.add(clave)
    posiciones.add(fila.posicion)
    actualizaciones.push({
      ...base,
      position: fila.posicion,
      played: fila.jugados,
      won: fila.ganados,
      drawn: fila.empatados,
      lost: fila.perdidos,
      goals_for: fila.golesFavor,
      goals_against: fila.golesContra,
      goal_difference: fila.diferenciaGoles,
      points: fila.puntos,
      source_name: 'DIMAYOR',
      source_url: tabla.url,
      checked_at: consultadoEn
    })
  }

  if (actualizaciones.length !== porEquipo.length
    || posiciones.size !== porEquipo.length
    || Math.min(...posiciones) !== 1
    || Math.max(...posiciones) !== porEquipo.length) return []
  return actualizaciones
}

/** Exige correspondencia exacta entre todas las fases oficiales y autorizadas activas. */
export function proyectarTablasDimayorAutorizadas(
  tablas: TablaDimayor[],
  filasBase: BaseTablaLigaAutorizada[],
  fechaNegocio: string,
  consultadoEn = new Date().toISOString()
): ActualizacionTablaLigaDimayor[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNegocio) || !Number.isFinite(Date.parse(consultadoEn))) return []
  const temporadaActual = resolverTemporadaActual(fechaNegocio)
  const competencias: CompetenciaLigaDimayor[] = ['liga-betplay', 'torneo-betplay']
  const filasAutorizadas = filasBase.filter(fila => fila.season === temporadaActual
    && fila.is_public === true && fila.publication_rights_confirmed === true
    && competencias.includes(fila.competition_slug as CompetenciaLigaDimayor))
  const actualizaciones: ActualizacionTablaLigaDimayor[] = []
  const claves = new Set<string>()

  for (const competencia of competencias) {
    const baseCompetencia = filasAutorizadas.filter(fila => fila.competition_slug === competencia)
    const tablasCompetencia = tablas.filter(tabla => tabla.competencia === competencia)
    const fasesBase = new Set(baseCompetencia.map(fila => fila.phase))
    const fasesFuente = new Set(tablasCompetencia.map(tabla => tabla.fase))
    if (!fasesBase.size || !fasesFuente.size || fasesBase.size !== fasesFuente.size
      || [...fasesBase].some(fase => !fasesFuente.has(fase))
      || tablasCompetencia.length !== fasesFuente.size) return []

    for (const tabla of tablasCompetencia) {
      const proyeccion = proyectarTablaDimayorAutorizada(tabla, baseCompetencia, fechaNegocio, consultadoEn)
      if (!proyeccion.length) return []
      for (const fila of proyeccion) {
        const clave = [fila.competition_slug, fila.season, fila.phase, fila.team_key].join('|')
        if (claves.has(clave)) return []
        claves.add(clave)
        actualizaciones.push(fila)
      }
    }
  }

  return actualizaciones.length === filasAutorizadas.length ? actualizaciones : []
}

function parsearFilasTabla(html: string): FilaTablaDimayor[] {
  const filas: FilaTablaDimayor[] = []
  for (const filaMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const celdas = [...(filaMatch[1] || '').matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(celda => celda[1] || '')
    if (celdas.length < 10) continue
    const nombre = celdas[1]!.match(/<span\b[^>]*class=["'][^"']*\bteam-name-small\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]
    const valores = [celdas[0], celdas[2], celdas[3], celdas[4], celdas[5], celdas[6], celdas[7], celdas[8], celdas[9]]
      .map(valor => enteroHtml(valor))
    if (!nombre || valores.some(valor => valor === null)) return []
    const [posicion, puntos, jugados, ganados, empatados, perdidos, golesFavor, golesContra, diferenciaGoles] = valores as number[]
    const equipo = textoHtml(nombre)
    if (!equipo) return []
    filas.push({ posicion: posicion!, equipo, jugados: jugados!, ganados: ganados!, empatados: empatados!,
      perdidos: perdidos!, golesFavor: golesFavor!, golesContra: golesContra!, diferenciaGoles: diferenciaGoles!, puntos: puntos! })
  }
  return filas
}

function esTablaCompletaInternamente(filas: FilaTablaDimayor[]): boolean {
  if (!filas.length || filas.length > 32) return false
  const nombres = new Set<string>()
  const posiciones = new Set<number>()
  for (const fila of filas) {
    const nombre = normalizarClaveEquipoLiga(fila.equipo)
    const numeros = [fila.posicion, fila.jugados, fila.ganados, fila.empatados, fila.perdidos,
      fila.golesFavor, fila.golesContra, fila.diferenciaGoles, fila.puntos]
    if (!nombre || nombres.has(nombre) || posiciones.has(fila.posicion)
      || !numeros.every(Number.isSafeInteger)
      || fila.posicion < 1 || fila.posicion > filas.length
      || fila.jugados < 0 || fila.ganados < 0 || fila.empatados < 0 || fila.perdidos < 0
      || fila.ganados + fila.empatados + fila.perdidos !== fila.jugados
      || fila.golesFavor < 0 || fila.golesContra < 0
      || fila.golesFavor - fila.golesContra !== fila.diferenciaGoles || fila.puntos < 0) return false
    nombres.add(nombre)
    posiciones.add(fila.posicion)
  }
  return posiciones.size === filas.length && Math.min(...posiciones) === 1 && Math.max(...posiciones) === filas.length
}

function resolverFaseDimayor(titulo: string, competencia: CompetenciaLigaDimayor): string | null {
  const normalizado = textoHtml(titulo).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
  if (/todos contra todos/.test(normalizado)) {
    return competencia === 'liga-betplay' ? 'Todos contra todos' : 'Fase todos contra todos'
  }
  if (/cuadrang/.test(normalizado)) {
    const grupo = /grupo\s*([a-b])/i.exec(normalizado)?.[1]
    return grupo ? `Cuadrangulares · Grupo ${grupo.toLocaleUpperCase('es-CO')}` : 'Cuadrangulares'
  }
  if (/\bfinal\b/.test(normalizado)) return 'Final'
  return null
}

function textoHtml(valor: string): string {
  return valor.replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&#x([\da-f]{1,6});/gi, (_coincidencia, codigo: string) => codigoUnicode(codigo, 16))
    .replace(/&#(\d{1,7});/g, (_coincidencia, codigo: string) => codigoUnicode(codigo, 10))
    .replace(/&([a-z]{3,10});/gi, (_coincidencia, nombre: string) => entidadNombrada(nombre) || `&${nombre};`)
    .replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function enteroHtml(valor: string): number | null {
  const texto = textoHtml(valor).replace(/[−–]/g, '-').replace(/^\+/, '')
  if (!/^-?\d+$/.test(texto)) return null
  const numero = Number(texto)
  return Number.isSafeInteger(numero) ? numero : null
}

function resolverTemporadaActual(fechaNegocio: string): string {
  const anio = fechaNegocio.slice(0, 4)
  const mes = Number(fechaNegocio.slice(5, 7))
  return `${anio}-${mes >= 1 && mes <= 6 ? 'I' : 'II'}`
}

async function leerHtmlLimitado(respuesta: Response): Promise<string> {
  const longitudDeclarada = Number(respuesta.headers.get('content-length'))
  if (Number.isFinite(longitudDeclarada) && longitudDeclarada > limiteHtmlBytes) {
    await respuesta.body?.cancel()
    throw new Error('DIMAYOR_SOURCE_TOO_LARGE')
  }
  if (!respuesta.body) throw new Error('DIMAYOR_SOURCE_EMPTY')

  const lector = respuesta.body.getReader()
  const fragmentos: Uint8Array[] = []
  let longitud = 0
  try {
    while (true) {
      const { done, value } = await lector.read()
      if (done) break
      longitud += value.byteLength
      if (longitud > limiteHtmlBytes) {
        await lector.cancel()
        throw new Error('DIMAYOR_SOURCE_TOO_LARGE')
      }
      fragmentos.push(value)
    }
  } finally {
    lector.releaseLock()
  }

  const html = new Uint8Array(longitud)
  let offset = 0
  for (const fragmento of fragmentos) {
    html.set(fragmento, offset)
    offset += fragmento.byteLength
  }
  return new TextDecoder().decode(html)
}

function codigoUnicode(valor: string, base: number): string {
  const codigo = Number.parseInt(valor, base)
  return Number.isSafeInteger(codigo) && codigo >= 0 && codigo <= 0x10ffff
    ? String.fromCodePoint(codigo) : ''
}

function entidadNombrada(nombre: string): string | null {
  const entidades: Record<string, string> = {
    aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
    Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
    ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
    rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”'
  }
  return entidades[nombre] || entidades[nombre.toLowerCase()] || null
}

function huellaTabla(tabla: TablaDimayor): string {
  return tabla.filas.map(fila => [normalizarClaveEquipoLiga(fila.equipo), fila.posicion, fila.puntos,
    fila.jugados, fila.ganados, fila.empatados, fila.perdidos, fila.golesFavor, fila.golesContra,
    fila.diferenciaGoles].join(':')).join('|')
}
