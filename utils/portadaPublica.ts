import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { PartidoResultado } from '~/types/resultados'
import { obtenerFechaEnZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

export interface JornadaPortada {
  fecha: string
  partidos: PartidoResultado[]
  enVivo: PartidoResultado[]
  proximos: PartidoResultado[]
  finalizados: PartidoResultado[]
}

export interface PartidoLigaPortada {
  slug: string
  competencia: string
  fechaIso: string
  local: string
  visitante: string
  estado: string
  golesLocal: number | null
  golesVisitante: number | null
  estadio?: string | null
  ciudad?: string | null
  escudoLocal?: string | null
  escudoVisitante?: string | null
  verificadoEn: string
}

export function separarJornadaPortada(
  partidos: readonly PartidoResultado[],
  instanteIso: string,
  zonaHoraria = zonaHorariaColombia
): JornadaPortada {
  const instante = Date.parse(instanteIso)
  if (!Number.isFinite(instante)) {
    return { fecha: '', partidos: [], enVivo: [], proximos: [], finalizados: [] }
  }

  const fecha = obtenerFechaEnZonaHoraria(new Date(instante), zonaHoraria)
  const partidosDelDia = partidos
    .filter(partido => Number.isFinite(Date.parse(partido.fechaIso))
      && obtenerFechaEnZonaHoraria(new Date(partido.fechaIso), zonaHoraria) === fecha
      && (partido.estado !== 'programado' || Date.parse(partido.fechaIso) > instante))
    .sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))

  return {
    fecha,
    partidos: partidosDelDia,
    enVivo: partidosDelDia.filter(partido => partido.estado === 'en-vivo'),
    proximos: partidosDelDia.filter(partido => partido.estado === 'programado'
      && Date.parse(partido.fechaIso) > instante),
    finalizados: partidosDelDia
      .filter(partido => partido.estado === 'finalizado')
      .sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))
  }
}

export function obtenerResultadosLigaRecientes(
  partidos: readonly PartidoLigaPortada[],
  instanteIso: string,
  limite = 3
): PartidoLigaPortada[] {
  const instante = Date.parse(instanteIso)
  if (!Number.isFinite(instante)) return []

  return partidos
    .filter(partido => /finish|full.?time|\bft\b|final/i.test(partido.estado)
      && Number.isFinite(Date.parse(partido.fechaIso))
      && Date.parse(partido.fechaIso) <= instante
      && Number.isFinite(partido.golesLocal)
      && Number.isFinite(partido.golesVisitante))
    .sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))
    .slice(0, Math.max(0, limite))
}

export function obtenerProximoPartidoLiga(
  partidos: readonly PartidoLigaPortada[],
  instanteIso: string
): PartidoLigaPortada | null {
  const instante = Date.parse(instanteIso)
  if (!Number.isFinite(instante)) return null

  const partidosActivos = partidos
    .filter(partido => Number.isFinite(Date.parse(partido.fechaIso))
      && (/live|en.?vivo|in.?play/i.test(partido.estado)
        || (/sched|programad/i.test(partido.estado) && Date.parse(partido.fechaIso) > instante)))
    .sort((a, b) => {
      const enVivoA = /live|en.?vivo|in.?play/i.test(a.estado)
      const enVivoB = /live|en.?vivo|in.?play/i.test(b.estado)
      if (enVivoA !== enVivoB) return enVivoA ? -1 : 1
      return Date.parse(a.fechaIso) - Date.parse(b.fechaIso)
    })

  return partidosActivos[0] || null
}

export function filtrarNoticiasSeleccion(
  articulos: readonly ResumenArticuloPublico[],
  limite = 2
): ResumenArticuloPublico[] {
  return articulos
    .filter((articulo) => {
      const texto = normalizarTextoPortada(`${articulo.titulo} ${articulo.resumen}`)
      const categoria = normalizarTextoPortada(articulo.categoria)
      const hablaDeSeleccion = texto.includes('seleccion colombia')
        || texto.includes('seleccion femenina colombia')
        || texto.includes('seleccion masculina colombia')
      const categoriaFutbolistica = categoria.includes('futbol')
      const noticiaColombianaDeSelecciones = texto.includes('colombia')
        && /amistoso|fecha fifa|eliminatoria|convocatoria/.test(texto)
      return categoriaFutbolistica && (hablaDeSeleccion || noticiaColombianaDeSelecciones)
    })
    .slice(0, Math.max(0, limite))
}

export function filtrarNoticiasLiga(
  articulos: readonly ResumenArticuloPublico[],
  equipos: readonly string[],
  limite = 2
): ResumenArticuloPublico[] {
  const nombresEquipo = new Set(equipos.flatMap(nombre => {
    const normalizado = normalizarTextoPortada(nombre)
    const ultimaPalabra = normalizado.split(' ').at(-1) || ''
    return [normalizado, ...(ultimaPalabra.length >= 5 ? [ultimaPalabra] : [])]
  }))

  return articulos
    .filter((articulo) => {
      const texto = normalizarTextoPortada(`${articulo.titulo} ${articulo.resumen}`)
      const categoria = normalizarTextoPortada(articulo.categoria)
      if (!categoria.includes('futbol colombiano') && !categoria.includes('liga')) return false
      return /liga betplay|torneo betplay|copa colombia|dimayor|futbol colombiano/.test(texto)
        || [...nombresEquipo].some(nombre => texto.includes(nombre))
    })
    .slice(0, Math.max(0, limite))
}

export function filtrarNoticiasEuropa(
  articulos: readonly ResumenArticuloPublico[],
  nombresJugadores: readonly string[],
  limite = 3
): ResumenArticuloPublico[] {
  const nombresNormalizados = nombresJugadores.map(normalizarTextoPortada).filter(Boolean)
  return articulos
    .filter((articulo) => {
      const texto = normalizarTextoPortada(`${articulo.titulo} ${articulo.resumen}`)
      const categoria = normalizarTextoPortada(articulo.categoria)
      return categoria.includes('futbol mundial')
        && (texto.includes('colombiano') || nombresNormalizados.some(nombre => texto.includes(nombre)))
        && nombresNormalizados.some(nombre => texto.includes(nombre))
    })
    .slice(0, Math.max(0, limite))
}

function normalizarTextoPortada(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
}
