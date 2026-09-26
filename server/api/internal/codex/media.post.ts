import { esquemaPortadaCodex } from '~/server/utils/esquemasCodexEditorial'
import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { procesarImagenEditorial } from '~/server/utils/procesadorImagenEditorial'
import { verificarAtribucionFotoCommons } from '~/server/utils/validarAtribucionFotoCommons'

// Vercel Functions admiten peticiones mucho menores que el límite bruto de Nuxt;
// dejamos margen para cabeceras y JSON/base64 en el cuerpo HTTPS.
const maximoBytesEntrada = 3_500_000

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const secreto = String(config.codexEditorialApiSecret || '')
  const cuerpo = await leerCuerpoFirmado(evento, maximoBytesEntrada)
  await verificarFirmaCodex(evento, cuerpo, secreto)

  const resultado = esquemaPortadaCodex.safeParse(
    decodificarJsonFirmado<unknown>(cuerpo)
  )

  if (!resultado.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La portada no cumple el contrato de carga.',
      data: { codigo: 'PORTADA_CODEX_INVALIDA' }
    })
  }

  const entrada = resultado.data
  const creditoEsperado = await verificarAtribucionFotoCommons(entrada)
  if (entrada.credito !== creditoEsperado) {
    throw createError({
      statusCode: 422,
      statusMessage: 'El crédito debe identificar autor, licencia y Wikimedia Commons.',
      data: { codigo: 'ATRIBUCION_FOTO_CODEX_INVALIDA' }
    })
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entrada.imagenBase64)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La portada no tiene una codificación válida.',
      data: { codigo: 'PORTADA_CODEX_INVALIDA' }
    })
  }

  const bytesImagen = Buffer.from(entrada.imagenBase64, 'base64')
  if (!bytesImagen.length || bytesImagen.byteLength > maximoBytesEntrada) {
    throw createError({
      statusCode: 413,
      statusMessage: 'La imagen supera el tamaño permitido.',
      data: { codigo: 'PORTADA_CODEX_DEMASIADO_GRANDE' }
    })
  }

  const imagen = await procesarImagenEditorial(bytesImagen, entrada.tipoMime)
  const cliente = obtenerClienteCodexPrivado(evento)

  const { data: existente } = await cliente
    .from('media_files')
    .select('id, width, height, size_bytes, credit, source_url')
    .eq('file_hash', imagen.hash)
    .maybeSingle()

  if (existente) {
    if (existente.credit !== entrada.credito || existente.source_url !== entrada.urlFuente) {
      throw createError({
        statusCode: 409,
        statusMessage: 'La imagen ya está registrada con otra atribución; usa el archivo original de la fuente.',
        data: { codigo: 'ATRIBUCION_FOTO_CODEX_EN_CONFLICTO' }
      })
    }
    return {
      mediaId: String(existente.id),
      hash: imagen.hash,
      dimensiones: { ancho: existente.width, alto: existente.height },
      bytes: existente.size_bytes,
      yaExistia: true
    }
  }

  const fecha = new Date()
  const ruta = `codex/${fecha.getUTCFullYear()}/${String(fecha.getUTCMonth() + 1).padStart(2, '0')}/${imagen.hash}.webp`
  const { error: errorSubida } = await cliente.storage
    .from('editorial-media')
    .upload(ruta, imagen.contenido, {
      cacheControl: '31536000',
      contentType: 'image/webp',
      upsert: false
    })

  if (errorSubida && !/already exists|duplicate/i.test(errorSubida.message)) {
    throw createError({
      statusCode: 502,
      statusMessage: 'No se pudo almacenar la portada optimizada.',
      data: { codigo: 'PORTADA_CODEX_NO_DISPONIBLE' }
    })
  }

  const { data: medio, error: errorRegistro } = await cliente
    .from('media_files')
    .insert({
      bucket: 'editorial-media',
      path: ruta,
      original_name: entrada.nombreOriginal,
      title: entrada.titulo,
      alt: entrada.alt,
      is_decorative: false,
      caption: entrada.pie,
      credit: entrada.credito,
      source_url: entrada.urlFuente,
      mime_type: imagen.tipoMime,
      size_bytes: imagen.tamanoBytes,
      width: imagen.ancho,
      height: imagen.alto,
      file_hash: imagen.hash
    })
    .select('id')
    .single()

  if (errorRegistro) {
    if (errorRegistro.code === '23505') {
      const { data: duplicado } = await cliente
        .from('media_files')
        .select('id, width, height, size_bytes, credit, source_url')
        .eq('file_hash', imagen.hash)
        .maybeSingle()

      if (duplicado) {
        if (duplicado.credit !== entrada.credito || duplicado.source_url !== entrada.urlFuente) {
          throw createError({
            statusCode: 409,
            statusMessage: 'La imagen ya está registrada con otra atribución; usa el archivo original de la fuente.',
            data: { codigo: 'ATRIBUCION_FOTO_CODEX_EN_CONFLICTO' }
          })
        }
        return {
          mediaId: String(duplicado.id),
          hash: imagen.hash,
          dimensiones: { ancho: duplicado.width, alto: duplicado.height },
          bytes: duplicado.size_bytes,
          yaExistia: true
        }
      }
    }

    throw createError({
      statusCode: 502,
      statusMessage: 'La portada se subió, pero no se pudo registrar en la biblioteca.',
      data: { codigo: 'PORTADA_CODEX_REGISTRO_FALLIDO' }
    })
  }

  return {
    mediaId: String(medio.id),
    hash: imagen.hash,
    dimensiones: { ancho: imagen.ancho, alto: imagen.alto },
    bytes: imagen.tamanoBytes,
    yaExistia: false
  }
})
