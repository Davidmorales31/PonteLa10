import type { SupabaseClient } from '@supabase/supabase-js'
import { analizarConsultaArticulosPublicos } from '~/server/utils/filtrosArticulosPublicos'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { listarEquiposLigaPublicos, type ClasificacionEquipoPublica, type EquipoLigaPublico } from '~/server/utils/equiposLigaPublicos'
import { listarPartidosSeoPublicos, normalizarClaveEquipoLiga, type PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'

export const catalogoCompeticionesPublicas = {
  'liga-betplay': { nombre: 'Liga BetPlay', tipo: 'liga' as const, temaNoticias: 'liga-betplay' },
  'torneo-betplay': { nombre: 'Torneo BetPlay', tipo: 'liga' as const, temaNoticias: 'torneo-betplay' },
  'copa-colombia': { nombre: 'Copa Colombia', tipo: 'copa' as const, temaNoticias: 'copa-colombia' }
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
  equipoSlug: string
  equipoNombre: string
  equipoEscudo: string | null
}

export type NoticiaCompeticionPublica = Omit<ResumenArticuloPublico, 'id'>

export interface FichaCompeticionPublica {
  competencia: { slug: SlugCompeticionPublica, nombre: string, tipo: 'liga' | 'copa' }
  temporada: string
  temporadaActual: string
  indexable: boolean
  temporadas: TemporadaCompeticionPublica[]
  tablaDisponible: boolean
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
    partidosCompetencia.filter(partido => partido.temporada === temporada)
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
  const partidosCompetencia = base.partidos.filter(partido => partido.competencia === slugSolicitado)
  const temporadasDisponibles = resolverTemporadas(slugSolicitado, partidosCompetencia, base.equipos)
  if (!temporadasDisponibles.length) return null

  const temporadaActual = resolverTemporadaActual(slugSolicitado, partidosCompetencia, base.equipos, ahoraMs)
  const temporada = temporadaSolicitada || temporadaActual
  if (!temporadasDisponibles.includes(temporada)) return null

  const partidos = partidosCompetencia.filter(partido => partido.temporada === temporada)
  const equiposCompetencia = listarEquiposCompeticion(partidosCompetencia)
  const filasTabla = config.tipo === 'liga'
    ? base.equipos.flatMap(equipo => equipo.clasificaciones
      .filter(fila => fila.competencia === slugSolicitado && fila.temporada === temporada)
      .map(fila => ({ ...fila, equipoSlug: equipo.slug, equipoNombre: equipo.nombre, equipoEscudo: equipo.escudo })))
      .sort((a, b) => a.fase.localeCompare(b.fase, 'es-CO') || a.posicion - b.posicion)
    : []
  const tabla = seleccionarFasesClasificacionCompletas(filasTabla, slugSolicitado)
  const tablaDisponible = tabla.length > 0
  const equipos = listarEquiposCompeticion(partidos)
  const temporadas = temporadasDisponibles.map(temporadaDisponible => crearResumenTemporada(
    slugSolicitado,
    config.nombre,
    temporadaDisponible,
    temporadaActual,
    partidosCompetencia.filter(partido => partido.temporada === temporadaDisponible)
  ))
  const indexable = evaluarIndexabilidad({
    tipo: 'competicion',
    slug: slugSolicitado,
    nombre: config.nombre,
    temporada,
    partidosPublicos: partidos.length,
    equiposPublicos: equipos.length,
    fuenteDisponible: partidos.length > 0
  })
  const noticias = await listarNoticiasCompeticion(
    cliente,
    config.temaNoticias,
    config.nombre,
    equiposCompetencia.map(equipo => equipo.nombre)
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
    temporadas,
    tablaDisponible,
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
  const jornada = construirJornadasIndexablesPublicas(
    slugSolicitado,
    temporadaSolicitada,
    base.partidos.filter(partido => partido.competencia === slugSolicitado && partido.temporada === temporadaSolicitada),
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
  partidos: PartidoSeoPublico[]
): TemporadaCompeticionPublica {
  const equipos = listarEquiposCompeticion(partidos)
  const indexable = evaluarIndexabilidad({
    tipo: 'competicion',
    slug,
    nombre,
    temporada,
    partidosPublicos: partidos.length,
    equiposPublicos: equipos.length,
    fuenteDisponible: partidos.length > 0
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
  tema: string,
  nombreCompetencia: string,
  nombresEquipos: string[]
): Promise<NoticiaCompeticionPublica[]> {
  const consulta = analizarConsultaArticulosPublicos({ tema, limite: '30' })
  if (!consulta) return []
  try {
    const noticias = await listarArticulosPublicosEditoriales(cliente, consulta.limite, 0, consulta)
    return noticias
      .filter(noticia => esNoticiaRelacionadaCompeticion(
        noticia,
        nombreCompetencia,
        nombresEquipos
      ))
      .slice(0, 6)
      .map(noticia => ({
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
    return []
  }
}

export function esNoticiaRelacionadaCompeticion(
  noticia: Pick<ResumenArticuloPublico, 'titulo' | 'resumen'>,
  nombreCompetencia: string,
  nombresEquipos: string[]
): boolean {
  const titulo = normalizarTextoCompeticion(noticia.titulo)
  const texto = normalizarTextoCompeticion(`${noticia.titulo} ${noticia.resumen}`)
  if (contieneFraseNormalizada(titulo, normalizarTextoCompeticion(nombreCompetencia))) return true

  const equiposPorAlias = new Map<string, Set<number>>()
  nombresEquipos.forEach((nombre, indice) => {
    for (const alias of crearAliasEquipoCompeticion(nombre)) {
      const equipos = equiposPorAlias.get(alias) || new Set<number>()
      equipos.add(indice)
      equiposPorAlias.set(alias, equipos)
    }
  })

  const equiposMencionados = new Set<number>()
  for (const [alias, equipos] of equiposPorAlias) {
    if (alias.length >= 4 && equipos.size === 1 && contieneFraseNormalizada(texto, alias)) {
      equiposMencionados.add([...equipos][0]!)
    }
  }
  return equiposMencionados.size >= 2
}

function crearAliasEquipoCompeticion(nombre: string): Set<string> {
  const completo = normalizarTextoCompeticion(nombre)
  const palabrasIgnorables = new Set(['atletico', 'deportivo', 'independiente', 'fc', 'ceif', 'de', 'del', 'la', 'los'])
  const palabras = completo.split(' ').filter(palabra => !palabrasIgnorables.has(palabra))
  const alias = new Set([completo, palabras.join(' ')])
  if (palabras.length > 1) {
    alias.add(palabras[0]!)
    alias.add(palabras[palabras.length - 1]!)
  }
  return alias
}

function normalizarTextoCompeticion(valor: string): string {
  return valor.toLocaleLowerCase('es-CO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function contieneFraseNormalizada(texto: string, frase: string): boolean {
  return Boolean(frase) && ` ${texto} `.includes(` ${frase} `)
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
