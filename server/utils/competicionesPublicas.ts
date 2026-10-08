import type { SupabaseClient } from '@supabase/supabase-js'
import { listarArticulosPublicosPorEntidad } from '~/server/utils/repositorioContenidoEditorial'
import { listarEquiposLigaPublicos, type ClasificacionEquipoPublica, type EquipoLigaPublico } from '~/server/utils/equiposLigaPublicos'
import { listarPartidosSeoPublicos, normalizarClaveEquipoLiga, type PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import { evaluarFrescuraPartido, evaluarFrescuraTemporada, type EvaluacionFrescuraDeportiva } from '~/utils/frescuraDatosDeportivos'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'

export const catalogoCompeticionesPublicas = {
  'liga-betplay': { nombre: 'Liga BetPlay', tipo: 'liga' as const },
  'torneo-betplay': { nombre: 'Torneo BetPlay', tipo: 'liga' as const },
  'copa-colombia': { nombre: 'Copa Colombia', tipo: 'copa' as const }
}

export type SlugCompeticionPublica = keyof typeof catalogoCompeticionesPublicas

export interface EquipoCompeticionPublica {
  slug: string | null
  nombre: string
  escudo: string | null
}

export interface TemporadaCompeticionPublica {
  temporada: string
  esActual: boolean
  indexable: boolean
  partidosPublicos: number
  equiposPublicos: number
  desde: string | null
  hasta: string | null
  actualizadaEn: string | null
  ruta: string
}

export interface JornadaCompeticionPublica {
  nombre: string
  partidos: PartidoSeoPublico[]
  ruta: string | null
}

export interface FichaJornadaCompeticionPublica {
  competencia: { slug: SlugCompeticionPublica, nombre: string }
  temporada: string
  rutaCompeticionTemporada?: string
  jornada: { numero: number, nombre: string, slug: string }
  ruta: string
  partidos: PartidoSeoPublico[]
  equipos: number
  desde: string
  hasta: string
  actualizadaEn: string
}

export interface FilaTablaCompeticionPublica extends ClasificacionEquipoPublica {
  equipoSlug: string | null
  equipoNombre: string
  equipoEscudo: string | null
}

export interface SnapshotTablaCompeticionPublica {
  finalizadaEn: string
  verificadaEn: string
  fuente: string
  fuentes: string[]
}

export type NoticiaCompeticionPublica = Omit<ResumenArticuloPublico, 'id'>

export interface FichaCompeticionPublica {
  competencia: { slug: SlugCompeticionPublica, nombre: string, tipo: 'liga' | 'copa' }
  temporada: string
  temporadaActual: string
  indexable: boolean
  frescuraDatos: EvaluacionFrescuraDeportiva
  temporadas: TemporadaCompeticionPublica[]
  tablaDisponible: boolean
  snapshotTabla: SnapshotTablaCompeticionPublica | null
  tabla: FilaTablaCompeticionPublica[]
  partidosEnVivo: PartidoSeoPublico[]
  proximosPartidos: PartidoSeoPublico[]
  resultadosRecientes: PartidoSeoPublico[]
  jornadas: JornadaCompeticionPublica[]
  equipos: EquipoCompeticionPublica[]
  noticias: NoticiaCompeticionPublica[]
  actualizadaEn: string | null
}

interface DatosBaseCompeticion {
  partidos: PartidoSeoPublico[]
  equipos: EquipoLigaPublico[]
}

export async function listarRutasIndexablesCompeticiones(
  cliente: SupabaseClient,
  ahoraMs = Date.now()
): Promise<TemporadaCompeticionPublica[]> {
  const base = await cargarDatosBaseCompeticion(cliente)
  return (Object.keys(catalogoCompeticionesPublicas) as SlugCompeticionPublica[])
    .flatMap((slug) => {
      const partidos = base.partidos.filter(partido => partido.competencia === slug)
      return construirTemporadasPublicasCompeticion(slug, partidos, base.equipos, ahoraMs)
        .filter(resumen => resumen.indexable)
    })
}

export async function listarRutasIndexablesJornadas(
  cliente: SupabaseClient
): Promise<Array<Pick<FichaJornadaCompeticionPublica, 'ruta' | 'actualizadaEn'>>> {
  const base = await cargarDatosBaseJornadas(cliente)
  const slugs: SlugCompeticionPublica[] = ['liga-betplay', 'torneo-betplay']
  return slugs.flatMap((slug) => {
    const partidosCompetencia = base.partidos.filter(partido => partido.competencia === slug)
    const temporadas = [...new Set(partidosCompetencia.map(partido => partido.temporada).filter(esTemporadaPublica))]
    return temporadas.flatMap((temporada) => {
      const equiposOficiales = obtenerEquiposOficialesTemporada(slug, temporada, base.equipos)
      if (!equiposOficiales) return []
      return construirJornadasIndexablesPublicas(
        slug,
        temporada,
        partidosCompetencia.filter(partido => partido.temporada === temporada),
        equiposOficiales
      ).map(jornada => ({ ruta: jornada.ruta, actualizadaEn: jornada.actualizadaEn }))
    })
  })
}

export function construirTemporadasPublicasCompeticion(
  slug: SlugCompeticionPublica,
  partidos: PartidoSeoPublico[],
  equipos: EquipoLigaPublico[],
  ahoraMs = Date.now()
): TemporadaCompeticionPublica[] {
  const nombre = catalogoCompeticionesPublicas[slug].nombre
  const partidosCompetencia = partidos.filter(partido => partido.competencia === slug)
  const temporadas = resolverTemporadas(slug, partidosCompetencia, equipos)
  const actual = resolverTemporadaActual(slug, partidosCompetencia, equipos, ahoraMs)
  return temporadas.map(temporada => crearResumenTemporada(
    slug,
    nombre,
    temporada,
    actual,
    partidosCompetencia.filter(partido => partido.temporada === temporada),
    equipos.flatMap(equipo => equipo.clasificaciones
      .filter(fila => fila.competencia === slug && fila.temporada === temporada)
      .map(fila => ({ verificadoEn: fila.verificadoEn }))),
    ahoraMs
  ))
}

export async function obtenerFichaCompeticionPublica(
  cliente: SupabaseClient,
  slugSolicitado: string,
  temporadaSolicitada?: string,
  ahoraMs = Date.now()
): Promise<FichaCompeticionPublica | null> {
  if (!esSlugCompeticionPublica(slugSolicitado)) return null
  if (temporadaSolicitada !== undefined && !esTemporadaPublica(temporadaSolicitada)) return null

  const config = catalogoCompeticionesPublicas[slugSolicitado]
  const base = await cargarDatosBaseCompeticion(cliente)
  const partidosCompetencia = normalizarIdentidadEquiposCompeticionPublica(
    base.partidos.filter(partido => partido.competencia === slugSolicitado),
    slugSolicitado,
    base.equipos
  )
  const temporadasDisponibles = resolverTemporadas(slugSolicitado, partidosCompetencia, base.equipos)
  if (!temporadasDisponibles.length) return null

  const temporadaActual = resolverTemporadaActual(slugSolicitado, partidosCompetencia, base.equipos, ahoraMs)
  const temporada = temporadaSolicitada || temporadaActual
  if (!temporadasDisponibles.includes(temporada)) return null

  const partidos = partidosCompetencia.filter(partido => partido.temporada === temporada)
  const esTemporadaActual = temporada === temporadaActual
  const snapshotTabla = config.tipo === 'liga' && !esTemporadaActual
    ? await cargarSnapshotTablaHistorica(cliente, slugSolicitado, temporada, base.equipos, ahoraMs)
    : null
  const filasTablaActual = config.tipo === 'liga' && esTemporadaActual
    ? base.equipos.flatMap(equipo => equipo.clasificaciones
      .filter(fila => fila.competencia === slugSolicitado && fila.temporada === temporada)
      .map(fila => ({ ...fila, equipoSlug: equipo.slug, equipoNombre: equipo.nombre, equipoEscudo: equipo.escudo })))
      .sort((a, b) => a.fase.localeCompare(b.fase, 'es-CO') || a.posicion - b.posicion)
    : []
  const tabla = snapshotTabla?.filas
    || seleccionarFasesClasificacionCompletas(filasTablaActual, slugSolicitado)
  const tablaDisponible = tabla.length > 0
  const equipos = listarEquiposCompeticion(partidos)
  const temporadas = temporadasDisponibles.map(temporadaDisponible => crearResumenTemporada(
    slugSolicitado,
    config.nombre,
    temporadaDisponible,
    temporadaActual,
    partidosCompetencia.filter(partido => partido.temporada === temporadaDisponible),
    base.equipos.flatMap(equipo => equipo.clasificaciones
      .filter(fila => fila.competencia === slugSolicitado && fila.temporada === temporadaDisponible)
      .map(fila => ({ verificadoEn: fila.verificadoEn }))),
    ahoraMs
  ))
  const temporadaActualSolicitada = temporada === temporadaActual
  const frescuraDatos = evaluarFrescuraTemporada(
    partidos,
    tabla,
    temporadaActualSolicitada,
    ahoraMs
  )
  const indexable = evaluarIndexabilidad({
    tipo: 'competicion',
    slug: slugSolicitado,
    nombre: config.nombre,
    temporada,
    partidosPublicos: partidos.length,
    equiposPublicos: equipos.length,
    fuenteDisponible: partidos.length > 0,
    datosActualizados: frescuraDatos.actualizado
  })
  const noticias = await listarNoticiasCompeticion(
    cliente,
    slugSolicitado
  )
  const verificados = [
    ...partidos.map(partido => partido.verificadoEn),
    ...tabla.map(fila => fila.verificadoEn)
  ].filter(fecha => Number.isFinite(Date.parse(fecha)))

  return {
    competencia: { slug: slugSolicitado, nombre: config.nombre, tipo: config.tipo },
    temporada,
    temporadaActual,
    indexable,
    frescuraDatos,
    temporadas,
    tablaDisponible,
    snapshotTabla: snapshotTabla?.metadata || null,
    tabla,
    partidosEnVivo: partidos
      .filter(partido => etiquetaEstadoSeoPartido(partido.estado) === 'EN VIVO')
      .sort(ordenarPorFecha),
    proximosPartidos: partidos
      .filter(partido => Date.parse(partido.fechaIso) >= ahoraMs
        && ['PROGRAMADO', 'REPROGRAMADO'].includes(etiquetaEstadoSeoPartido(partido.estado)))
      .sort(ordenarPorFecha)
      .slice(0, 12),
    resultadosRecientes: partidos
      .filter(partido => etiquetaEstadoSeoPartido(partido.estado) === 'FINALIZADO'
        && Date.parse(partido.fechaIso) <= ahoraMs
        && Number.isFinite(partido.golesLocal)
        && Number.isFinite(partido.golesVisitante))
      .sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))
      .slice(0, 12),
    jornadas: agruparJornadas(
      partidos,
      slugSolicitado,
      temporada,
      obtenerEquiposOficialesTemporada(slugSolicitado, temporada, base.equipos) || []
    ),
    equipos,
    noticias,
    actualizadaEn: verificados.sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null
  }
}

export async function obtenerFichaJornadaCompeticionPublica(
  cliente: SupabaseClient,
  slugSolicitado: string,
  temporadaSolicitada: string,
  jornadaSolicitada: string
): Promise<FichaJornadaCompeticionPublica | null> {
  if (!esSlugCompeticionPublica(slugSolicitado)
    || catalogoCompeticionesPublicas[slugSolicitado].tipo !== 'liga'
    || !esTemporadaPublica(temporadaSolicitada)
    || !/^jornada-(?:[1-9]|[1-9]\d)$/.test(jornadaSolicitada)) return null

  const base = await cargarDatosBaseJornadas(cliente)
  const equiposOficiales = obtenerEquiposOficialesTemporada(slugSolicitado, temporadaSolicitada, base.equipos)
  if (!equiposOficiales) return null
  const partidosTemporada = normalizarIdentidadEquiposCompeticionPublica(
    base.partidos.filter(partido => partido.competencia === slugSolicitado && partido.temporada === temporadaSolicitada),
    slugSolicitado,
    base.equipos
  )
  const jornada = construirJornadasIndexablesPublicas(
    slugSolicitado,
    temporadaSolicitada,
    partidosTemporada,
    equiposOficiales
  ).find(jornada => jornada.jornada.slug === jornadaSolicitada)
  if (!jornada) return null

  const resumenTemporada = construirTemporadasPublicasCompeticion(
    slugSolicitado,
    base.partidos,
    base.equipos
  ).find(resumen => resumen.temporada === temporadaSolicitada)
  return {
    ...jornada,
    rutaCompeticionTemporada: resumenTemporada?.ruta
      || `/competiciones/${slugSolicitado}/${encodeURIComponent(temporadaSolicitada)}`
  }
}

export function construirJornadasIndexablesPublicas(
  slug: SlugCompeticionPublica,
  temporada: string,
  partidos: PartidoSeoPublico[],
  equiposOficiales: string[],
  ahoraMs = Date.now()
): FichaJornadaCompeticionPublica[] {
  if (catalogoCompeticionesPublicas[slug].tipo !== 'liga' || !esTemporadaPublica(temporada)) return []

  const equiposEsperados = slug === 'liga-betplay' ? 20 : 16
  const clavesEquiposOficiales = new Set(equiposOficiales.map(normalizarClaveEquipoLiga).filter(Boolean))
  if (clavesEquiposOficiales.size !== equiposEsperados) return []
  const partidosTemporada = partidos.filter(partido => partido.competencia === slug && partido.temporada === temporada)

  const porNumero = new Map<number, PartidoSeoPublico[]>()
  for (const partido of partidosTemporada) {
    const numero = extraerNumeroJornada(partido.jornada)
    if (!numero) continue
    const grupo = porNumero.get(numero) || []
    grupo.push(partido)
    porNumero.set(numero, grupo)
  }

  return [...porNumero.entries()].flatMap(([numero, encuentros]) => {
    const equipos = encuentros.flatMap(partido => [
      normalizarClaveEquipoJornada(partido.local, slug, temporada),
      normalizarClaveEquipoJornada(partido.visitante, slug, temporada)
    ])
    const equiposUnicos = new Set(equipos.filter(Boolean))
    const slugsUnicos = new Set(encuentros.map(partido => partido.slug))
    const jornadaCompleta = encuentros.length === equiposEsperados / 2
      && equiposUnicos.size === equiposEsperados
      && [...equiposUnicos].every(equipo => clavesEquiposOficiales.has(equipo))
      && slugsUnicos.size === encuentros.length
      && encuentros.every(partido => esEncuentroJornadaVerificable(partido, ahoraMs))
    if (!jornadaCompleta) return []

    const partidosOrdenados = [...encuentros].sort(ordenarPorFecha)
    const fechas = partidosOrdenados.map(partido => Date.parse(partido.fechaIso))
    const verificaciones = partidosOrdenados.map(partido => Date.parse(partido.verificadoEn))
    const fechaMinima = Math.min(...fechas)
    const fechaMaxima = Math.max(...fechas)
    const ultimaVerificacion = Math.max(...verificaciones)
    const jornada = { numero, nombre: `Jornada ${numero}`, slug: `jornada-${numero}` }
    return [{
      competencia: { slug, nombre: catalogoCompeticionesPublicas[slug].nombre },
      temporada,
      jornada,
      ruta: `/jornadas/${slug}/${encodeURIComponent(temporada)}/${jornada.slug}`,
      partidos: partidosOrdenados,
      equipos: equiposUnicos.size,
      desde: new Date(fechaMinima).toISOString(),
      hasta: new Date(fechaMaxima).toISOString(),
      actualizadaEn: new Date(ultimaVerificacion).toISOString()
    }]
  }).sort((a, b) => a.jornada.numero - b.jornada.numero)
}

/** Presenta los nombres heredados con la identidad del padrón oficial de esa temporada. */
export function normalizarIdentidadEquiposCompeticionPublica(
  partidos: PartidoSeoPublico[],
  slug: SlugCompeticionPublica,
  equipos: EquipoLigaPublico[]
): PartidoSeoPublico[] {
  return partidos.map((partido) => {
    if (slug !== 'liga-betplay' || partido.temporada !== '2026-II') return partido
    const normalizado: PartidoSeoPublico = { ...partido }
    const identidad = resolverEquipoAliasTemporada(partido.local, slug, partido.temporada, equipos)
    if (identidad) {
      normalizado.local = identidad.nombre
      normalizado.equipoLocalSlug = identidad.slug
      normalizado.escudoLocal = identidad.escudo || partido.escudoLocal
    }
    const identidadVisitante = resolverEquipoAliasTemporada(partido.visitante, slug, partido.temporada, equipos)
    if (identidadVisitante) {
      normalizado.visitante = identidadVisitante.nombre
      normalizado.equipoVisitanteSlug = identidadVisitante.slug
      normalizado.escudoVisitante = identidadVisitante.escudo || partido.escudoVisitante
    }
    return normalizado
  })
}

function resolverEquipoAliasTemporada(
  nombre: string,
  slug: SlugCompeticionPublica,
  temporada: string,
  equipos: EquipoLigaPublico[]
): EquipoLigaPublico | undefined {
  const clave = normalizarClaveEquipoLiga(nombre)
  if (slug !== 'liga-betplay' || temporada !== '2026-II'
    || clave !== normalizarClaveEquipoLiga('La Equidad')) return undefined
  return equipos.find(equipo => normalizarClaveEquipoLiga(equipo.nombre)
    === normalizarClaveEquipoLiga('Internacional de Bogotá')
    && equipo.clasificaciones.some(fila => fila.competencia === slug && fila.temporada === temporada))
}

export function esSlugCompeticionPublica(valor: string): valor is SlugCompeticionPublica {
  return Object.hasOwn(catalogoCompeticionesPublicas, valor)
}

export function esTemporadaPublica(valor: string): boolean {
  return /^20\d{2}(?:-[A-Za-z0-9]+)?$/.test(valor)
}

export function seleccionarFasesClasificacionCompletas(
  filas: FilaTablaCompeticionPublica[],
  slug: SlugCompeticionPublica
): FilaTablaCompeticionPublica[] {
  const porFase = new Map<string, FilaTablaCompeticionPublica[]>()
  for (const fila of filas) {
    const grupo = porFase.get(fila.fase) || []
    grupo.push(fila)
    porFase.set(fila.fase, grupo)
  }

  const fasesCompletas = [...porFase.entries()].flatMap(([fase, grupo]) => {
    const faseNormalizada = fase.toLocaleLowerCase('es-CO')
    const cantidadEsperada = /todos contra todos/.test(faseNormalizada)
      ? slug === 'liga-betplay' ? 20 : 16
      : /grupo\s*(?:[a-d]|[1-4])\b/.test(faseNormalizada)
        ? 4
        : /cuadrangular/.test(faseNormalizada)
          ? 8
          : 0
    const equiposUnicos = new Set(grupo.map(fila => fila.equipoSlug))
    return cantidadEsperada > 0 && equiposUnicos.size === cantidadEsperada
      ? [{ fase, filas: grupo }]
      : []
  })

  const gruposCuadrangulares = [...porFase.keys()]
    .map(fase => ({ fase, grupo: extraerGrupoCuadrangular(fase) }))
    .filter((entrada): entrada is { fase: string, grupo: 'a' | 'b' | '1' | '2' } => entrada.grupo !== null)

  if (gruposCuadrangulares.length) {
    const ids = new Set(gruposCuadrangulares.map(entrada => entrada.grupo))
    const gruposEsperados = ids.has('a') || ids.has('b') ? ['a', 'b'] : ['1', '2']
    if (!gruposEsperados.every(grupo => ids.has(grupo as 'a' | 'b' | '1' | '2'))) return []

    const fasesEsperadas = new Set(
      gruposCuadrangulares
        .filter(entrada => gruposEsperados.includes(entrada.grupo))
        .map(entrada => entrada.fase)
    )
    if ([...fasesEsperadas].length !== 2) return []
    const fasesCompletasCuadrangulares = fasesCompletas.filter(entrada => fasesEsperadas.has(entrada.fase))
    if (fasesCompletasCuadrangulares.length !== 2) return []
    return fasesCompletasCuadrangulares.flatMap(entrada => entrada.filas)
      .sort((a, b) => a.fase.localeCompare(b.fase, 'es-CO') || a.posicion - b.posicion)
  }

  return fasesCompletas
    .flatMap(entrada => entrada.filas)
    .sort((a, b) => a.fase.localeCompare(b.fase, 'es-CO') || a.posicion - b.posicion)
}

interface FilaSnapshotTablaPersistida {
  competition_slug: string
  season: string
  phase: string
  team_count: number
  matches_per_team: number
  standings: unknown
  source_name: string
  source_urls: string[]
  checked_at: string
  finalized_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
}

export function validarSnapshotTablaPublica(
  valor: unknown,
  slug: SlugCompeticionPublica,
  temporada: string,
  equipos: EquipoLigaPublico[],
  ahoraMs = Date.now()
): { filas: FilaTablaCompeticionPublica[], metadata: SnapshotTablaCompeticionPublica } | null {
  if (slug === 'copa-colombia' || !valor || typeof valor !== 'object') return null
  const snapshot = valor as Partial<FilaSnapshotTablaPersistida>
  const cantidadEsperada = slug === 'liga-betplay' ? 20 : slug === 'torneo-betplay' ? 16 : 0
  const fasesPermitidas = slug === 'liga-betplay'
    ? ['Todos contra todos']
    : ['Fase todos contra todos']
  const verificadoMs = Date.parse(snapshot.checked_at || '')
  const finalizadoMs = Date.parse(snapshot.finalized_at || '')
  const urls = Array.isArray(snapshot.source_urls) ? snapshot.source_urls : []
  if (snapshot.competition_slug !== slug || snapshot.season !== temporada
    || !fasesPermitidas.includes(snapshot.phase || '')
    || snapshot.team_count !== cantidadEsperada
    || !Number.isInteger(snapshot.matches_per_team) || (snapshot.matches_per_team || 0) < 1
    || (snapshot.matches_per_team || 0) > 80
    || snapshot.is_public !== true || snapshot.publication_rights_confirmed !== true
    || typeof snapshot.source_name !== 'string' || !snapshot.source_name.trim()
    || !Number.isFinite(verificadoMs) || verificadoMs > ahoraMs + 5 * 60 * 1000
    || !Number.isFinite(finalizadoMs) || finalizadoMs > ahoraMs + 5 * 60 * 1000
    || !Array.isArray(snapshot.standings) || snapshot.standings.length !== cantidadEsperada
    || !urls.length || !urls.every(esFuenteSnapshotPermitida)) return null

  const nombres = new Set<string>()
  const posiciones = new Set<number>()
  const filas: FilaTablaCompeticionPublica[] = []
  for (const registro of snapshot.standings) {
    if (!registro || typeof registro !== 'object') return null
    const fila = registro as Record<string, unknown>
    const nombre = typeof fila.team_name === 'string' ? fila.team_name.trim() : ''
    const posicion = fila.position
    const jugados = fila.played
    const ganados = fila.won
    const empatados = fila.drawn
    const perdidos = fila.lost
    const golesFavor = fila.goals_for
    const golesContra = fila.goals_against
    const diferencia = fila.goal_difference
    const puntos = fila.points
    const numeros = [posicion, jugados, ganados, empatados, perdidos, golesFavor, golesContra, diferencia, puntos]
    if (!nombre || nombre.length > 100 || numeros.some(numero => !Number.isInteger(numero))
      || posiciones.has(posicion as number) || nombres.has(normalizarClaveEquipoLiga(nombre))
      || jugados !== snapshot.matches_per_team
      || (ganados as number) + (empatados as number) + (perdidos as number) !== jugados
      || (golesFavor as number) - (golesContra as number) !== diferencia
      || (ganados as number) * 3 + (empatados as number) !== puntos
      || (posicion as number) < 1 || (posicion as number) > cantidadEsperada
      || [ganados, empatados, perdidos, golesFavor, golesContra, puntos].some(numero => (numero as number) < 0)) return null

    nombres.add(normalizarClaveEquipoLiga(nombre))
    posiciones.add(posicion as number)
    const claveNombre = normalizarClaveEquipoLiga(nombre)
    const coincidencias = equipos.filter(equipo => normalizarClaveEquipoLiga(equipo.nombre) === claveNombre)
    const equipo = coincidencias.length === 1 ? coincidencias[0] : undefined
    filas.push({
      competencia: slug,
      temporada,
      fase: snapshot.phase!,
      posicion: posicion as number,
      jugados: jugados as number,
      ganados: ganados as number,
      empatados: empatados as number,
      perdidos: perdidos as number,
      golesFavor: golesFavor as number,
      golesContra: golesContra as number,
      diferencia: diferencia as number,
      puntos: puntos as number,
      verificadoEn: new Date(verificadoMs).toISOString(),
      equipoSlug: equipo?.slug || null,
      equipoNombre: nombre,
      equipoEscudo: equipo?.escudo || null
    })
  }

  if (nombres.size !== cantidadEsperada || posiciones.size !== cantidadEsperada
    || Array.from({ length: cantidadEsperada }, (_, indice) => indice + 1).some(posicion => !posiciones.has(posicion))) return null

  filas.sort((a, b) => a.posicion - b.posicion)
  return {
    filas,
    metadata: {
      finalizadaEn: new Date(finalizadoMs).toISOString(),
      verificadaEn: new Date(verificadoMs).toISOString(),
      fuente: snapshot.source_name!,
      fuentes: urls as string[]
    }
  }
}

async function cargarSnapshotTablaHistorica(
  cliente: SupabaseClient,
  slug: SlugCompeticionPublica,
  temporada: string,
  equipos: EquipoLigaPublico[],
  ahoraMs: number
): Promise<{ filas: FilaTablaCompeticionPublica[], metadata: SnapshotTablaCompeticionPublica } | null> {
  try {
    const { data, error } = await cliente.from('colombian_league_standings_snapshots')
      .select('competition_slug,season,phase,team_count,matches_per_team,standings,source_name,source_urls,checked_at,finalized_at,is_public,publication_rights_confirmed')
      .eq('competition_slug', slug)
      .eq('season', temporada)
      .eq('phase', slug === 'liga-betplay' ? 'Todos contra todos' : 'Fase todos contra todos')
      .maybeSingle()
    if (error || !data) return null
    return validarSnapshotTablaPublica(data, slug, temporada, equipos, ahoraMs)
  } catch {
    // La página conserva calendario y resultados si el archivo histórico no está disponible.
    return null
  }
}

function esFuenteSnapshotPermitida(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false
  try {
    const url = new URL(valor)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    return url.protocol === 'https:'
      && ['dimayor.com.co', 'goal-api.com', 'winsports.co'].some(dominio => host === dominio || host.endsWith(`.${dominio}`))
  } catch {
    return false
  }
}

function extraerGrupoCuadrangular(fase: string): 'a' | 'b' | '1' | '2' | null {
  if (!/cuadrangular|grupo/i.test(fase)) return null
  const grupo = /(?:grupo\s*([ab12])|cuadrangulares?\s+([ab12]))\b/i.exec(fase)
  const identificador = grupo?.[1] || grupo?.[2]
  return identificador ? identificador.toLowerCase() as 'a' | 'b' | '1' | '2' : null
}

function crearResumenTemporada(
  slug: SlugCompeticionPublica,
  nombre: string,
  temporada: string,
  temporadaActual: string,
  partidos: PartidoSeoPublico[],
  filasTabla: Array<{ verificadoEn: string }>,
  ahoraMs = Date.now()
): TemporadaCompeticionPublica {
  const equipos = listarEquiposCompeticion(partidos)
  const frescuraDatos = evaluarFrescuraTemporada(
    partidos,
    filasTabla,
    temporada === temporadaActual,
    ahoraMs
  )
  const indexable = evaluarIndexabilidad({
    tipo: 'competicion',
    slug,
    nombre,
    temporada,
    partidosPublicos: partidos.length,
    equiposPublicos: equipos.length,
    fuenteDisponible: partidos.length > 0,
    datosActualizados: frescuraDatos.actualizado
  })
  const fechas = partidos.map(partido => Date.parse(partido.fechaIso)).filter(Number.isFinite)
  const verificacion = partidos.map(partido => partido.verificadoEn)
    .filter(fecha => Number.isFinite(Date.parse(fecha)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null
  return {
    temporada,
    esActual: temporada === temporadaActual,
    indexable,
    partidosPublicos: partidos.length,
    equiposPublicos: equipos.length,
    desde: fechas.length ? new Date(Math.min(...fechas)).toISOString() : null,
    hasta: fechas.length ? new Date(Math.max(...fechas)).toISOString() : null,
    actualizadaEn: verificacion,
    ruta: temporada === temporadaActual
      ? `/competiciones/${slug}`
      : `/competiciones/${slug}/${encodeURIComponent(temporada)}`
  }
}

async function cargarDatosBaseCompeticion(cliente: SupabaseClient): Promise<DatosBaseCompeticion> {
  const partidos = await listarPartidosSeoPublicos(cliente)
  let equipos: EquipoLigaPublico[] = []
  try {
    equipos = await listarEquiposLigaPublicos(cliente)
  } catch {
    // Calendario y resultados siguen disponibles cuando la tabla no responde.
  }
  return { partidos, equipos }
}

async function cargarDatosBaseJornadas(cliente: SupabaseClient): Promise<DatosBaseCompeticion> {
  const [partidos, equipos] = await Promise.all([
    listarPartidosSeoPublicos(cliente),
    listarEquiposLigaPublicos(cliente)
  ])
  return { partidos, equipos }
}

function resolverTemporadas(
  slug: SlugCompeticionPublica,
  partidos: PartidoSeoPublico[],
  equipos: EquipoLigaPublico[]
): string[] {
  const temporadas = new Set(partidos.map(partido => partido.temporada).filter(esTemporadaPublica))
  for (const equipo of equipos) {
    for (const fila of equipo.clasificaciones) {
      if (fila.competencia === slug && esTemporadaPublica(fila.temporada)) temporadas.add(fila.temporada)
    }
  }
  return [...temporadas].sort(compararTemporadas).reverse()
}

function resolverTemporadaActual(
  slug: SlugCompeticionPublica,
  partidos: PartidoSeoPublico[],
  equipos: EquipoLigaPublico[],
  ahoraMs: number
): string {
  const temporadasTabla = equipos.flatMap(equipo => equipo.clasificaciones
    .filter(fila => fila.competencia === slug && esTemporadaPublica(fila.temporada))
    .map(fila => fila))
    .sort((a, b) => Date.parse(b.verificadoEn) - Date.parse(a.verificadoEn))
  if (temporadasTabla[0]) return temporadasTabla[0].temporada

  const programados = partidos.filter(partido => Date.parse(partido.fechaIso) >= ahoraMs
    && ['PROGRAMADO', 'REPROGRAMADO'].includes(etiquetaEstadoSeoPartido(partido.estado)))
    .sort(ordenarPorFecha)
  if (programados[0]) return programados[0].temporada

  const recientes = [...partidos].sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))
  if (recientes[0]) return recientes[0].temporada
  return resolverTemporadas(slug, partidos, equipos)[0] || ''
}

function listarEquiposCompeticion(partidos: PartidoSeoPublico[]): EquipoCompeticionPublica[] {
  const porNombre = new Map<string, EquipoCompeticionPublica>()
  for (const partido of partidos) {
    agregarEquipo(partido.local, partido.equipoLocalSlug, partido.escudoLocal)
    agregarEquipo(partido.visitante, partido.equipoVisitanteSlug, partido.escudoVisitante)
  }
  return [...porNombre.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-CO'))

  function agregarEquipo(nombre: string, slug: string | undefined, escudo: string | null) {
    const clave = normalizarClaveEquipoLiga(nombre)
    if (!clave) return
    const actual = porNombre.get(clave)
    const slugSeguro = slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null
    porNombre.set(clave, {
      slug: actual?.slug || slugSeguro,
      nombre: actual?.nombre || nombre,
      escudo: actual?.escudo || escudo
    })
  }
}

function agruparJornadas(
  partidos: PartidoSeoPublico[],
  slug: SlugCompeticionPublica,
  temporada: string,
  equiposOficiales: string[]
): JornadaCompeticionPublica[] {
  const rutas = new Map(construirJornadasIndexablesPublicas(slug, temporada, partidos, equiposOficiales)
    .map(jornada => [jornada.jornada.nombre, jornada.ruta]))
  const grupos = new Map<string, PartidoSeoPublico[]>()
  for (const partido of [...partidos].sort(ordenarPorFecha)) {
    const nombre = normalizarNombreJornada(partido.jornada)
    const grupo = grupos.get(nombre) || []
    grupo.push(partido)
    grupos.set(nombre, grupo)
  }
  return [...grupos.entries()]
    .map(([nombre, encuentros]) => ({ nombre, partidos: encuentros, ruta: rutas.get(nombre) || null }))
    .sort((a, b) => compararJornadas(a.nombre, b.nombre))
}

function obtenerEquiposOficialesTemporada(
  slug: SlugCompeticionPublica,
  temporada: string,
  equipos: EquipoLigaPublico[]
): string[] | null {
  const cantidadEsperada = slug === 'liga-betplay' ? 20 : 16
  const nombres = equipos.flatMap(equipo => equipo.clasificaciones
    .filter(fila => fila.competencia === slug && fila.temporada === temporada)
    .map(() => equipo.nombre.trim())
    .filter(Boolean))
  const nombresUnicos = new Map(nombres.map(nombre => [normalizarClaveEquipoLiga(nombre), nombre]))
  return nombresUnicos.size === cantidadEsperada ? [...nombresUnicos.values()] : null
}

function normalizarClaveEquipoJornada(
  nombre: string,
  slug: SlugCompeticionPublica,
  temporada: string
): string {
  const clave = normalizarClaveEquipoLiga(nombre)
  // El feed conserva el nombre anterior en algunos fixtures del II-2026; DIMAYOR
  // identifica esos partidos como Internacional de Bogotá. Limitarlo a la temporada
  // evita fusionar clubes homónimos/anteriores en históricos.
  if (slug === 'liga-betplay' && temporada === '2026-II'
    && clave === normalizarClaveEquipoLiga('La Equidad')) {
    return normalizarClaveEquipoLiga('Internacional de Bogotá')
  }
  return clave
}

function extraerNumeroJornada(valor: string | null): number | null {
  const numero = /^(?:(?:fecha|jornada|round|matchday)\s*)?([1-9]\d?)$/i.exec(valor?.trim().replace(/\s+/g, ' ') || '')?.[1]
  return numero ? Number(numero) : null
}

function esEncuentroJornadaVerificable(partido: PartidoSeoPublico, ahoraMs: number): boolean {
  const fecha = Date.parse(partido.fechaIso)
  const verificacion = Date.parse(partido.verificadoEn)
  const estado = etiquetaEstadoSeoPartido(partido.estado)
  if (!Number.isFinite(fecha) || !Number.isFinite(verificacion)
    || verificacion > ahoraMs + 5 * 60 * 1000 || !partido.slug.trim()) return false
  if (!partido.local.trim() || !partido.visitante.trim()
    || normalizarClaveEquipoLiga(partido.local) === normalizarClaveEquipoLiga(partido.visitante)) return false
  if (!partido.fuenteOficialUrl || !esFuenteDimayor(partido.fuenteOficialUrl)) return false
  const datosActualizados = partido.estadoFrescura?.actualizado
    ?? evaluarFrescuraPartido(partido, ahoraMs).actualizado
  if (!datosActualizados) return false
  return ['PROGRAMADO', 'REPROGRAMADO', 'EN VIVO', 'FINALIZADO'].includes(estado)
}

function esFuenteDimayor(valor: string): boolean {
  try {
    const url = new URL(valor)
    const host = url.hostname.toLocaleLowerCase('en-US').replace(/^www\./, '')
    return url.protocol === 'https:' && (host === 'dimayor.com.co' || host.endsWith('.dimayor.com.co'))
  } catch {
    return false
  }
}

async function listarNoticiasCompeticion(
  cliente: SupabaseClient,
  slug: SlugCompeticionPublica
): Promise<NoticiaCompeticionPublica[]> {
  try {
    const relacionadas = await listarArticulosPublicosPorEntidad(cliente, 'competition', slug, 6)
    return relacionadas.map(noticia => ({
      slug: noticia.slug,
      titulo: noticia.titulo,
      resumen: noticia.resumen,
      tipo: noticia.tipo,
      publicadoEn: noticia.publicadoEn,
      autorNombre: noticia.autorNombre,
      categoria: noticia.categoria,
      imagen: noticia.imagen,
      ...(noticia.lecturaMinutos === undefined ? {} : { lecturaMinutos: noticia.lecturaMinutos })
    }))
  } catch {
    // No sustituir una relación editorial confirmada por una coincidencia textual.
    return []
  }
}

function normalizarNombreJornada(valor: string | null): string {
  const nombre = valor?.trim().replace(/\s+/g, ' ') || ''
  const numero = /^(?:(?:fecha|jornada|round|matchday)\s*)?(\d{1,2})$/i.exec(nombre)?.[1]
  return numero ? `Jornada ${Number(numero)}` : nombre || 'Jornada por confirmar'
}

function compararJornadas(a: string, b: string): number {
  const numeroA = /^Jornada (\d+)$/.exec(a)?.[1]
  const numeroB = /^Jornada (\d+)$/.exec(b)?.[1]
  if (numeroA && numeroB) return Number(numeroA) - Number(numeroB)
  if (numeroA) return -1
  if (numeroB) return 1
  return a.localeCompare(b, 'es-CO')
}

function compararTemporadas(a: string, b: string): number {
  const partesA = /^(\d{4})(?:-([A-Za-z0-9]+))?$/.exec(a)
  const partesB = /^(\d{4})(?:-([A-Za-z0-9]+))?$/.exec(b)
  if (!partesA || !partesB) return a.localeCompare(b, 'es-CO')
  const diferenciaAnio = Number(partesA[1]) - Number(partesB[1])
  if (diferenciaAnio) return diferenciaAnio
  return (ordenTemporada(partesA[2]) - ordenTemporada(partesB[2]))
    || (partesA[2] || '').localeCompare(partesB[2] || '', 'es-CO')
}

function ordenTemporada(sufijo?: string): number {
  if (!sufijo) return 0
  const normalizado = sufijo.toLocaleUpperCase('en-US')
  if (normalizado === 'I') return 1
  if (normalizado === 'II') return 2
  return 0
}

function ordenarPorFecha(a: PartidoSeoPublico, b: PartidoSeoPublico): number {
  return Date.parse(a.fechaIso) - Date.parse(b.fechaIso)
}
