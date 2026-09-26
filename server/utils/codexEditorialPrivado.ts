import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

const ventanaFirmaSegundos = 300

export function firmaCodexEsValida(
  timestamp: string,
  metodo: string,
  ruta: string,
  requestId: string,
  firma: string,
  cuerpo: Buffer,
  secreto: string,
  ahoraSegundos = Math.floor(Date.now() / 1000)
): boolean {
  if (!secreto || !/^\d{10}$/.test(timestamp)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
    || !/^[a-f0-9]{64}$/i.test(firma)) {
    return false
  }

  const segundos = Number(timestamp)
  if (!Number.isSafeInteger(segundos)
    || Math.abs(ahoraSegundos - segundos) > ventanaFirmaSegundos) {
    return false
  }

  const esperada = createHmac('sha256', secreto)
    .update(`${timestamp}.${metodo.toUpperCase()}.${ruta}.${requestId}.`)
    .update(cuerpo)
    .digest()
  const recibida = Buffer.from(firma, 'hex')
  return recibida.length === esperada.length && timingSafeEqual(recibida, esperada)
}

function responderNoAutorizado(): never {
  throw createError({
    statusCode: 401,
    statusMessage: 'La solicitud automatizada no está autorizada.',
    data: { codigo: 'AUTOMATIZACION_NO_AUTORIZADA' }
  })
}

export async function verificarFirmaCodex(
  evento: H3Event,
  cuerpo: Buffer,
  secreto: string
): Promise<void> {
  const requestId = getHeader(evento, 'x-pont3la10-request-id') || ''
  if (!firmaCodexEsValida(
    getHeader(evento, 'x-pont3la10-timestamp') || '',
    evento.method || '',
    getRequestURL(evento).pathname,
    requestId,
    getHeader(evento, 'x-pont3la10-signature') || '',
    cuerpo,
    secreto
  )) {
    responderNoAutorizado()
  }

  const cliente = obtenerClienteCodexPrivado(evento)
  const { error } = await cliente.rpc('claim_codex_request_nonce', {
    p_request_id: requestId,
    p_expires_at: new Date(Date.now() + ventanaFirmaSegundos * 1000).toISOString()
  })
  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : 503,
      statusMessage: error.code === '23505'
        ? 'Esta solicitud ya fue procesada.'
        : 'No se pudo validar la vigencia de la solicitud.',
      data: { codigo: error.code === '23505' ? 'SOLICITUD_REPETIDA' : 'NONCE_CODEX_NO_DISPONIBLE' }
    })
  }
}

export function obtenerClienteCodexPrivado(evento: H3Event): SupabaseClient {
  const config = useRuntimeConfig(evento)
  const url = String(config.public.supabaseUrl || '')
  const clavePrivilegiada = String(config.supabaseServiceRoleKey || '')

  if (!url || !clavePrivilegiada) {
    throw createError({
      statusCode: 503,
      statusMessage: 'La integración editorial privada no está configurada.',
      data: { codigo: 'AUTOMATIZACION_NO_CONFIGURADA' }
    })
  }

  return createClient(url, clavePrivilegiada, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function leerCuerpoFirmado(
  evento: H3Event,
  limiteBytes: number
): Promise<Buffer> {
  const largoDeclarado = Number(getHeader(evento, 'content-length') || 0)
  if (largoDeclarado > limiteBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: 'El archivo supera el tamaño permitido.',
      data: { codigo: 'CARGA_AUTOMATIZADA_DEMASIADO_GRANDE' }
    })
  }

  const solicitud = evento.node?.req
  if (solicitud) {
    const partes: Buffer[] = []
    let bytesAcumulados = 0
    for await (const parte of solicitud) {
      const buffer = Buffer.isBuffer(parte) ? parte : Buffer.from(parte)
      bytesAcumulados += buffer.byteLength
      if (bytesAcumulados > limiteBytes) {
        solicitud.destroy()
        throw createError({
          statusCode: 413,
          statusMessage: 'El archivo supera el tamaño permitido.',
          data: { codigo: 'CARGA_AUTOMATIZADA_DEMASIADO_GRANDE' }
        })
      }
      partes.push(buffer)
    }
    return Buffer.concat(partes, bytesAcumulados)
  }

  // No hacer fallback a readRawBody: ese helper acumula todo antes de poder
  // aplicar el límite. En adaptadores sin IncomingMessage fallamos cerrados.
  throw createError({
    statusCode: 503,
    statusMessage: 'La API privada requiere lectura acotada del cuerpo.',
    data: { codigo: 'LECTURA_SEGURA_NO_DISPONIBLE' }
  })
}

export function decodificarJsonFirmado<T>(cuerpo: Buffer): T {
  try {
    return JSON.parse(cuerpo.toString('utf8')) as T
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'El cuerpo de la solicitud no es JSON válido.',
      data: { codigo: 'JSON_AUTOMATIZADO_INVALIDO' }
    })
  }
}
