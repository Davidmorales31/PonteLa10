import { esquemaPortadaIACodex, CREDITO_PORTADA_IA_CODEX, PIE_PORTADA_IA_CODEX } from '~/server/utils/esquemasCodexEditorial'
import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { procesarImagenEditorial } from '~/server/utils/procesadorImagenEditorial'
import {
  revertirImagenEditorialOptimizada,
  subirImagenEditorialOptimizada
} from '~/server/utils/almacenarImagenEditorial'

const maximoBytesEntrada = 3_500_000

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const secreto = String(config.codexEditorialApiSecret || '')
  const cuerpo = await leerCuerpoFirmado(evento, maximoBytesEntrada)
  await verificarFirmaCodex(evento, cuerpo, secreto)

  const resultado = esquemaPortadaIACodex.safeParse(
    decodificarJsonFirmado<unknown>(cuerpo)
  )
  if (!resultado.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La ilustración generada no cumple el contrato de carga.',
      data: { codigo: 'PORTADA_IA_CODEX_INVALIDA' }
    })
  }

  const entrada = resultado.data
  const bytesImagen = Buffer.from(entrada.imagenBase64, 'base64')
  if (!bytesImagen.length || bytesImagen.byteLength > 2_400_000) {
    throw createError({
      statusCode: 413,
      statusMessage: 'La ilustración supera el tamaño permitido.',
      data: { codigo: 'PORTADA_IA_CODEX_DEMASIADO_GRANDE' }
    })
  }

  const imagen = await procesarImagenEditorial(bytesImagen, entrada.tipoMime)
  const cliente = obtenerClienteCodexPrivado(evento)
  const { data: existente } = await cliente
    .from('media_files')
    .select('id, bucket, width, height, size_bytes, credit, source_url, caption')
    .eq('file_hash', imagen.hash)
    .maybeSingle()

  if (existente) {
    if (existente.bucket !== 'editorial-media'
      || existente.credit !== CREDITO_PORTADA_IA_CODEX
      || existente.source_url !== null
      || existente.caption !== PIE_PORTADA_IA_CODEX) {
      throw createError({
        statusCode: 409,
        statusMessage: 'La imagen ya está registrada con otra atribución.',
        data: { codigo: 'PORTADA_IA_CODEX_EN_CONFLICTO' }
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
  const ruta = `codex-ai/${fecha.getUTCFullYear()}/${String(fecha.getUTCMonth() + 1).padStart(2, '0')}/${imagen.hash}.webp`
  let almacenamiento: Awaited<ReturnType<typeof subirImagenEditorialOptimizada>>
  try {
    almacenamiento = await subirImagenEditorialOptimizada(
      cliente,
      'editorial-media',
      ruta,
      imagen
    )
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'No se pudo almacenar la ilustración generada.',
      data: { codigo: 'PORTADA_IA_CODEX_NO_DISPONIBLE' }
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
      caption: PIE_PORTADA_IA_CODEX,
      credit: CREDITO_PORTADA_IA_CODEX,
      source_url: null,
      mime_type: imagen.tipoMime,
      size_bytes: imagen.tamanoBytes,
      width: imagen.ancho,
      height: imagen.alto,
      file_hash: imagen.hash
    })
    .select('id')
    .single()

  if (errorRegistro || !medio) {
    let duplicado: {
      id: string
      bucket: string
      path: string
      width: number | null
      height: number | null
      size_bytes: number | null
      credit: string | null
      source_url: string | null
      caption: string | null
    } | null = null

    if (errorRegistro?.code === '23505') {
      const { data } = await cliente
        .from('media_files')
        .select('id, bucket, path, width, height, size_bytes, credit, source_url, caption')
        .eq('file_hash', imagen.hash)
        .maybeSingle()
      duplicado = data

      if (duplicado?.bucket === 'editorial-media' && duplicado.path === ruta) {
        if (duplicado.credit !== CREDITO_PORTADA_IA_CODEX
          || duplicado.source_url !== null
          || duplicado.caption !== PIE_PORTADA_IA_CODEX) {
          throw createError({
            statusCode: 409,
            statusMessage: 'La imagen ya está registrada con otra atribución.',
            data: { codigo: 'PORTADA_IA_CODEX_EN_CONFLICTO' }
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

    await revertirImagenEditorialOptimizada(
      cliente,
      'editorial-media',
      ruta,
      almacenamiento
    )

    if (duplicado) {
      if (duplicado.bucket !== 'editorial-media'
        || duplicado.credit !== CREDITO_PORTADA_IA_CODEX
        || duplicado.source_url !== null
        || duplicado.caption !== PIE_PORTADA_IA_CODEX) {
        throw createError({
          statusCode: 409,
          statusMessage: 'La imagen ya está registrada con otra atribución.',
          data: { codigo: 'PORTADA_IA_CODEX_EN_CONFLICTO' }
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

    throw createError({
      statusCode: 502,
      statusMessage: 'La ilustración se subió, pero no se pudo registrar en la biblioteca.',
      data: { codigo: 'PORTADA_IA_CODEX_REGISTRO_FALLIDO' }
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
