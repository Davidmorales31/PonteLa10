import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ArticuloBandejaEditorial,
  BorradorCreadoEditorial,
  CategoriaEditorial,
  EtiquetaInternaEditorial,
  RespuestaBandejaEditorial,
  TaxonomiasEditoriales,
  TemaEditorial
} from '~/types/contenidoEditorial'
import {
  crearSlugEditorial,
  crearSufijoSlug,
  documentoEditorialVacio,
  type esquemaCrearBorrador,
  type esquemaCrearTaxonomia,
  type esquemaFiltrosBandeja
} from '~/utils/editorial/contenido'
import type { z } from 'zod'

type FiltrosBandeja = z.infer<typeof esquemaFiltrosBandeja>
type EntradaBorrador = z.infer<typeof esquemaCrearBorrador>
type EntradaTaxonomia = z.infer<typeof esquemaCrearTaxonomia>

interface FilaCategoria {
  id: string
  slug: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
}

interface FilaArticulo {
  id: string
  slug: string
  title: string
  summary: string
  status: ArticuloBandejaEditorial['estado']
  content_type: ArticuloBandejaEditorial['tipo']
  source_origin: ArticuloBandejaEditorial['origen']
  author_id: string | null
  updated_at: string
  created_at: string
  lock_version: number
  categories: FilaCategoria | FilaCategoria[] | null
}

interface FilaPerfil {
  id: string
  display_name: string
}

interface FilaTema {
  id: string
  slug: string
  name: string
  description: string | null
  is_active: boolean
}

interface FilaEtiqueta {
  id: string
  slug: string
  name: string
  color: string
  is_active: boolean
}

function mapearCategoria(fila: FilaCategoria): CategoriaEditorial {
  return {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.name,
    descripcion: fila.description || '',
    activa: fila.is_active,
    orden: fila.display_order
  }
}

function obtenerCategoriaRelacion(
  relacion: FilaCategoria | FilaCategoria[] | null
): CategoriaEditorial | null {
  const fila = Array.isArray(relacion) ? relacion[0] : relacion
  return fila ? mapearCategoria(fila) : null
}

function crearErrorRepositorio(mensaje: string) {
  return createError({
    statusCode: 503,
    statusMessage: mensaje,
    data: { codigo: 'REPOSITORIO_EDITORIAL_NO_DISPONIBLE' }
  })
}

export async function listarContenidosEditoriales(
  clienteSupabase: SupabaseClient,
  filtros: FiltrosBandeja
): Promise<RespuestaBandejaEditorial> {
  const desde = (filtros.pagina - 1) * filtros.limite
  const hasta = desde + filtros.limite - 1

  let consulta = clienteSupabase
    .from('articles')
    .select(`
      id,
      slug,
      title,
      summary,
      status,
      content_type,
      source_origin,
      author_id,
      updated_at,
      created_at,
      lock_version,
      categories (
        id,
        slug,
        name,
        description,
        is_active,
        display_order
      )
    `, { count: 'exact' })

  if (filtros.buscar) {
    const terminoSeguro = filtros.buscar.replace(/[%_]/g, '\\$&')
    consulta = consulta.ilike('title', `%${terminoSeguro}%`)
  }

  if (filtros.estado) consulta = consulta.eq('status', filtros.estado)
  if (filtros.tipo) consulta = consulta.eq('content_type', filtros.tipo)
  if (filtros.origen) consulta = consulta.eq('source_origin', filtros.origen)
  if (filtros.categoriaId) consulta = consulta.eq('category_id', filtros.categoriaId)

  if (filtros.orden === 'tituloAsc') {
    consulta = consulta.order('title', { ascending: true })
  } else {
    consulta = consulta.order('updated_at', {
      ascending: filtros.orden === 'actualizadoAsc'
    })
  }

  const { data, error, count } = await consulta.range(desde, hasta)

  if (error) {
    throw crearErrorRepositorio('No se pudo cargar la bandeja editorial.')
  }

  const filas = (data || []) as unknown as FilaArticulo[]
  const idsAutores = [...new Set(
    filas.flatMap(fila => fila.author_id ? [fila.author_id] : [])
  )]
  const nombresAutores = new Map<string, string>()

  if (idsAutores.length) {
    const { data: perfiles } = await clienteSupabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', idsAutores)

    for (const perfil of (perfiles || []) as FilaPerfil[]) {
      nombresAutores.set(perfil.id, perfil.display_name)
    }
  }

  const contenidos = filas.map((fila): ArticuloBandejaEditorial => ({
    id: fila.id,
    slug: fila.slug,
    titulo: fila.title,
    resumen: fila.summary,
    estado: fila.status,
    tipo: fila.content_type,
    origen: fila.source_origin,
    categoria: obtenerCategoriaRelacion(fila.categories),
    autorId: fila.author_id,
    autorNombre: fila.author_id
      ? nombresAutores.get(fila.author_id) || 'Equipo Pont3la10'
      : 'Sin autor',
    actualizadoEn: fila.updated_at,
    creadoEn: fila.created_at,
    versionBloqueo: fila.lock_version
  }))

  const total = count || 0

  return {
    contenidos,
    paginacion: {
      pagina: filtros.pagina,
      limite: filtros.limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / filtros.limite))
    }
  }
}

async function validarCategoria(
  clienteSupabase: SupabaseClient,
  categoriaId: string | null
): Promise<void> {
  if (!categoriaId) return

  const { data, error } = await clienteSupabase
    .from('categories')
    .select('id')
    .eq('id', categoriaId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw crearErrorRepositorio('No se pudo validar la seccion editorial.')
  }

  if (!data) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La seccion seleccionada no esta disponible.',
      data: { codigo: 'CATEGORIA_EDITORIAL_INVALIDA' }
    })
  }
}

export async function crearBorradorEditorial(
  clienteSupabase: SupabaseClient,
  entrada: EntradaBorrador,
  autorId: string
): Promise<BorradorCreadoEditorial> {
  await validarCategoria(clienteSupabase, entrada.categoriaId)

  const slugBase = crearSlugEditorial(entrada.titulo)

  for (let intento = 0; intento < 3; intento += 1) {
    const slug = intento === 0
      ? slugBase
      : `${slugBase}-${crearSufijoSlug()}`

    const { data, error } = await clienteSupabase
      .from('articles')
      .insert({
        slug,
        title: entrada.titulo,
        summary: entrada.resumen,
        body: '',
        body_json: documentoEditorialVacio,
        status: 'draft',
        category_id: entrada.categoriaId,
        author_id: autorId,
        content_type: entrada.tipo,
        source_origin: 'manual',
        last_saved_by: autorId
      })
      .select('id, slug, title, status, created_at')
      .single()

    if (!error && data) {
      return {
        id: String(data.id),
        slug: String(data.slug),
        titulo: String(data.title),
        estado: data.status as BorradorCreadoEditorial['estado'],
        creadoEn: String(data.created_at)
      }
    }

    if (error?.code !== '23505') {
      throw crearErrorRepositorio('No se pudo crear el borrador.')
    }
  }

  throw createError({
    statusCode: 409,
    statusMessage: 'No se pudo generar un slug unico para el contenido.',
    data: { codigo: 'SLUG_EDITORIAL_EN_CONFLICTO' }
  })
}

export async function obtenerTaxonomiasEditoriales(
  clienteSupabase: SupabaseClient
): Promise<TaxonomiasEditoriales> {
  const [
    respuestaCategorias,
    respuestaTemas,
    respuestaEtiquetas
  ] = await Promise.all([
    clienteSupabase
      .from('categories')
      .select('id, slug, name, description, is_active, display_order')
      .order('display_order')
      .order('name'),
    clienteSupabase
      .from('editorial_tags')
      .select('id, slug, name, description, is_active')
      .order('name'),
    clienteSupabase
      .from('editorial_labels')
      .select('id, slug, name, color, is_active')
      .order('name')
  ])

  const error = respuestaCategorias.error
    || respuestaTemas.error
    || respuestaEtiquetas.error

  if (error) {
    throw crearErrorRepositorio('No se pudieron cargar las taxonomias.')
  }

  return {
    categorias: ((respuestaCategorias.data || []) as FilaCategoria[])
      .map(mapearCategoria),
    temas: ((respuestaTemas.data || []) as FilaTema[])
      .map((fila): TemaEditorial => ({
        id: fila.id,
        slug: fila.slug,
        nombre: fila.name,
        descripcion: fila.description || '',
        activo: fila.is_active
      })),
    etiquetas: ((respuestaEtiquetas.data || []) as FilaEtiqueta[])
      .map((fila): EtiquetaInternaEditorial => ({
        id: fila.id,
        slug: fila.slug,
        nombre: fila.name,
        color: fila.color,
        activa: fila.is_active
      }))
  }
}

export async function crearTaxonomiaEditorial(
  clienteSupabase: SupabaseClient,
  entrada: EntradaTaxonomia
): Promise<{ id: string, slug: string }> {
  const slug = crearSlugEditorial(entrada.nombre)
  const respuesta = entrada.tipo === 'categoria'
    ? await clienteSupabase
        .from('categories')
        .insert({
          slug,
          name: entrada.nombre,
          description: entrada.descripcion,
          display_order: 100
        })
        .select('id, slug')
        .single()
    : entrada.tipo === 'tema'
      ? await clienteSupabase
          .from('editorial_tags')
          .insert({
            slug,
            name: entrada.nombre,
            description: entrada.descripcion
          })
          .select('id, slug')
          .single()
      : await clienteSupabase
          .from('editorial_labels')
          .insert({
            slug,
            name: entrada.nombre,
            color: entrada.color
          })
          .select('id, slug')
          .single()

  const { data, error } = respuesta

  if (error?.code === '23505') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ya existe una taxonomia con ese nombre.',
      data: { codigo: 'TAXONOMIA_DUPLICADA' }
    })
  }

  if (error || !data) {
    throw crearErrorRepositorio('No se pudo crear la taxonomia.')
  }

  return {
    id: String(data.id),
    slug: String(data.slug)
  }
}
