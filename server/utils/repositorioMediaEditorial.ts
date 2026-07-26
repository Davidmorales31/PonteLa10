import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MedioEditorial,
  MetadatosMedioEditorial,
  RespuestaBibliotecaMedios
} from '~/types/mediaEditorial'
import type { ImagenEditorialProcesada } from '~/server/utils/procesadorImagenEditorial'
import { limpiarNombreArchivoEditorial } from '~/utils/media/editorial'

const bucketMediosEditoriales = 'editorial-media'

export interface FilaMedioEditorial {
  id: string
  bucket: string
  path: string
  original_name: string
  title: string
  alt: string | null
  is_decorative: boolean
  caption: string | null
  credit: string | null
  source_url: string | null
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  file_hash: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface ConsultaBibliotecaMedios {
  pagina: number
  limite: number
  busqueda: string
}

interface EntradaCrearMedio {
  nombreOriginal: string
  metadatos: MetadatosMedioEditorial
  imagen: ImagenEditorialProcesada
  usuarioId: string
}

function crearErrorMedia(mensaje: string) {
  return createError({
    statusCode: 502,
    statusMessage: mensaje,
    data: { codigo: 'REPOSITORIO_MEDIA_NO_DISPONIBLE' }
  })
}

function construirUrlPublica(
  clienteSupabase: SupabaseClient,
  bucket: string,
  ruta: string
): string {
  return clienteSupabase.storage
    .from(bucket)
    .getPublicUrl(ruta)
    .data.publicUrl
}

export function mapearMedioEditorial(
  clienteSupabase: SupabaseClient,
  fila: FilaMedioEditorial
): MedioEditorial {
  return {
    id: fila.id,
    bucket: fila.bucket,
    ruta: fila.path,
    urlPublica: construirUrlPublica(clienteSupabase, fila.bucket, fila.path),
    nombreOriginal: fila.original_name,
    titulo: fila.title,
    textoAlternativo: fila.alt || '',
    esDecorativa: fila.is_decorative,
    pieDeFoto: fila.caption || '',
    credito: fila.credit || '',
    urlFuente: fila.source_url || '',
    tipoMime: fila.mime_type || 'application/octet-stream',
    tamanoBytes: Number(fila.size_bytes || 0),
    ancho: Number(fila.width || 0),
    alto: Number(fila.height || 0),
    creadoPor: fila.created_by,
    creadoEn: fila.created_at,
    actualizadoEn: fila.updated_at
  }
}

function normalizarBusqueda(busqueda: string): string {
  return busqueda
    .replace(/[^\p{L}\p{N} ._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const columnasMedio = `
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
`

export async function listarMediosEditoriales(
  clienteSupabase: SupabaseClient,
  filtros: ConsultaBibliotecaMedios
): Promise<RespuestaBibliotecaMedios> {
  const desde = (filtros.pagina - 1) * filtros.limite
  const hasta = desde + filtros.limite - 1
  const busqueda = normalizarBusqueda(filtros.busqueda)
  let consulta = clienteSupabase
    .from('media_files')
    .select(columnasMedio, { count: 'exact' })
    .eq('bucket', bucketMediosEditoriales)
    .order('created_at', { ascending: false })
    .range(desde, hasta)

  if (busqueda) {
    consulta = consulta.or(
      `title.ilike.%${busqueda}%,original_name.ilike.%${busqueda}%,alt.ilike.%${busqueda}%`
    )
  }

  const { data, error, count } = await consulta

  if (error) {
    throw crearErrorMedia('No se pudo cargar la biblioteca multimedia.')
  }

  const total = count || 0

  return {
    medios: ((data || []) as FilaMedioEditorial[])
      .map(fila => mapearMedioEditorial(clienteSupabase, fila)),
    paginacion: {
      pagina: filtros.pagina,
      limite: filtros.limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / filtros.limite))
    }
  }
}

export async function obtenerMedioEditorial(
  clienteSupabase: SupabaseClient,
  medioId: string
): Promise<MedioEditorial> {
  const { data, error } = await clienteSupabase
    .from('media_files')
    .select(columnasMedio)
    .eq('id', medioId)
    .maybeSingle()

  if (error) {
    throw crearErrorMedia('No se pudo cargar la imagen.')
  }

  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'La imagen no existe.',
      data: { codigo: 'MEDIO_EDITORIAL_NO_ENCONTRADO' }
    })
  }

  return mapearMedioEditorial(clienteSupabase, data as FilaMedioEditorial)
}

export async function crearMedioEditorial(
  clienteSupabase: SupabaseClient,
  entrada: EntradaCrearMedio
): Promise<MedioEditorial> {
  const { data: medioExistente } = await clienteSupabase
    .from('media_files')
    .select(columnasMedio)
    .eq('file_hash', entrada.imagen.hash)
    .maybeSingle()

  if (medioExistente) {
    return mapearMedioEditorial(
      clienteSupabase,
      medioExistente as FilaMedioEditorial
    )
  }

  const fecha = new Date()
  const ruta = [
    entrada.usuarioId,
    String(fecha.getUTCFullYear()),
    String(fecha.getUTCMonth() + 1).padStart(2, '0'),
    `${randomUUID()}.webp`
  ].join('/')

  const { error: errorSubida } = await clienteSupabase.storage
    .from(bucketMediosEditoriales)
    .upload(ruta, entrada.imagen.contenido, {
      cacheControl: '31536000',
      contentType: entrada.imagen.tipoMime,
      upsert: false
    })

  if (errorSubida) {
    throw crearErrorMedia('No se pudo almacenar la imagen optimizada.')
  }

  const { data, error } = await clienteSupabase
    .from('media_files')
    .insert({
      bucket: bucketMediosEditoriales,
      path: ruta,
      original_name: limpiarNombreArchivoEditorial(entrada.nombreOriginal),
      title: entrada.metadatos.titulo,
      alt: entrada.metadatos.esDecorativa
        ? null
        : entrada.metadatos.textoAlternativo,
      is_decorative: entrada.metadatos.esDecorativa,
      caption: entrada.metadatos.pieDeFoto || null,
      credit: entrada.metadatos.credito || null,
      source_url: entrada.metadatos.urlFuente || null,
      mime_type: entrada.imagen.tipoMime,
      size_bytes: entrada.imagen.tamanoBytes,
      width: entrada.imagen.ancho,
      height: entrada.imagen.alto,
      file_hash: entrada.imagen.hash,
      created_by: entrada.usuarioId
    })
    .select(columnasMedio)
    .single()

  if (error || !data) {
    await clienteSupabase.storage
      .from(bucketMediosEditoriales)
      .remove([ruta])

    if (error?.code === '23505') {
      const { data: duplicado } = await clienteSupabase
        .from('media_files')
        .select(columnasMedio)
        .eq('file_hash', entrada.imagen.hash)
        .single()

      if (duplicado) {
        return mapearMedioEditorial(
          clienteSupabase,
          duplicado as FilaMedioEditorial
        )
      }
    }

    throw crearErrorMedia('No se pudo registrar la imagen en la biblioteca.')
  }

  return mapearMedioEditorial(clienteSupabase, data as FilaMedioEditorial)
}

export async function actualizarMedioEditorial(
  clienteSupabase: SupabaseClient,
  medioId: string,
  metadatos: MetadatosMedioEditorial
): Promise<MedioEditorial> {
  const { data, error } = await clienteSupabase
    .from('media_files')
    .update({
      title: metadatos.titulo,
      alt: metadatos.esDecorativa ? null : metadatos.textoAlternativo,
      is_decorative: metadatos.esDecorativa,
      caption: metadatos.pieDeFoto || null,
      credit: metadatos.credito || null,
      source_url: metadatos.urlFuente || null
    })
    .eq('id', medioId)
    .select(columnasMedio)
    .single()

  if (error || !data) {
    throw crearErrorMedia('No se pudieron actualizar los metadatos.')
  }

  return mapearMedioEditorial(clienteSupabase, data as FilaMedioEditorial)
}

export async function eliminarMedioEditorial(
  clienteSupabase: SupabaseClient,
  medioId: string
): Promise<void> {
  const medio = await obtenerMedioEditorial(clienteSupabase, medioId)
  const { error } = await clienteSupabase
    .from('media_files')
    .delete()
    .eq('id', medioId)

  if (error) {
    const estaReferenciada = error.message
      .includes('usada como portada')

    throw createError({
      statusCode: estaReferenciada ? 409 : 502,
      statusMessage: estaReferenciada
        ? 'Quita la imagen de las portadas antes de eliminarla.'
        : 'No se pudo eliminar la imagen.',
      data: {
        codigo: estaReferenciada
          ? 'MEDIO_EDITORIAL_EN_USO'
          : 'REPOSITORIO_MEDIA_NO_DISPONIBLE'
      }
    })
  }

  const { error: errorStorage } = await clienteSupabase.storage
    .from(medio.bucket)
    .remove([medio.ruta])

  if (errorStorage) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Se eliminó el registro, pero el archivo requiere limpieza.',
      data: { codigo: 'ARCHIVO_MEDIA_HUERFANO' }
    })
  }
}
