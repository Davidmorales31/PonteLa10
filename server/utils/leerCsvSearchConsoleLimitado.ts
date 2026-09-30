import { createError, getRequestHeader } from 'h3'
import type { H3Event } from 'h3'
import { MAX_BYTES_CSV_SEARCH_CONSOLE } from '~/utils/searchConsoleCsv'

export async function leerCsvSearchConsoleLimitado(evento: H3Event): Promise<string> {
  const tipo = getRequestHeader(evento, 'content-type') || ''
  if (!/^(text\/csv|text\/plain|application\/vnd\.ms-excel)(?:\s*;|$)/i.test(tipo)) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Envía el export como CSV UTF-8.',
      data: { codigo: 'CSV_TIPO_NO_VALIDO' }
    })
  }

  const longitudDeclarada = getRequestHeader(evento, 'content-length')
  if (longitudDeclarada !== undefined) {
    const bytesDeclarados = Number(longitudDeclarada)
    if (Number.isFinite(bytesDeclarados) && bytesDeclarados > MAX_BYTES_CSV_SEARCH_CONSOLE) {
      throw createError({
        statusCode: 413,
        statusMessage: 'El archivo supera el tamaño máximo de 5 MB.',
        data: { codigo: 'CSV_TAMANO_EXCEDIDO' }
      })
    }
  }

  const partes: Buffer[] = []
  let bytesTotales = 0
  for await (const fragmento of evento.node.req) {
    const parte = Buffer.isBuffer(fragmento) ? fragmento : Buffer.from(fragmento)
    bytesTotales += parte.byteLength
    if (bytesTotales > MAX_BYTES_CSV_SEARCH_CONSOLE) {
      throw createError({
        statusCode: 413,
        statusMessage: 'El archivo supera el tamaño máximo de 5 MB.',
        data: { codigo: 'CSV_TAMANO_EXCEDIDO' }
      })
    }
    partes.push(parte)
  }

  if (!bytesTotales) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Selecciona un archivo CSV con filas de métricas.',
      data: { codigo: 'CSV_VACIO' }
    })
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(partes, bytesTotales))
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'El archivo debe estar codificado en UTF-8.',
      data: { codigo: 'CSV_CODIFICACION_NO_VALIDA' }
    })
  }
}
