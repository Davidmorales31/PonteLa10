import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mapearMedioEditorial,
  type FilaMedioEditorial
} from '~/server/utils/repositorioMediaEditorial'
import type {
  ArticuloDetalleEditorial,
  ArticuloBandejaEditorial,
  ArticuloPublicoEditorial,
  AutoguardadoArticuloEditorial,
  BorradorCreadoEditorial,
  CategoriaEditorial,
  ColaRevisionEditorial,
  ComentarioRevisionEditorial,
  EntradaTransicionEditorial,
  EnlaceArticuloInternoEditorial,
  EtiquetaInternaEditorial,
  FlujoArticuloEditorial,
  NodoBloqueEditorial,
  RespuestaBandejaEditorial,
  ResumenArticuloPublico,
  ResultadoTransicionEditorial,
  ResultadoGuardadoEditorial,
  TaxonomiasEditoriales,
  TemaEditorial,
  VersionArticuloEditorial
} from '~/types/contenidoEditorial'
import type { PermisoEditorial } from '~/types/editorial'
import {
  crearSlugEditorial,
  crearSufijoSlug,
  documentoEditorialVacio,
  esquemaComentarioRevision,
  esquemaAutoguardadoArticulo,
  type esquemaCrearBorrador,
  type esquemaCrearTaxonomia,
  esquemaDatosEditorArticulo,
  obtenerAccionesFlujoEditorial,
  type esquemaFiltrosBandeja,
  type esquemaGuardarArticulo
} from '~/utils/editorial/contenido'
import { extraerTextoDocumento } from '~/utils/editorial/documento'
import type { z } from 'zod'

type FiltrosBandeja = z.infer<typeof esquemaFiltrosBandeja>
type EntradaBorrador = z.infer<typeof esquemaCrearBorrador>
type EntradaTaxonomia = z.infer<typeof esquemaCrearTaxonomia>
type EntradaGuardarArticulo = z.infer<typeof esquemaGuardarArticulo>
type EntradaAutoguardado = z.infer<typeof esquemaAutoguardadoArticulo>

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
  scheduled_at?: string | null
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

interface FilaRelacionTema {
  tag_id: string
}

interface FilaRelacionEtiqueta {
  label_id: string
}

interface FilaArticuloDetalle extends FilaArticulo {
  cover_media_id: string | null
  body_json: unknown
  seo_title: string | null
  seo_description: string | null
  social_brief: string | null
  source_url: string | null
  source_name: string | null
  source_author: string | null
  credits: string | null
  reviewed_at: string | null
  approved_at: string | null
  scheduled_at: string | null
  published_at: string | null
  published_version_id: string | null
  article_tags: FilaRelacionTema[]
  article_labels: FilaRelacionEtiqueta[]
  media_files: FilaMedioEditorial | FilaMedioEditorial[] | null
}

interface FilaAutoguardado {
  base_lock_version: number
  snapshot: unknown
  updated_at: string
}

interface FilaVersionArticulo {
  id: string
  version_number: number
  status: VersionArticuloEditorial['estado']
  version_type: VersionArticuloEditorial['tipo']
  change_note: string | null
  created_by: string | null
  created_at: string
  snapshot: Record<string, unknown>
}

interface FilaComentarioRevision {
  id: string
  comment_type: ComentarioRevisionEditorial['tipo']
  body: string
  author_id: string
  created_at: string
}

interface FilaArticuloPublicoRpc {
  id: string
  versionId: string
  slug: string
  titulo: string
  resumen: string
  tipo: ArticuloPublicoEditorial['tipo']
  documento: unknown
  seoTitulo: string
  seoDescripcion: string
  textoSocial: string
  publicadoEn: string
  autorNombre: string
  categoria: ArticuloPublicoEditorial['categoria']
  portada: null | {
    bucket: string
    path: string
    textoAlternativo: string
    pieDeFoto: string
    credito: string
    ancho: number | null
    alto: number | null
  }
  fuente: ArticuloPublicoEditorial['fuente']
}

interface FilaResumenArticuloPublicoRpc {
  id: string
  slug: string
  titulo: string
  resumen: string
  tipo: ResumenArticuloPublico['tipo']
  publicadoEn: string
  autorNombre: string
  categoria: string
  imagenBucket: string
  imagenPath: string
}

interface FilaEnlaceArticuloInternoRpc {
  articuloId: string
  slug: string
  titulo: string
  resumen: string
  categoria: string
  imagenBucket: string
  imagenPath: string
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

async function validarEnlacesInternosEditoriales(
  clienteSupabase: SupabaseClient,
  articuloId: string,
  documento: EntradaGuardarArticulo['documento']
): Promise<void> {
  const idsRelacionados = documento.content
    .filter(bloque => bloque.type === 'articuloRelacionado')
    .map(bloque => bloque.attrs.articuloId)

  if (!idsRelacionados.length) return

  if (idsRelacionados.includes(articuloId)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Una noticia no puede enlazarse a sí misma.',
      data: { codigo: 'ENLACE_EDITORIAL_CIRCULAR' }
    })
  }

  const { data, error } = await clienteSupabase
    .from('articles')
    .select('id, status, published_version_id')
    .in('id', idsRelacionados)

  if (error) {
    throw crearErrorRepositorio('No se pudieron validar las noticias relacionadas.')
  }

  const idsDisponibles = new Set((data || [])
    .filter(articulo => (
      articulo.published_version_id
      && articulo.status !== 'archived'
    ))
    .map(articulo => articulo.id))

  if (idsRelacionados.some(id => !idsDisponibles.has(id))) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Una de las noticias relacionadas ya no está publicada.',
      data: { codigo: 'ENLACE_EDITORIAL_NO_DISPONIBLE' }
    })
  }
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

async function obtenerNombreAutor(
  clienteSupabase: SupabaseClient,
  autorId: string | null
): Promise<string> {
  if (!autorId) return 'Sin autor'

  const { data } = await clienteSupabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', autorId)
    .maybeSingle()

  return (data as FilaPerfil | null)?.display_name || 'Equipo Pont3la10'
}

function mapearAutoguardado(
  fila: FilaAutoguardado | null
): AutoguardadoArticuloEditorial | null {
  if (!fila) return null

  const resultado = esquemaAutoguardadoArticulo.shape.datos.safeParse(
    fila.snapshot
  )

  if (!resultado.success) return null

  return {
    datos: resultado.data,
    versionBase: fila.base_lock_version,
    actualizadoEn: fila.updated_at
  }
}

export async function obtenerArticuloEditorial(
  clienteSupabase: SupabaseClient,
  articuloId: string,
  usuarioId: string,
  permisos: {
    editarTodos: boolean
    editarPropio: boolean
  }
): Promise<ArticuloDetalleEditorial> {
  const { data, error } = await clienteSupabase
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
      body_json,
      seo_title,
      seo_description,
      social_brief,
      source_url,
      source_name,
      source_author,
      credits,
      reviewed_at,
      approved_at,
      scheduled_at,
      published_at,
      published_version_id,
      cover_media_id,
      categories (
        id,
        slug,
        name,
        description,
        is_active,
        display_order
      ),
      article_tags (
        tag_id
      ),
      article_labels (
        label_id
      ),
      media_files (
        id,
        bucket,
        path,
        original_name,
        title,
        alt,
        is_decorative,
        caption,
        credit,
        source_url,
        mime_type,
        size_bytes,
        width,
        height,
        file_hash,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('id', articuloId)
    .maybeSingle()

  if (error) {
    throw crearErrorRepositorio('No se pudo cargar el contenido editorial.')
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'El contenido no existe.',
      data: { codigo: 'CONTENIDO_EDITORIAL_NO_ENCONTRADO' }
    })
  }

  const fila = data as unknown as FilaArticuloDetalle
  const documentoValidado = esquemaDatosEditorArticulo.shape.documento
    .safeParse(fila.body_json)
  const [
    respuestaAutoguardado,
    autorNombre
  ] = await Promise.all([
    clienteSupabase
      .from('article_autosaves')
      .select('base_lock_version, snapshot, updated_at')
      .eq('article_id', articuloId)
      .eq('user_id', usuarioId)
      .maybeSingle(),
    obtenerNombreAutor(clienteSupabase, fila.author_id)
  ])

  if (respuestaAutoguardado.error) {
    throw crearErrorRepositorio('No se pudo recuperar el autoguardado.')
  }

  const puedeEditar = permisos.editarTodos
    || (permisos.editarPropio && fila.author_id === usuarioId)
  const filaPortada = Array.isArray(fila.media_files)
    ? fila.media_files[0]
    : fila.media_files

  return {
    id: fila.id,
    titulo: fila.title,
    slug: fila.slug,
    resumen: fila.summary,
    tipo: fila.content_type,
    categoriaId: obtenerCategoriaRelacion(fila.categories)?.id || null,
    portadaId: fila.cover_media_id,
    temaIds: (fila.article_tags || []).map(relacion => relacion.tag_id),
    etiquetaIds: (fila.article_labels || []).map(relacion => relacion.label_id),
    documento: documentoValidado.success
      ? documentoValidado.data
      : { type: documentoEditorialVacio.type, content: [] },
    fuente: {
      url: fila.source_url || '',
      nombre: fila.source_name || '',
      autor: fila.source_author || '',
      creditos: fila.credits || ''
    },
    seo: {
      titulo: fila.seo_title || '',
      descripcion: fila.seo_description || '',
      textoSocial: fila.social_brief || ''
    },
    estado: fila.status,
    origen: fila.source_origin,
    versionBloqueo: fila.lock_version,
    autorId: fila.author_id,
    autorNombre,
    actualizadoEn: fila.updated_at,
    creadoEn: fila.created_at,
    revisadoEn: fila.reviewed_at,
    aprobadoEn: fila.approved_at,
    programadoPara: fila.scheduled_at,
    publicadoEn: fila.published_at,
    tieneVersionPublica: Boolean(fila.published_version_id),
    puedeEditar,
    portada: filaPortada
      ? mapearMedioEditorial(clienteSupabase, filaPortada)
      : null,
    autoguardado: mapearAutoguardado(
      respuestaAutoguardado.data as FilaAutoguardado | null
    )
  }
}

export async function guardarArticuloEditorial(
  clienteSupabase: SupabaseClient,
  articuloId: string,
  entrada: EntradaGuardarArticulo
): Promise<ResultadoGuardadoEditorial> {
  await validarEnlacesInternosEditoriales(
    clienteSupabase,
    articuloId,
    entrada.documento
  )

  const { data, error } = await clienteSupabase.rpc('save_editorial_article', {
    target_article_id: articuloId,
    expected_lock_version: entrada.versionBloqueo,
    next_slug: entrada.slug,
    next_title: entrada.titulo,
    next_summary: entrada.resumen,
    next_body: extraerTextoDocumento(entrada.documento),
    next_body_json: entrada.documento,
    next_category_id: entrada.categoriaId,
    next_cover_media_id: entrada.portadaId,
    next_content_type: entrada.tipo,
    next_source_url: entrada.fuente.url,
    next_source_name: entrada.fuente.nombre,
    next_source_author: entrada.fuente.autor,
    next_credits: entrada.fuente.creditos,
    next_seo_title: entrada.seo.titulo,
    next_seo_description: entrada.seo.descripcion,
    next_social_brief: entrada.seo.textoSocial,
    next_tag_ids: entrada.temaIds,
    next_label_ids: entrada.etiquetaIds,
    next_change_note: entrada.notaCambio
  })

  if (error) {
    const mensaje = error.message || ''

    if (mensaje.includes('cambió en otra sesión')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'El contenido cambió en otra sesión. Recarga antes de guardar.',
        data: { codigo: 'VERSION_EDITORIAL_EN_CONFLICTO' }
      })
    }

    if (mensaje.includes('No tienes permiso')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'No tienes permiso para editar este contenido.',
        data: { codigo: 'EDICION_EDITORIAL_NO_AUTORIZADA' }
      })
    }

    if (mensaje.includes('no se puede editar')) {
      throw createError({
        statusCode: 422,
        statusMessage: 'El contenido no se puede editar en su estado actual.',
        data: { codigo: 'ESTADO_EDITORIAL_NO_EDITABLE' }
      })
    }

    if (mensaje.includes('duplicate key')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'El slug ya pertenece a otro contenido.',
        data: { codigo: 'SLUG_EDITORIAL_EN_CONFLICTO' }
      })
    }

    if (mensaje.includes('no está disponible') || mensaje.includes('no están disponibles')) {
      throw createError({
        statusCode: 422,
        statusMessage: mensaje,
        data: {
          codigo: mensaje.includes('portada')
            ? 'PORTADA_EDITORIAL_INVALIDA'
            : 'TAXONOMIA_EDITORIAL_INVALIDA'
        }
      })
    }

    throw crearErrorRepositorio('No se pudo guardar el contenido editorial.')
  }

  const resultado = data as {
    id: string
    slug: string
    lockVersion: number
    updatedAt: string
  } | null

  if (!resultado) {
    throw crearErrorRepositorio('El guardado no devolvió una versión válida.')
  }

  return {
    id: resultado.id,
    slug: resultado.slug,
    versionBloqueo: resultado.lockVersion,
    actualizadoEn: resultado.updatedAt
  }
}

export async function guardarAutoguardadoEditorial(
  clienteSupabase: SupabaseClient,
  articuloId: string,
  usuarioId: string,
  entrada: EntradaAutoguardado
): Promise<{ actualizadoEn: string }> {
  const { data, error } = await clienteSupabase
    .from('article_autosaves')
    .upsert({
      article_id: articuloId,
      user_id: usuarioId,
      base_lock_version: entrada.versionBase,
      snapshot: entrada.datos,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'article_id,user_id'
    })
    .select('updated_at')
    .single()

  if (error || !data) {
    throw crearErrorRepositorio('No se pudo completar el autoguardado.')
  }

  return {
    actualizadoEn: String(data.updated_at)
  }
}

export async function eliminarAutoguardadoEditorial(
  clienteSupabase: SupabaseClient,
  articuloId: string,
  usuarioId: string
): Promise<void> {
  const { error } = await clienteSupabase
    .from('article_autosaves')
    .delete()
    .eq('article_id', articuloId)
    .eq('user_id', usuarioId)

  if (error) {
    throw crearErrorRepositorio('No se pudo descartar el autoguardado.')
  }
}

export async function listarVersionesArticuloEditorial(
  clienteSupabase: SupabaseClient,
  articuloId: string
): Promise<VersionArticuloEditorial[]> {
  const { data, error } = await clienteSupabase
    .from('article_versions')
    .select(`
      id,
      version_number,
      status,
      version_type,
      change_note,
      created_by,
      created_at,
      snapshot
    `)
    .eq('article_id', articuloId)
    .order('version_number', { ascending: false })
    .limit(30)

  if (error) {
    throw crearErrorRepositorio('No se pudo cargar el historial de versiones.')
  }

  return ((data || []) as FilaVersionArticulo[]).map(fila => ({
    id: fila.id,
    numero: fila.version_number,
    estado: fila.status,
    tipo: fila.version_type,
    nota: fila.change_note || '',
    creadoPor: fila.created_by,
    creadoEn: fila.created_at,
    titulo: String(fila.snapshot.title || 'Contenido sin título')
  }))
}

export async function listarComentariosRevisionEditorial(
  clienteSupabase: SupabaseClient,
  articuloId: string
): Promise<ComentarioRevisionEditorial[]> {
  const { data, error } = await clienteSupabase
    .from('article_review_comments')
    .select('id, comment_type, body, author_id, created_at')
    .eq('article_id', articuloId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw crearErrorRepositorio('No se pudo cargar la conversación editorial.')
  }

  const filas = (data || []) as FilaComentarioRevision[]
  const autores = [...new Set(filas.map(fila => fila.author_id))]
  const nombresAutores = new Map<string, string>()

  if (autores.length) {
    const { data: perfiles } = await clienteSupabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', autores)

    for (const perfil of (perfiles || []) as FilaPerfil[]) {
      nombresAutores.set(perfil.id, perfil.display_name)
    }
  }

  return filas.map(fila => ({
    id: fila.id,
    tipo: fila.comment_type,
    mensaje: fila.body,
    autorId: fila.author_id,
    autorNombre: nombresAutores.get(fila.author_id) || 'Equipo Pont3la10',
    creadoEn: fila.created_at
  }))
}

export async function obtenerFlujoArticuloEditorial(
  clienteSupabase: SupabaseClient,
  articulo: ArticuloDetalleEditorial,
  permisos: readonly PermisoEditorial[]
): Promise<FlujoArticuloEditorial> {
  return {
    estado: articulo.estado,
    acciones: obtenerAccionesFlujoEditorial(articulo.estado, permisos),
    comentarios: await listarComentariosRevisionEditorial(clienteSupabase, articulo.id),
    programadoPara: articulo.programadoPara,
    publicadoEn: articulo.publicadoEn,
    tieneVersionPublica: articulo.tieneVersionPublica
  }
}

export async function transicionarArticuloEditorial(
  clienteSupabase: SupabaseClient,
  articuloId: string,
  entrada: EntradaTransicionEditorial
): Promise<ResultadoTransicionEditorial> {
  const { data, error } = await clienteSupabase.rpc('transition_editorial_article', {
    target_article_id: articuloId,
    expected_lock_version: entrada.versionBloqueo,
    target_status: entrada.estadoObjetivo,
    transition_note: entrada.nota,
    target_scheduled_at: entrada.programadoPara
  })

  if (error) {
    const mensaje = error.message || ''

    if (mensaje.includes('cambió en otra sesión')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'El contenido cambió en otra sesión. Recarga antes de continuar.',
        data: { codigo: 'VERSION_EDITORIAL_EN_CONFLICTO' }
      })
    }

    if (
      mensaje.includes('permiso')
      || mensaje.includes('MFA')
      || mensaje.includes('sesión')
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: mensaje,
        data: { codigo: 'TRANSICION_EDITORIAL_NO_AUTORIZADA' }
      })
    }

    if (
      mensaje.includes('necesita')
      || mensaje.includes('Selecciona')
      || mensaje.includes('Explica')
      || mensaje.includes('programación')
      || mensaje.includes('transición editorial')
    ) {
      throw createError({
        statusCode: 422,
        statusMessage: mensaje,
        data: { codigo: 'TRANSICION_EDITORIAL_INVALIDA' }
      })
    }

    throw crearErrorRepositorio('No se pudo completar la transición editorial.')
  }

  return data as ResultadoTransicionEditorial
}

export async function crearComentarioRevisionEditorial(
  clienteSupabase: SupabaseClient,
  articuloId: string,
  autorId: string,
  mensaje: string
): Promise<ComentarioRevisionEditorial> {
  const entrada = esquemaComentarioRevision.parse({ mensaje })
  const { data, error } = await clienteSupabase
    .from('article_review_comments')
    .insert({
      article_id: articuloId,
      author_id: autorId,
      comment_type: 'comment',
      body: entrada.mensaje
    })
    .select('id, comment_type, body, author_id, created_at')
    .single()

  if (error || !data) {
    throw crearErrorRepositorio('No se pudo agregar el comentario editorial.')
  }

  return {
    id: String(data.id),
    tipo: data.comment_type as ComentarioRevisionEditorial['tipo'],
    mensaje: String(data.body),
    autorId: String(data.author_id),
    autorNombre: await obtenerNombreAutor(clienteSupabase, String(data.author_id)),
    creadoEn: String(data.created_at)
  }
}

export async function obtenerColaRevisionEditorial(
  clienteSupabase: SupabaseClient
): Promise<ColaRevisionEditorial> {
  const { data, error } = await clienteSupabase
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
      scheduled_at,
      categories (
        id,
        slug,
        name,
        description,
        is_active,
        display_order
      )
    `)
    .in('status', ['review', 'approved', 'scheduled'])
    .order('updated_at', { ascending: false })
    .limit(120)

  if (error) {
    throw crearErrorRepositorio('No se pudo cargar la bandeja de revisión.')
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

  const contenidos = filas.map(fila => ({
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
    versionBloqueo: fila.lock_version,
    programadoPara: fila.scheduled_at || null
  }))

  return {
    enRevision: contenidos.filter(item => item.estado === 'review'),
    aprobados: contenidos.filter(item => item.estado === 'approved'),
    programados: contenidos.filter(item => item.estado === 'scheduled')
  }
}

function obtenerUrlPublicaMedio(
  clienteSupabase: SupabaseClient,
  bucket: string,
  path: string
): string {
  return clienteSupabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function resolverEnlacesInternosPublicos(
  clienteSupabase: SupabaseClient,
  documento: ArticuloPublicoEditorial['documento']
): Promise<ArticuloPublicoEditorial['documento']> {
  const ids = documento.content
    .filter(bloque => bloque.type === 'articuloRelacionado')
    .map(bloque => bloque.attrs.articuloId)

  if (!ids.length) return documento

  const { data, error } = await clienteSupabase.rpc(
    'resolve_public_editorial_links',
    { requested_ids: ids }
  )

  if (error) {
    throw crearErrorRepositorio('No se pudieron resolver los enlaces internos.')
  }

  const enlaces = new Map<string, EnlaceArticuloInternoEditorial>(
    ((data || []) as unknown as FilaEnlaceArticuloInternoRpc[]).map(fila => [
      fila.articuloId,
      {
        articuloId: fila.articuloId,
        slug: fila.slug,
        titulo: fila.titulo,
        resumen: fila.resumen,
        categoria: fila.categoria,
        imagen: fila.imagenBucket && fila.imagenPath
          ? obtenerUrlPublicaMedio(clienteSupabase, fila.imagenBucket, fila.imagenPath)
          : ''
      }
    ])
  )

  return {
    ...documento,
    content: documento.content.flatMap<NodoBloqueEditorial>((bloque) => {
      if (bloque.type !== 'articuloRelacionado') return [bloque]
      const enlaceVigente = enlaces.get(bloque.attrs.articuloId)
      return enlaceVigente
        ? [{ type: 'articuloRelacionado' as const, attrs: enlaceVigente }]
        : []
    })
  }
}

export async function obtenerArticuloPublicoEditorial(
  clienteSupabase: SupabaseClient,
  slug: string
): Promise<ArticuloPublicoEditorial | null> {
  const { data, error } = await clienteSupabase.rpc(
    'get_public_editorial_article',
    { requested_slug: slug }
  )

  if (error) {
    throw crearErrorRepositorio('No se pudo cargar la publicación.')
  }

  if (!data) return null

  const fila = data as unknown as FilaArticuloPublicoRpc
  const documento = esquemaDatosEditorArticulo.shape.documento.safeParse(fila.documento)

  if (!documento.success) {
    throw crearErrorRepositorio('La versión pública no tiene un documento válido.')
  }

  const documentoPublico = await resolverEnlacesInternosPublicos(
    clienteSupabase,
    documento.data
  )

  return {
    id: fila.id,
    versionId: fila.versionId,
    slug: fila.slug,
    titulo: fila.titulo,
    resumen: fila.resumen,
    tipo: fila.tipo,
    documento: documentoPublico,
    seoTitulo: fila.seoTitulo,
    seoDescripcion: fila.seoDescripcion,
    textoSocial: fila.textoSocial,
    publicadoEn: fila.publicadoEn,
    autorNombre: fila.autorNombre,
    categoria: fila.categoria,
    portada: fila.portada
      ? {
          url: obtenerUrlPublicaMedio(
            clienteSupabase,
            fila.portada.bucket,
            fila.portada.path
          ),
          textoAlternativo: fila.portada.textoAlternativo,
          pieDeFoto: fila.portada.pieDeFoto,
          credito: fila.portada.credito,
          ancho: fila.portada.ancho,
          alto: fila.portada.alto
        }
      : null,
    fuente: fila.fuente
  }
}

export async function listarArticulosPublicosEditoriales(
  clienteSupabase: SupabaseClient,
  limite = 20,
  desplazamiento = 0
): Promise<ResumenArticuloPublico[]> {
  const { data, error } = await clienteSupabase.rpc(
    'list_public_editorial_articles',
    {
      result_limit: limite,
      result_offset: desplazamiento
    }
  )

  if (error) {
    throw crearErrorRepositorio('No se pudieron cargar las publicaciones.')
  }

  return ((data || []) as unknown as FilaResumenArticuloPublicoRpc[])
    .map(fila => ({
      id: fila.id,
      slug: fila.slug,
      titulo: fila.titulo,
      resumen: fila.resumen,
      tipo: fila.tipo,
      publicadoEn: fila.publicadoEn,
      autorNombre: fila.autorNombre,
      categoria: fila.categoria,
      imagen: fila.imagenBucket && fila.imagenPath
        ? obtenerUrlPublicaMedio(clienteSupabase, fila.imagenBucket, fila.imagenPath)
        : ''
    }))
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
