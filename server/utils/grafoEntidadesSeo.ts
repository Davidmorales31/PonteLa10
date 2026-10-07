import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import {
  jugadoresColombianosEuropa
} from '~/data/jugadoresColombianosEuropa'
import type {
  ArticuloDetalleEditorial,
  RelacionEntidadSeoPublica,
  ResumenArticuloPublico,
  TipoEntidadSeo,
  TipoRelacionEntidadSeo
} from '~/types/contenidoEditorial'
import { extraerTextoDocumento } from '~/utils/editorial/documento'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'
import {
  catalogoCompeticionesPublicas,
  listarRutasIndexablesCompeticiones
} from '~/server/utils/competicionesPublicas'
import { listarEquiposLigaPublicos } from '~/server/utils/equiposLigaPublicos'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import {
  listarPartidosSeoPublicos,
  normalizarClaveEquipoLiga,
  type PartidoSeoPublico
} from '~/server/utils/partidosSeoPublicos'

export interface EntidadCandidataSeo {
  tipo: TipoEntidadSeo
  slug: string
  nombre: string
  ruta: string
  /** Cada grupo requiere que todas sus frases aparezcan; basta con un grupo. */
  coincidencias: string[][]
  idArticulo?: string
}

export interface RelacionEntidadEditorialSeo {
  tipo: TipoEntidadSeo
  slug: string
  nombre: string
  ruta: string
  relacion: TipoRelacionEntidadSeo
  estado: 'confirmed' | 'rejected'
  origen: 'automatic' | 'editorial'
  confianza: number | null
}

export interface SugerenciaEntidadSeo {
  tipo: TipoEntidadSeo
  slug: string
  nombre: string
  ruta: string
  confianza: number
  motivo: string
}

interface FilaRelacionEntidadSeo {
  article_id: string
  entity_type: TipoEntidadSeo
  entity_slug: string
  entity_name: string
  relation_type: TipoRelacionEntidadSeo
  status?: 'confirmed' | 'rejected'
  source?: 'automatic' | 'editorial'
  confidence: number | null
}

interface FilaRelacionArticuloSeo {
  source_article_id: string
  target_article_id: string
}

export interface ResultadoDetectorHuerfanasSeo {
  paginasPublicas: number
  paginasContextualmenteEnlazadas: number
  paginasSinEnlaceContextual: number
  coberturaArticulosCompleta: boolean
  limiteArticulos: number
  paginas: Array<{
    tipo: TipoEntidadSeo
    slug: string
    nombre: string
    ruta: string
  }>
}

const limiteArticulosCatalogo = 1000
const tamanoPaginaArticulos = 50
const duracionCacheCatalogoMs = 60_000
let cacheCatalogo: { venceEn: number, catalogo: CatalogoEntidadesSeo } | null = null
let cargaCatalogo: Promise<CatalogoEntidadesSeo> | null = null

interface CatalogoEntidadesSeo {
  entidades: EntidadCandidataSeo[]
  partidos: PartidoSeoPublico[]
  articulos: ResumenArticuloPublico[]
  equipos: Map<string, Awaited<ReturnType<typeof listarEquiposLigaPublicos>>[number]>
  articulosCompleto: boolean
}

export async function listarEntidadesPublicasSeo(
  cliente: SupabaseClient
): Promise<EntidadCandidataSeo[]> {
  return (await obtenerCatalogo(cliente)).entidades
}

export async function sugerirRelacionesSeo(
  cliente: SupabaseClient,
  articulo: Pick<ArticuloDetalleEditorial, 'id' | 'slug' | 'titulo' | 'resumen' | 'documento'>,
  existentes: Array<Pick<RelacionEntidadEditorialSeo, 'tipo' | 'slug'>> = []
): Promise<SugerenciaEntidadSeo[]> {
  const textoCuerpo = extraerTextoDocumento(articulo.documento)
  const candidatas = await listarEntidadesPublicasSeo(cliente)
  const excluidas = new Set(existentes.map(relacion => claveEntidad(relacion.tipo, relacion.slug)))
  excluidas.add(claveEntidad('article', articulo.slug))

  return sugerirEntidadesPorCoincidencia(
    articulo.titulo,
    articulo.resumen,
    textoCuerpo,
    candidatas.filter(entidad => entidad.idArticulo !== articulo.id),
    excluidas
  )
}

export function sugerirEntidadesPorCoincidencia(
  titulo: string,
  resumen: string,
  cuerpo: string,
  entidades: EntidadCandidataSeo[],
  excluidas: Set<string> = new Set()
): SugerenciaEntidadSeo[] {
  const tituloNormalizado = normalizarTexto(titulo)
  const resumenNormalizado = normalizarTexto(resumen)
  const textoAmpliado = normalizarTexto(`${titulo} ${resumen} ${cuerpo}`)

  return entidades.flatMap((entidad) => {
    if (excluidas.has(claveEntidad(entidad.tipo, entidad.slug))) return []
    const grupos = entidad.coincidencias
      .map(grupo => grupo.map(normalizarTexto).filter(frase => frase.length >= 4))
      .filter(grupo => grupo.length > 0)
    const grupoCoincidente = grupos.find(grupo => grupo.every(frase => contieneFrase(tituloNormalizado, frase)))
      || grupos.find(grupo => grupo.every(frase => contieneFrase(`${tituloNormalizado} ${resumenNormalizado}`, frase)))
      || grupos.find(grupo => grupo.every(frase => contieneFrase(textoAmpliado, frase)))
    if (!grupoCoincidente) return []

    const esCruce = entidad.tipo === 'match' && grupoCoincidente.length > 1
    const enTitulo = grupoCoincidente.every(frase => contieneFrase(tituloNormalizado, frase))
    const enResumen = grupoCoincidente.every(frase => contieneFrase(resumenNormalizado, frase))
    const enTextoBreve = grupoCoincidente.every(frase => contieneFrase(
      `${tituloNormalizado} ${resumenNormalizado}`,
      frase
    ))
    const confianza = esCruce
      ? enTitulo ? 0.92 : enTextoBreve ? 0.82 : 0.68
      : enTitulo ? 0.96 : enTextoBreve ? 0.84 : 0.7

    return [{
      tipo: entidad.tipo,
      slug: entidad.slug,
      nombre: entidad.nombre,
      ruta: entidad.ruta,
      confianza,
      motivo: enTitulo
        ? 'Coincidencia exacta en el título.'
        : enResumen
          ? 'Coincidencia exacta en el resumen.'
          : 'Coincidencia exacta en el cuerpo; requiere revisión editorial.'
    }]
  })
    .sort((a, b) => b.confianza - a.confianza || a.nombre.localeCompare(b.nombre, 'es-CO'))
    .slice(0, 30)
}

export async function listarRelacionesEditorialesSeo(
  cliente: SupabaseClient,
  articuloId: string
): Promise<RelacionEntidadEditorialSeo[]> {
  const { data, error } = await cliente
    .from('editorial_article_entity_relations')
    .select('entity_type,entity_slug,entity_name,relation_type,status,source,confidence')
    .eq('article_id', articuloId)
    .order('entity_type', { ascending: true })
    .order('entity_name', { ascending: true })

  if (error) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron cargar las relaciones editoriales.' })
  }

  const candidatas = new Map((await listarEntidadesPublicasSeo(cliente))
    .map(entidad => [claveEntidad(entidad.tipo, entidad.slug), entidad]))
  return ((data || []) as unknown as FilaRelacionEntidadSeo[]).flatMap((fila) => {
    const entidad = candidatas.get(claveEntidad(fila.entity_type, fila.entity_slug))
    if (fila.status !== 'confirmed' && fila.status !== 'rejected') return []
    return [{
      tipo: entidad?.tipo || fila.entity_type,
      slug: entidad?.slug || fila.entity_slug,
      nombre: entidad?.nombre || fila.entity_name,
      ruta: entidad?.ruta || '',
      relacion: fila.relation_type,
      estado: fila.status,
      origen: fila.source === 'automatic' ? 'automatic' : 'editorial',
      confianza: fila.confidence
    }]
  })
}

export async function guardarDecisionesRelacionesSeo(
  cliente: SupabaseClient,
  articulo: Pick<ArticuloDetalleEditorial, 'id' | 'slug' | 'titulo' | 'resumen' | 'documento'>,
  decisiones: Array<{
    tipo: TipoEntidadSeo
    slug: string
    relacion: TipoRelacionEntidadSeo
    estado: 'confirmed' | 'rejected'
  }>
): Promise<RelacionEntidadEditorialSeo[]> {
  const catalogo = await obtenerCatalogo(cliente)
  const relacionesActuales = await listarRelacionesEditorialesSeo(cliente, articulo.id)
  const relacionesActualesPorClave = new Map(relacionesActuales.map(relacion => [
    claveEntidad(relacion.tipo, relacion.slug),
    relacion
  ]))
  const entidades = new Map(catalogo.entidades.map(entidad => [
    claveEntidad(entidad.tipo, entidad.slug),
    entidad
  ]))
  const candidatas = decisiones.map((decision) => {
    const entidad = entidades.get(claveEntidad(decision.tipo, decision.slug))
    const relacionActual = relacionesActualesPorClave.get(claveEntidad(decision.tipo, decision.slug))
    if ((!entidad && (decision.estado !== 'rejected' || !relacionActual))
      || (entidad?.tipo === 'article' && entidad.slug === articulo.slug)) {
      throw createError({ statusCode: 422, statusMessage: 'Una de las entidades ya no está disponible para enlazar.' })
    }
    return { decision, entidad: entidad || relacionActual! }
  })
  const sugerencias = sugerirEntidadesPorCoincidencia(
    articulo.titulo,
    articulo.resumen,
    extraerTextoDocumento(articulo.documento),
    catalogo.entidades.filter(entidad => entidad.idArticulo !== articulo.id)
  )
  const sugerenciasPorClave = new Map(sugerencias.map(sugerencia => [
    claveEntidad(sugerencia.tipo, sugerencia.slug), sugerencia
  ]))
  const filas = candidatas.map(({ decision, entidad }) => {
    const sugerencia = sugerenciasPorClave.get(claveEntidad(entidad.tipo, entidad.slug))
    return {
      article_id: articulo.id,
      entity_type: entidad.tipo,
      entity_slug: entidad.slug,
      entity_name: entidad.nombre,
      relation_type: decision.relacion,
      status: decision.estado,
      source: sugerencia ? 'automatic' as const : 'editorial' as const,
      confidence: sugerencia?.confianza ?? null
    }
  })

  if (filas.length) {
    const { error } = await cliente.rpc('save_editorial_article_entity_relations', {
      p_article_id: articulo.id,
      p_relations: filas.map(fila => ({
        entity_type: fila.entity_type,
        entity_slug: fila.entity_slug,
        relation_type: fila.relation_type,
        status: fila.status,
        source: fila.source,
        confidence: fila.confidence
      }))
    })
    if (error) {
      throw createError({ statusCode: 503, statusMessage: 'No se pudieron guardar las relaciones editoriales.' })
    }
  }

  return listarRelacionesEditorialesSeo(cliente, articulo.id)
}

export async function listarRelacionesPublicasSeo(
  cliente: SupabaseClient,
  articuloId: string
): Promise<RelacionEntidadSeoPublica[]> {
  const { data, error } = await cliente.rpc('list_public_article_entity_relations', {
    requested_article_id: articuloId
  })

  // Si el esquema aún no está desplegado, la publicación conserva su servicio normal.
  if (error || !data?.length) return []

  return ((data || []) as unknown as FilaRelacionEntidadSeo[]).flatMap((fila) => {
    const ruta = construirRutaEntidadSeo(fila.entity_type, fila.entity_slug)
    if (!ruta || !fila.entity_name || !['about', 'mentions', 'related'].includes(fila.relation_type)) return []
    return [{
      tipo: fila.entity_type,
      slug: fila.entity_slug,
      nombre: fila.entity_name,
      ruta,
      relacion: fila.relation_type
    }]
  })
}

export async function detectarPaginasSeoSinEnlacesContextuales(
  cliente: SupabaseClient
): Promise<ResultadoDetectorHuerfanasSeo> {
  const catalogo = await obtenerCatalogo(cliente)
  const nodos = new Map(catalogo.entidades.map(entidad => [
    claveEntidad(entidad.tipo, entidad.slug), entidad
  ]))
  const entradas = new Set<string>()
  const articulosPublicos = new Set(catalogo.articulos.map(articulo => articulo.id))
  const slugPorArticulo = new Map(catalogo.articulos.map(articulo => [articulo.id, articulo.slug]))

  let desde = 0
  while (true) {
    const { data, error } = await cliente
      .from('editorial_article_entity_relations')
      .select('article_id,entity_type,entity_slug,status')
      .eq('status', 'confirmed')
      .range(desde, desde + 999)
    if (error) {
      throw createError({ statusCode: 503, statusMessage: 'No se pudo revisar el grafo editorial.' })
    }

    const filas = (data || []) as unknown as FilaRelacionEntidadSeo[]
    for (const fila of filas) {
      if (!articulosPublicos.has(fila.article_id)) continue
      const slugOrigen = slugPorArticulo.get(fila.article_id)
      const origen = slugOrigen ? claveEntidad('article', slugOrigen) : ''
      const destino = claveEntidad(fila.entity_type, fila.entity_slug)
      if (origen && nodos.has(destino)) entradas.add(destino)
    }
    if (filas.length < 1000) break
    desde += 1000
  }

  const { data: enlacesArticulo, error: errorEnlacesArticulo } = await cliente
    .rpc('list_public_editorial_article_links')
  if (!errorEnlacesArticulo) {
    for (const fila of (enlacesArticulo || []) as unknown as FilaRelacionArticuloSeo[]) {
      const slugDestino = slugPorArticulo.get(fila.target_article_id)
      if (slugDestino) entradas.add(claveEntidad('article', slugDestino))
    }
  }

  agregarRelacionesDeportivasAlGrafo(catalogo, nodos, entradas)
  const huerfanas = [...nodos.values()]
    .filter(entidad => !entradas.has(claveEntidad(entidad.tipo, entidad.slug)))
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es-CO'))
  const maxResultados = 200

  return {
    paginasPublicas: nodos.size,
    paginasContextualmenteEnlazadas: nodos.size - huerfanas.length,
    paginasSinEnlaceContextual: huerfanas.length,
    coberturaArticulosCompleta: catalogo.articulosCompleto && !errorEnlacesArticulo,
    limiteArticulos: limiteArticulosCatalogo,
    paginas: huerfanas.slice(0, maxResultados).map(({ tipo, slug, nombre, ruta }) => ({
      tipo, slug, nombre, ruta
    }))
  }
}

export function construirRutaEntidadSeo(tipo: TipoEntidadSeo, slug: string): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null
  const rutas: Record<TipoEntidadSeo, string> = {
    article: `/articulos/${slug}`,
    match: `/partidos/${slug}`,
    team: `/equipos/${slug}`,
    player: `/jugadores/${slug}`,
    competition: `/competiciones/${slug}`
  }
  return rutas[tipo] || null
}

export function esRutaRaizCompeticionIndexable(ruta: string, slug: string): boolean {
  return ruta === `/competiciones/${slug}`
}

export function claveEntidad(tipo: TipoEntidadSeo, slug: string): string {
  return `${tipo}:${slug}`
}

function agregarRelacionesDeportivasAlGrafo(
  catalogo: CatalogoEntidadesSeo,
  nodos: Map<string, EntidadCandidataSeo>,
  entradas: Set<string>
) {
  const equiposPorNombre = new Map<string, string>()
  for (const entidad of nodos.values()) {
    if (entidad.tipo === 'team') equiposPorNombre.set(normalizarClaveEquipoLiga(entidad.nombre), entidad.slug)
  }
  const anadirEntrada = (tipo: TipoEntidadSeo, slug?: string | null) => {
    if (slug && nodos.has(claveEntidad(tipo, slug))) entradas.add(claveEntidad(tipo, slug))
  }

  for (const partido of catalogo.partidos) {
    const matchKey = claveEntidad('match', partido.slug)
    if (!nodos.has(matchKey)) continue
    anadirEntrada('team', partido.equipoLocalSlug || equiposPorNombre.get(normalizarClaveEquipoLiga(partido.local)))
    anadirEntrada('team', partido.equipoVisitanteSlug || equiposPorNombre.get(normalizarClaveEquipoLiga(partido.visitante)))
    anadirEntrada('competition', partido.competencia)
  }
  for (const entidad of nodos.values()) {
    if (entidad.tipo !== 'team') continue
    const equipo = catalogo.equipos.get(entidad.slug)
    const competencia = equipo?.clasificaciones[0]?.competencia
    anadirEntrada('competition', competencia)
  }

  // La relación inversa equipo/competición y competición/partidos también cuenta como navegación contextual.
  for (const partido of catalogo.partidos) {
    const matchKey = claveEntidad('match', partido.slug)
    if (!nodos.has(matchKey)) continue
    const equipoLocal = partido.equipoLocalSlug || equiposPorNombre.get(normalizarClaveEquipoLiga(partido.local))
    const equipoVisitante = partido.equipoVisitanteSlug || equiposPorNombre.get(normalizarClaveEquipoLiga(partido.visitante))
    const competenciaDisponible = nodos.has(claveEntidad('competition', partido.competencia))
    const equiposDisponibles = [equipoLocal, equipoVisitante]
      .filter((slug): slug is string => Boolean(slug && nodos.has(claveEntidad('team', slug))))
    if (competenciaDisponible || equiposDisponibles.length) entradas.add(matchKey)
    for (const slug of equiposDisponibles) entradas.add(claveEntidad('team', slug))
  }
}

async function obtenerCatalogo(cliente: SupabaseClient): Promise<CatalogoEntidadesSeo> {
  const ahora = Date.now()
  if (cacheCatalogo && cacheCatalogo.venceEn > ahora) return cacheCatalogo.catalogo
  if (cargaCatalogo) return cargaCatalogo

  const carga = (async () => {
    const [articulos, resultadoPartidos, resultadoEquipos, rutasCompeticiones] = await Promise.all([
      cargarArticulosPublicos(cliente),
      listarPartidosSeoPublicos(cliente).then(partidos => ({ partidos, completo: true })).catch(() => ({ partidos: [], completo: false })),
      listarEquiposLigaPublicos(cliente).then(equipos => ({ equipos, completo: true })).catch(() => ({ equipos: [], completo: false })),
      listarRutasIndexablesCompeticiones(cliente).catch(() => [])
    ])
    const entidades: EntidadCandidataSeo[] = []
    const partidos = resultadoPartidos.partidos
    const equipos = resultadoEquipos.equipos
    const equipoPorNombre = new Map<string, string>()
    const equiposPublicos = equipos.filter(equipo => {
      const partidosEquipo = partidos.filter(partido =>
        normalizarClaveEquipoLiga(partido.local) === normalizarClaveEquipoLiga(equipo.nombre)
        || normalizarClaveEquipoLiga(partido.visitante) === normalizarClaveEquipoLiga(equipo.nombre)
      )
      const clasificacion = equipo.clasificaciones[0]
      const indexable = evaluarIndexabilidad({
        tipo: 'equipo',
        slug: equipo.slug,
        nombre: equipo.nombre,
        competencia: clasificacion?.competencia || '',
        temporada: clasificacion?.temporada || '',
        escudo: equipo.escudo,
        posicionVerificadaEn: clasificacion?.verificadoEn || null,
        partidosPublicos: partidosEquipo.length
      })
      if (indexable) equipoPorNombre.set(normalizarClaveEquipoLiga(equipo.nombre), equipo.slug)
      return indexable
    })
    const equiposPorSlug = new Map(equipos.map(equipo => [equipo.slug, equipo]))
    for (const equipo of equiposPublicos) {
      entidades.push({
        tipo: 'team', slug: equipo.slug, nombre: equipo.nombre, ruta: `/equipos/${equipo.slug}`,
        coincidencias: [[equipo.nombre]]
      })
    }

    const competenciasIndexables = new Set(rutasCompeticiones.flatMap(({ ruta }) => {
      const slug = /^\/competiciones\/([a-z0-9-]+)(?:\/|$)/.exec(ruta)?.[1]
      return slug
        && Object.hasOwn(catalogoCompeticionesPublicas, slug)
        && esRutaRaizCompeticionIndexable(ruta, slug)
        ? [slug]
        : []
    }))
    for (const slug of competenciasIndexables) {
      const datos = catalogoCompeticionesPublicas[slug as keyof typeof catalogoCompeticionesPublicas]
      entidades.push({
        tipo: 'competition', slug, nombre: datos.nombre, ruta: `/competiciones/${slug}`,
        coincidencias: [[datos.nombre]]
      })
    }

    for (const partido of partidos) {
      if (!competenciasIndexables.has(partido.competencia)) continue
      if (!evaluarIndexabilidad(partido)) continue
      entidades.push({
        tipo: 'match', slug: partido.slug, nombre: `${partido.local} vs. ${partido.visitante}`,
        ruta: `/partidos/${partido.slug}`,
        coincidencias: [[partido.local, partido.visitante]]
      })
    }

    for (const jugador of jugadoresColombianosEuropa) {
      if (!evaluarIndexabilidad({ tipo: 'jugador', ...jugador })) continue
      entidades.push({
        tipo: 'player', slug: jugador.slug, nombre: jugador.nombre, ruta: `/jugadores/${jugador.slug}`,
        coincidencias: [[jugador.nombre]]
      })
    }

    for (const articulo of articulos.articulos) {
      entidades.push({
        tipo: 'article', slug: articulo.slug, nombre: articulo.titulo,
        ruta: `/articulos/${articulo.slug}`, idArticulo: articulo.id,
        coincidencias: [[articulo.titulo]]
      })
    }

    const unicas = [...new Map(entidades.map(entidad => [
      claveEntidad(entidad.tipo, entidad.slug), entidad
    ])).values()].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es-CO'))
    return {
      entidades: unicas,
      partidos,
      articulos: articulos.articulos,
      articulosCompleto: articulos.completo
        && resultadoPartidos.completo
        && resultadoEquipos.completo
        && articulos.articulos.length < limiteArticulosCatalogo,
      equipos: equiposPorSlug
    }
  })()

  cargaCatalogo = carga
  try {
    const catalogo = await carga
    cacheCatalogo = { venceEn: Date.now() + duracionCacheCatalogoMs, catalogo }
    return catalogo
  } finally {
    if (cargaCatalogo === carga) cargaCatalogo = null
  }
}

async function cargarArticulosPublicos(
  cliente: SupabaseClient
): Promise<{ articulos: ResumenArticuloPublico[], completo: boolean }> {
  const articulos: ResumenArticuloPublico[] = []
  for (let desplazamiento = 0; desplazamiento < limiteArticulosCatalogo; desplazamiento += tamanoPaginaArticulos) {
    try {
      const pagina = await listarArticulosPublicosEditoriales(
        cliente,
        tamanoPaginaArticulos,
        desplazamiento
      )
      articulos.push(...pagina)
      if (pagina.length < tamanoPaginaArticulos) return { articulos, completo: true }
    } catch {
      return { articulos, completo: false }
    }
  }
  return { articulos, completo: false }
}

function normalizarTexto(valor: string): string {
  return valor.toLocaleLowerCase('es-CO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function contieneFrase(texto: string, frase: string): boolean {
  return Boolean(frase) && ` ${texto} `.includes(` ${frase} `)
}
