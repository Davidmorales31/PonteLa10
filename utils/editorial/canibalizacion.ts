import type { FilaSearchConsole } from './searchConsole'

export type TipoAccionCanibalizacion =
  | 'mantener_ambas'
  | 'fusionar'
  | 'redirect'
  | 'canonical'
  | 'reorientar_intencion'

export interface ArticuloCanibalizacion {
  id: string
  url: string
  titulo: string
  tituloSeo: string
  consultaObjetivo: string | null
  intencion: string | null
  entidades: Array<{ clave: string, nombre: string }>
}

export interface ConsultaCompartidaCanibalizacion {
  consulta: string
  impresionesA: number
  clicsA: number
  posicionA: number
  impresionesB: number
  clicsB: number
  posicionB: number
}

export interface CandidatoCanibalizacion {
  clave: string
  urlA: string
  tituloA: string
  urlB: string
  tituloB: string
  confianza: 'Alta' | 'Media' | 'Baja'
  puntuacion: number
  similitudTitulos: number
  senales: string[]
  entidadesCompartidas: string[]
  cantidadConsultasCompartidas: number
  consultasCompartidas: ConsultaCompartidaCanibalizacion[]
  accionSugerida: TipoAccionCanibalizacion
  accionesSugeridas: TipoAccionCanibalizacion[]
  recomendacion: string
}

export interface ResultadoDeteccionCanibalizacionEditorial {
  candidatos: CandidatoCanibalizacion[]
  totalCandidatos: number
  candidatosLimitados: boolean
}

interface FilaNormalizada extends FilaSearchConsole {
  ruta: string
}

interface ParEnRevision {
  paginaA: string
  paginaB: string
  consultas: Map<string, ConsultaCompartidaCanibalizacion>
}

const palabrasVacias = new Set([
  'a', 'al', 'con', 'contra', 'de', 'del', 'desde', 'el', 'en', 'entre', 'la',
  'las', 'lo', 'los', 'mas', 'para', 'por', 'que', 'se', 'sin', 'sobre', 'su',
  'un', 'una', 'uno', 'y'
])

function normalizarTexto(valor: string): string {
  return valor.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function rutaPropia(valor: string): string | null {
  try {
    const url = new URL(valor)
    const host = url.hostname.toLocaleLowerCase('en-US').replace(/^www\./, '')
    if (url.protocol !== 'https:' || host !== 'pont3la10.com' || url.search || url.hash) return null
    const ruta = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '')
    return ruta || '/'
  } catch {
    return null
  }
}

function tokensDeTitulo(titulo: string): Set<string> {
  return new Set(normalizarTexto(titulo)
    .split(' ')
    .filter(token => token.length > 2 && !palabrasVacias.has(token)))
}

function similitudJaccard(a: string, b: string): number {
  const tokensA = tokensDeTitulo(a)
  const tokensB = tokensDeTitulo(b)
  if (!tokensA.size || !tokensB.size) return 0
  const compartidos = [...tokensA].filter(token => tokensB.has(token)).length
  return compartidos / (tokensA.size + tokensB.size - compartidos)
}

function clavePar(paginaA: string, paginaB: string): string {
  return [paginaA, paginaB].sort((a, b) => a.localeCompare(b, 'en')).join('\u001f')
}

function crearMapaArticulos(articulos: ArticuloCanibalizacion[]): Map<string, ArticuloCanibalizacion> {
  return new Map(articulos.flatMap((articulo) => {
    const ruta = rutaPropia(articulo.url)
    return ruta ? [[ruta, articulo] as const] : []
  }))
}

function acumularConsulta(
  destino: Map<string, ConsultaCompartidaCanibalizacion>,
  consulta: string,
  filaA: FilaNormalizada,
  filaB: FilaNormalizada
): void {
  const claveConsulta = normalizarTexto(consulta)
  const previa = destino.get(claveConsulta)
  if (previa) {
    previa.impresionesA += filaA.impresiones
    previa.clicsA += filaA.clics
    previa.posicionA = Math.min(previa.posicionA, filaA.posicion)
    previa.impresionesB += filaB.impresiones
    previa.clicsB += filaB.clics
    previa.posicionB = Math.min(previa.posicionB, filaB.posicion)
    return
  }

  destino.set(claveConsulta, {
    consulta,
    impresionesA: filaA.impresiones,
    clicsA: filaA.clics,
    posicionA: filaA.posicion,
    impresionesB: filaB.impresiones,
    clicsB: filaB.clics,
    posicionB: filaB.posicion
  })
}

function agregarPar(
  pares: Map<string, ParEnRevision>,
  paginaA: string,
  paginaB: string,
  consulta?: string,
  filaA?: FilaNormalizada,
  filaB?: FilaNormalizada
): void {
  if (paginaA === paginaB) return
  const [urlA, urlB] = [paginaA, paginaB].sort((a, b) => a.localeCompare(b, 'en'))
  const clave = clavePar(urlA, urlB)
  const par = pares.get(clave) || { paginaA: urlA, paginaB: urlB, consultas: new Map() }
  if (consulta && filaA && filaB) {
    const [metricaA, metricaB] = paginaA === urlA ? [filaA, filaB] : [filaB, filaA]
    acumularConsulta(par.consultas, consulta, metricaA, metricaB)
  }
  pares.set(clave, par)
}

function obtenerConsultaCompartida(
  filas: FilaNormalizada[],
  pares: Map<string, ParEnRevision>
): void {
  const porConsulta = new Map<string, Map<string, FilaNormalizada>>()
  for (const fila of filas) {
    const consultaNormalizada = normalizarTexto(fila.consulta)
    if (!consultaNormalizada) continue
    const grupo = porConsulta.get(consultaNormalizada) || new Map<string, FilaNormalizada>()
    const previa = grupo.get(fila.ruta)
    if (previa) {
      const impresionesTotales = previa.impresiones + fila.impresiones
      previa.posicion = impresionesTotales > 0
        ? (previa.posicion * previa.impresiones + fila.posicion * fila.impresiones) / impresionesTotales
        : Math.min(previa.posicion, fila.posicion)
      previa.impresiones += fila.impresiones
      previa.clics += fila.clics
    } else {
      grupo.set(fila.ruta, fila)
    }
    porConsulta.set(consultaNormalizada, grupo)
  }

  for (const grupo of porConsulta.values()) {
    const paginas = [...grupo.values()].sort((a, b) =>
      b.impresiones - a.impresiones || a.ruta.localeCompare(b.ruta, 'en'))
    if (paginas.length < 2) continue
    const paginaPrincipal = paginas[0]
    for (const otraPagina of paginas.slice(1)) {
      agregarPar(pares, paginaPrincipal.ruta, otraPagina.ruta,
        paginaPrincipal.consulta, paginaPrincipal, otraPagina)
    }
  }
}

function calcularEvidencia(
  par: ParEnRevision,
  articuloA: ArticuloCanibalizacion | undefined,
  articuloB: ArticuloCanibalizacion | undefined
): Omit<CandidatoCanibalizacion, 'clave' | 'urlA' | 'tituloA' | 'urlB' | 'tituloB'> | null {
  const consultas = [...par.consultas.values()]
    .sort((a, b) => b.impresionesA + b.impresionesB - a.impresionesA - a.impresionesB)
  const consultaObjetivoA = articuloA?.consultaObjetivo ? normalizarTexto(articuloA.consultaObjetivo) : ''
  const consultaObjetivoB = articuloB?.consultaObjetivo ? normalizarTexto(articuloB.consultaObjetivo) : ''
  const mismaConsultaObjetivo = Boolean(consultaObjetivoA && consultaObjetivoA === consultaObjetivoB)
  const mismaIntencion = Boolean(
    articuloA?.intencion && articuloB?.intencion && articuloA.intencion === articuloB.intencion
  )
  const intencionesDistintas = Boolean(
    articuloA?.intencion && articuloB?.intencion && articuloA.intencion !== articuloB.intencion
  )
  const similitudTitulos = articuloA && articuloB
    ? similitudJaccard(articuloA.tituloSeo || articuloA.titulo, articuloB.tituloSeo || articuloB.titulo)
    : 0
  const entidadesB = new Map((articuloB?.entidades || []).map(entidad => [entidad.clave, entidad.nombre]))
  const entidadesCompartidas = (articuloA?.entidades || [])
    .filter(entidad => entidadesB.has(entidad.clave))
    .map(entidad => entidad.nombre)
    .slice(0, 3)
  const consultaCompartida = consultas.length > 0
  const similitudSuficiente = similitudTitulos >= 0.72
  const senales: string[] = []
  let puntuacion = 0

  if (consultaCompartida) {
    senales.push('La misma consulta aparece para ambas URL en Search Console')
    puntuacion += 4
  }
  if (mismaConsultaObjetivo) {
    senales.push('Comparten la consulta objetivo del brief confirmado')
    puntuacion += 4
  }
  if (mismaIntencion) {
    senales.push('Comparten la misma intención editorial confirmada')
    puntuacion += 3
  }
  if (similitudSuficiente) {
    senales.push(`Títulos SEO similares (${Math.round(similitudTitulos * 100)} % de coincidencia de términos)`)
    puntuacion += 3
  }
  if (entidadesCompartidas.length) {
    senales.push('Comparten entidad principal confirmada')
    puntuacion += 2
  }

  // Una entidad o una intención amplia compartida no bastan por sí solas para señalar competencia.
  if (!consultaCompartida && !mismaConsultaObjetivo && !similitudSuficiente) return null

  let accionSugerida: TipoAccionCanibalizacion = 'mantener_ambas'
  let accionesSugeridas: TipoAccionCanibalizacion[] = ['mantener_ambas', 'reorientar_intencion']
  let recomendacion = 'La coincidencia es limitada. Revisa la intención y conserva ambas URL si responden preguntas distintas.'

  if ((consultaCompartida || mismaConsultaObjetivo) && mismaIntencion && similitudTitulos >= 0.72) {
    accionSugerida = 'fusionar'
    accionesSugeridas = ['fusionar', 'redirect', 'canonical']
    recomendacion = 'Hay señales fuertes de solapamiento. Evalúa una fusión; cualquier redirect o canonical requiere elegir y aprobar primero la URL destino.'
  } else if (intencionesDistintas || (!mismaIntencion && similitudTitulos < 0.45)) {
    accionSugerida = 'mantener_ambas'
    accionesSugeridas = ['mantener_ambas', 'reorientar_intencion']
    recomendacion = 'Las páginas aparentan cubrir propósitos distintos. Mantén ambas y diferencia su enfoque, títulos y respuesta principal.'
  } else if (mismaIntencion || mismaConsultaObjetivo || similitudSuficiente) {
    accionSugerida = 'reorientar_intencion'
    accionesSugeridas = ['reorientar_intencion', 'mantener_ambas', 'fusionar']
    recomendacion = 'Revisa cuál URL debe responder a cada consulta y reorienta la menos específica antes de decidir si se consolida.'
  }

  const confianza: CandidatoCanibalizacion['confianza'] = puntuacion >= 10
    ? 'Alta'
    : puntuacion >= 6 ? 'Media' : 'Baja'

  return {
    confianza,
    puntuacion,
    similitudTitulos: Math.round(similitudTitulos * 100) / 100,
    senales,
    entidadesCompartidas,
    cantidadConsultasCompartidas: consultas.length,
    consultasCompartidas: consultas.slice(0, 3),
    accionSugerida,
    accionesSugeridas,
    recomendacion
  }
}

export function detectarCanibalizacionEditorial(
  metricas: FilaSearchConsole[],
  articulos: ArticuloCanibalizacion[],
  limite = 50
): ResultadoDeteccionCanibalizacionEditorial {
  const filas: FilaNormalizada[] = metricas.flatMap((fila) => {
    const ruta = rutaPropia(fila.paginaUrl)
    return ruta ? [{ ...fila, ruta }] : []
  })
  const mapaArticulos = crearMapaArticulos(articulos)
  const pares = new Map<string, ParEnRevision>()
  obtenerConsultaCompartida(filas, pares)

  const articulosConMetricas = new Map<string, ArticuloCanibalizacion>()
  for (const fila of filas) {
    const articulo = mapaArticulos.get(fila.ruta)
    if (articulo) articulosConMetricas.set(fila.ruta, articulo)
  }
  const articulosEnReporte = [...articulosConMetricas.entries()]
  for (let indiceA = 0; indiceA < articulosEnReporte.length; indiceA++) {
    const rutaA = articulosEnReporte[indiceA][0]
    for (let indiceB = indiceA + 1; indiceB < articulosEnReporte.length; indiceB++) {
      const rutaB = articulosEnReporte[indiceB][0]
      agregarPar(pares, rutaA, rutaB)
    }
  }

  const ordenados = [...pares.values()]
    .flatMap((par) => {
      const articuloA = mapaArticulos.get(par.paginaA)
      const articuloB = mapaArticulos.get(par.paginaB)
      const evidencia = calcularEvidencia(par, articuloA, articuloB)
      if (!evidencia) return []
      return [{
        clave: clavePar(par.paginaA, par.paginaB),
        urlA: par.paginaA,
        tituloA: articuloA?.titulo || par.paginaA,
        urlB: par.paginaB,
        tituloB: articuloB?.titulo || par.paginaB,
        ...evidencia
      }]
    })
    .sort((a, b) => b.puntuacion - a.puntuacion
      || b.consultasCompartidas.reduce((total, item) => total + item.impresionesA + item.impresionesB, 0)
      - a.consultasCompartidas.reduce((total, item) => total + item.impresionesA + item.impresionesB, 0)
      || a.clave.localeCompare(b.clave, 'en'))
  const limiteAplicado = Math.max(0, Math.min(100, limite))

  return {
    candidatos: ordenados.slice(0, limiteAplicado),
    totalCandidatos: ordenados.length,
    candidatosLimitados: ordenados.length > limiteAplicado
  }
}
