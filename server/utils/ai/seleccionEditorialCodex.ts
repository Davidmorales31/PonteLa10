import type { EntradaRedaccionIa, SeleccionEditorialIa } from './contratosRedaccion'
import { normalizarSeleccionEditorial } from './deepseekRedaccion'

const palabrasVacias = new Set([
  'a', 'al', 'algo', 'ante', 'bajo', 'con', 'como', 'contra', 'cual', 'cuando',
  'de', 'del', 'desde', 'donde', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre',
  'era', 'es', 'esa', 'ese', 'eso', 'esta', 'este', 'esto', 'fue', 'ha', 'hacia',
  'hasta', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'más', 'me',
  'mi', 'mis', 'mientras', 'muy', 'no', 'nos', 'o', 'para', 'pero', 'por',
  'porque', 'que', 'qué', 'se', 'sin', 'sobre', 'su', 'sus', 'tambien', 'también',
  'tras', 'tu', 'tus', 'un', 'una', 'unas', 'uno', 'unos', 'y', 'ya', 'noticia',
  'noticias', 'deporte', 'deportes', 'futbol', 'fútbol', 'partido', 'partidos',
  'equipo', 'equipos', 'jugador', 'jugadores'
])

function tokensEditoriales(texto: string): string[] {
  return [...new Set(texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO').match(/[a-z0-9]{3,}/g) || [])]
    .filter(token => !palabrasVacias.has(token))
}

function crearPesos(entrada: EntradaRedaccionIa): Map<string, number> {
  const contexto = entrada.contextoInvestigacion
  const pesos = new Map<string, number>()
  const sumar = (texto: string, peso: number) => {
    for (const token of tokensEditoriales(texto)) pesos.set(token, (pesos.get(token) || 0) + peso)
  }
  sumar(entrada.tituloSugerido, 6)
  if (!contexto) {
    for (const segmento of entrada.segmentos.slice(0, 100)) sumar(segmento.texto.slice(0, 1200), 1)
    return pesos
  }
  sumar(contexto.senalTendencia.termino, 5)
  sumar(contexto.senalTendencia.titulo, 3)
  sumar(contexto.consultaPrincipal, 5)
  for (const consulta of contexto.consultasRelacionadas) sumar(consulta, 3)
  sumar(contexto.resumen, 1)
  for (const fuente of contexto.fuentes) {
    sumar(fuente.titulo, 2)
    for (const claim of fuente.claims) sumar(claim, 1)
  }
  return pesos
}

function ordenarCandidatos<T>(
  candidatos: T[],
  textoDe: (candidato: T) => string,
  pesos: Map<string, number>,
  maximo: number
): T[] {
  return candidatos.map(candidato => ({
    candidato,
    puntuacion: tokensEditoriales(textoDe(candidato)).reduce((total, token) => total + (pesos.get(token) || 0), 0),
    coincidencias: tokensEditoriales(textoDe(candidato)).filter(token => (pesos.get(token) || 0) > 0)
  })).filter(resultado => resultado.puntuacion > 0 && (
    resultado.coincidencias.length >= 2
    || (resultado.coincidencias.length === 1 && (pesos.get(resultado.coincidencias[0]) || 0) >= 8)
  )).sort((a, b) => b.puntuacion - a.puntuacion).slice(0, maximo).map(resultado => resultado.candidato)
}

export function prepararContextoEditorialCodex(entrada: EntradaRedaccionIa): EntradaRedaccionIa {
  const contexto = entrada.contextoInvestigacion
  if (!contexto) return entrada
  const pesos = crearPesos(entrada)
  return {
    ...entrada,
    contextoInvestigacion: {
      ...contexto,
      resumen: contexto.resumen.slice(0, 4000),
      fuentes: contexto.fuentes.slice(0, 10).map(fuente => ({ ...fuente, claims: fuente.claims.slice(0, 12) })),
      temasDisponibles: ordenarCandidatos(contexto.temasDisponibles, tema => `${tema.nombre} ${tema.descripcion}`, pesos, 18),
      articulosPublicados: ordenarCandidatos(contexto.articulosPublicados, articulo => `${articulo.titulo} ${articulo.resumen}`, pesos, 12)
    }
  }
}

export function normalizarSeleccionEditorialCodex(propuesta: unknown, entrada: EntradaRedaccionIa): SeleccionEditorialIa {
  const normalizada = normalizarSeleccionEditorial(propuesta, entrada)
  const contexto = entrada.contextoInvestigacion
  if (!contexto) return normalizada
  const pesos = crearPesos(entrada)
  const temasRelevantes = ordenarCandidatos(contexto.temasDisponibles, tema => `${tema.nombre} ${tema.descripcion}`, pesos, 3)
  const articulosRelevantes = ordenarCandidatos(contexto.articulosPublicados, articulo => `${articulo.titulo} ${articulo.resumen}`, pesos, 3)
  const idsTemasPermitidos = new Set(temasRelevantes.map(tema => tema.id))
  const idsArticulosPermitidos = new Set(articulosRelevantes.map(articulo => articulo.id))
  const nombresExistentes = new Set(contexto.temasDisponibles.map(tema => tokensEditoriales(tema.nombre).sort().join(' ')))
  const temasNuevos = normalizada.temasNuevos.filter(tema => {
    const tokens = tokensEditoriales(tema.name).sort().join(' ')
    return tokens && !nombresExistentes.has(tokens)
  }).slice(0, 1)

  return {
    ...normalizada,
    tagIds: normalizada.tagIds.filter(id => idsTemasPermitidos.has(id)).length
      ? normalizada.tagIds.filter(id => idsTemasPermitidos.has(id)).slice(0, 3)
      : temasRelevantes.map(tema => tema.id),
    temasNuevos,
    relatedArticleIds: normalizada.relatedArticleIds.filter(id => idsArticulosPermitidos.has(id)).length
      ? normalizada.relatedArticleIds.filter(id => idsArticulosPermitidos.has(id)).slice(0, 3)
      : articulosRelevantes.map(articulo => articulo.id)
  }
}
