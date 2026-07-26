import type { MedioEditorial } from '~/types/mediaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { procesarImagenEditorial } from '~/server/utils/procesadorImagenEditorial'
import { crearMedioEditorial } from '~/server/utils/repositorioMediaEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaMetadatosMedioEditorial,
  limiteBytesImagenEditorial
} from '~/utils/media/editorial'

export default defineEventHandler(async (
  evento
): Promise<MedioEditorial> => {
  const contexto = await exigirPermisoEditorial(evento, 'media.subir')
  const tamanoDeclarado = Number(getHeader(evento, 'content-length') || 0)

  if (tamanoDeclarado > limiteBytesImagenEditorial + 100_000) {
    throw createError({
      statusCode: 413,
      statusMessage: 'La imagen supera el límite de 12 MB.',
      data: { codigo: 'IMAGEN_EDITORIAL_DEMASIADO_GRANDE' }
    })
  }

  const partes = await readMultipartFormData(evento)
  const archivo = partes?.find(parte => parte.name === 'archivo')
  const campoMetadatos = partes?.find(parte => parte.name === 'metadatos')

  if (!archivo?.data || !archivo.filename || !archivo.type) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Selecciona una imagen válida.',
      data: { codigo: 'ARCHIVO_EDITORIAL_REQUERIDO' }
    })
  }

  if (archivo.data.byteLength > limiteBytesImagenEditorial) {
    throw createError({
      statusCode: 413,
      statusMessage: 'La imagen supera el límite de 12 MB.',
      data: { codigo: 'IMAGEN_EDITORIAL_DEMASIADO_GRANDE' }
    })
  }

  let entradaMetadatos: unknown

  try {
    entradaMetadatos = JSON.parse(
      campoMetadatos?.data.toString('utf8') || '{}'
    )
  } catch {
    entradaMetadatos = null
  }

  const metadatos = validarEntradaEditorial(
    esquemaMetadatosMedioEditorial,
    entradaMetadatos
  )
  const imagen = await procesarImagenEditorial(
    Buffer.from(archivo.data),
    archivo.type
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return crearMedioEditorial(clienteSupabase, {
    nombreOriginal: archivo.filename,
    metadatos,
    imagen,
    usuarioId: contexto.usuario.id
  })
})
