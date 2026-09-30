import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  EstadoHubPublicoEditorial,
  HubEditorialResumen,
  HubPublicoEditorial,
  ModuloHubEditorial,
  TipoHubPublicoEditorial
} from '~/types/contenidoEditorial'
import type { DatosHubPublico, ModuloHub } from '~/utils/editorial/hubs'
import { esquemaDatosHubPublico } from '~/utils/editorial/hubs'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'

interface FilaHubPublico {
  id: string
  slug: string
  hub_type: TipoHubPublicoEditorial
  title: string
  description: string
  body: string
  modules: unknown
  seo_title: string
  seo_description: string
  status: EstadoHubPublicoEditorial
  published_at: string | null
  updated_at: string
}

function crearErrorRepositorioHubs(detalle?: string) {
  return createError({
    statusCode: 503,
    statusMessage: 'No se pudieron cargar los hubs editoriales.',
    data: detalle ? { detalle } : undefined
  })
}

const columnasAdmin = 'id, slug, hub_type, title, description, body, modules, seo_title, seo_description, status, published_at, updated_at'

function mapearHubEditorial(fila: FilaHubPublico): HubEditorialResumen {
  return {
    id: fila.id,
    slug: fila.slug,
    tipo: fila.hub_type,
    titulo: fila.title,
    descripcion: fila.description,
    cuerpo: fila.body,
    modulos: fila.modules as ModuloHubEditorial[],
    tituloSeo: fila.seo_title,
    descripcionSeo: fila.seo_description,
    estado: fila.status,
    publicadoEn: fila.published_at || '',
    actualizadoEn: fila.updated_at
  }
}

function construirCambiosHub(datos: DatosHubPublico) {
  return {
    slug: datos.slug,
    hub_type: datos.tipo,
    title: datos.titulo,
    description: datos.descripcion,
    body: datos.cuerpo,
    modules: datos.modulos,
    seo_title: datos.tituloSeo,
    seo_description: datos.descripcionSeo
  }
}

export async function listarHubsEditoriales(
  clienteSupabase: SupabaseClient
): Promise<HubEditorialResumen[]> {
  const { data, error } = await clienteSupabase
    .from('public_hubs')
    .select(columnasAdmin)
    .order('updated_at', { ascending: false })

  if (error) throw crearErrorRepositorioHubs(error.message)
  return ((data || []) as unknown as FilaHubPublico[]).map(mapearHubEditorial)
}

export async function crearHubEditorial(
  clienteSupabase: SupabaseClient,
  datos: DatosHubPublico
): Promise<HubEditorialResumen> {
  const { data, error } = await clienteSupabase
    .from('public_hubs')
    .insert({
      ...construirCambiosHub(datos)
    })
    .select(columnasAdmin)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Ese slug ya está en uso.' })
    }
    throw crearErrorRepositorioHubs(error.message)
  }
  return mapearHubEditorial(data as unknown as FilaHubPublico)
}

export async function actualizarHubEditorial(
  clienteSupabase: SupabaseClient,
  id: string,
  datos: DatosHubPublico
): Promise<HubEditorialResumen> {
  const { data, error } = await clienteSupabase
    .from('public_hubs')
    .update(construirCambiosHub(datos))
    .eq('id', id)
    .eq('status', 'draft')
    .select(columnasAdmin)
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Ese slug ya está en uso.' })
    }
    throw crearErrorRepositorioHubs(error.message)
  }
  if (!data) {
    throw createError({ statusCode: 409, statusMessage: 'Solo se pueden editar borradores.' })
  }
  return mapearHubEditorial(data as unknown as FilaHubPublico)
}

export async function eliminarHubEditorial(
  clienteSupabase: SupabaseClient,
  id: string
): Promise<void> {
  const { data, error } = await clienteSupabase
    .from('public_hubs')
    .delete()
    .eq('id', id)
    .neq('status', 'published')
    .select('id')
    .maybeSingle()

  if (error) throw crearErrorRepositorioHubs(error.message)
  if (!data) {
    throw createError({ statusCode: 409, statusMessage: 'Retira del público un hub antes de eliminarlo.' })
  }
}

async function resolverModulosPublicos(
  clienteSupabase: SupabaseClient,
  modulos: ModuloHub[]
): Promise<ModuloHubEditorial[]> {
  return await Promise.all(modulos.map(async (modulo) => {
    if (modulo.tipo !== 'articulos') return modulo

    const articulos = await listarArticulosPublicosEditoriales(
      clienteSupabase,
      modulo.limite,
      0,
      {
        categoria: modulo.filtro.tipo === 'categoria' ? modulo.filtro.slug : null,
        terminosCategoria: [],
        tema: modulo.filtro.tipo === 'tema' ? modulo.filtro.slug : null,
        buscar: null
      }
    )

    return {
      ...modulo,
      articulos: articulos.map(articulo => ({
        id: articulo.id,
        slug: articulo.slug,
        titulo: articulo.titulo,
        resumen: articulo.resumen,
        imagen: articulo.imagen
      }))
    }
  }))
}

export async function obtenerHubPublico(
  clienteSupabase: SupabaseClient,
  slug: string
): Promise<HubPublicoEditorial | null> {
  const { data, error } = await clienteSupabase
    .from('public_hubs')
    .select('id, slug, hub_type, title, description, body, modules, seo_title, seo_description, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw crearErrorRepositorioHubs(error.message)
  if (!data) return null

  const fila = data as unknown as FilaHubPublico
  const datos = esquemaDatosHubPublico.safeParse({
    slug: fila.slug,
    tipo: fila.hub_type,
    titulo: fila.title,
    descripcion: fila.description,
    cuerpo: fila.body,
    modulos: fila.modules,
    tituloSeo: fila.seo_title,
    descripcionSeo: fila.seo_description
  })

  if (!datos.success) throw crearErrorRepositorioHubs('El contenido publicado no cumple el esquema vigente.')
  const modulos = await resolverModulosPublicos(clienteSupabase, datos.data.modulos)
  const tieneFeedConContenido = modulos.some(modulo =>
    modulo.tipo === 'articulos' && Boolean(modulo.articulos?.length)
  )

  if (!tieneFeedConContenido) return null

  return {
    id: fila.id,
    slug: fila.slug,
    tipo: fila.hub_type,
    titulo: fila.title,
    descripcion: fila.description,
    cuerpo: fila.body,
    modulos,
    tituloSeo: fila.seo_title,
    descripcionSeo: fila.seo_description,
    publicadoEn: fila.published_at || ''
  }
}

export async function listarHubsIndexablesSitemap(
  clienteSupabase: SupabaseClient
): Promise<Array<{ slug: string }>> {
  const slugs: string[] = []
  const tamanoPagina = 100
  let desplazamiento = 0
  let filas: Array<{ slug: string }>

  do {
    const { data, error } = await clienteSupabase
      .from('public_hubs')
      .select('slug')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(desplazamiento, desplazamiento + tamanoPagina - 1)

    if (error) throw crearErrorRepositorioHubs(error.message)
    filas = (data || []) as Array<{ slug: string }>
    const hubs = await Promise.all(filas.map(async (fila) => {
      const hub = await obtenerHubPublico(clienteSupabase, fila.slug)
      return hub ? hub.slug : null
    }))
    slugs.push(...hubs.filter((slug): slug is string => slug !== null))
    desplazamiento += filas.length
  } while (filas.length === tamanoPagina)

  return slugs.map(slug => ({ slug }))
}

export async function cambiarEstadoHubEditorial(
  clienteSupabase: SupabaseClient,
  id: string,
  estado: 'published' | 'draft' | 'archived'
): Promise<HubEditorialResumen> {
  const { data, error } = await clienteSupabase
    .from('public_hubs')
    .update({ status: estado })
    .eq('id', id)
    .in('status', ['draft', 'published', 'archived'])
    .select(columnasAdmin)
    .maybeSingle()

  if (error) {
    if (error.code === '23514') {
      throw createError({ statusCode: 422, statusMessage: error.message })
    }
    if (error.code === '42501') {
      throw createError({ statusCode: 403, statusMessage: 'La base de datos rechazó esta transición editorial.' })
    }
    throw crearErrorRepositorioHubs(error.message)
  }
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Hub no encontrado.' })
  return mapearHubEditorial(data as unknown as FilaHubPublico)
}

export async function validarAlimentacionHub(
  clienteSupabase: SupabaseClient,
  datos: DatosHubPublico
): Promise<{ valido: boolean, articulos: number }> {
  const feeds = datos.modulos.filter(modulo => modulo.tipo === 'articulos')
  if (!feeds.length) return { valido: false, articulos: 0 }

  const articulosPorFeed = await Promise.all(feeds.map(async modulo => {
    const articulos = await listarArticulosPublicosEditoriales(
      clienteSupabase,
      modulo.limite,
      0,
      {
        categoria: modulo.filtro.tipo === 'categoria' ? modulo.filtro.slug : null,
        terminosCategoria: [],
        tema: modulo.filtro.tipo === 'tema' ? modulo.filtro.slug : null,
        buscar: null
      }
    )
    return articulos.length
  }))

  const cantidadArticulos = articulosPorFeed.reduce((total, cantidad) => total + cantidad, 0)
  return { valido: cantidadArticulos > 0, articulos: cantidadArticulos }
}
