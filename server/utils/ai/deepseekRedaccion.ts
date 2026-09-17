import { createHash } from 'node:crypto'
import { esquemaPropuestaBorradorIa, versionContratoRedaccionIa } from '~/utils/editorial/redaccionIa'
import type { EntradaRedaccionIa, ProveedorRedaccionIa, ResultadoRedaccionIa } from './contratosRedaccion'
import { instruccionesRedaccionV1 } from './instrucciones/redaccion-v1'

interface RespuestaDeepSeek { choices?: Array<{ finish_reason?: string, message?: { content?: string | null } }>, usage?: { prompt_tokens?: number, completion_tokens?: number, reasoning_tokens?: number }, model?: string }

function extraerJsonProveedor(contenido: string): unknown {
  const limpio = contenido
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const inicio = limpio.indexOf('{')
  const fin = limpio.lastIndexOf('}')
  if (inicio < 0 || fin <= inicio) throw new Error('JSON_NO_ENCONTRADO')
  return JSON.parse(limpio.slice(inicio, fin + 1))
}

export function crearProveedorDeepSeekRedaccion(): ProveedorRedaccionIa {
  return {
    async redactarBorrador(entrada: EntradaRedaccionIa): Promise<ResultadoRedaccionIa> {
      const configuracion = useRuntimeConfig()
      const apiKey = String(configuracion.editorialAiApiKey || '')
      const modelo = String(configuracion.editorialAiModel || '')
      if (!apiKey || !modelo) throw createError({ statusCode: 503, statusMessage: 'La redacción IA no está configurada.', data: { codigo: 'IA_REDACCION_NO_CONFIGURADA' } })
      const inicio = Date.now()
      const respuesta = await $fetch<RespuestaDeepSeek>('/chat/completions', {
        baseURL: String(configuracion.editorialAiBaseUrl || 'https://api.deepseek.com'), method: 'POST', timeout: 60000,
        headers: { Authorization: `Bearer ${apiKey}` },
        body: { model: modelo, reasoning_effort: 'low', max_tokens: 2048, stream: false,
          messages: [{ role: 'system', content: instruccionesRedaccionV1 }, { role: 'user', content: JSON.stringify({ versionContrato: versionContratoRedaccionIa, operacion: 'redactar_borrador', ...entrada }) }] }
      })
      const eleccion = respuesta.choices?.[0]
      const contenido = typeof eleccion?.message?.content === 'string'
        ? eleccion.message.content.trim()
        : ''
      if (!contenido) throw createError({ statusCode: 502, statusMessage: 'DeepSeek respondió sin contenido. La ingesta quedó protegida: no se reintentó ni se cobró una segunda generación.', data: { codigo: 'IA_REDACCION_SIN_CONTENIDO' } })
      if (eleccion?.finish_reason === 'length') throw createError({ statusCode: 502, statusMessage: 'DeepSeek truncó la propuesta antes de terminar. La ingesta quedó protegida: no se reintentó automáticamente.', data: { codigo: 'IA_REDACCION_TRUNCADA' } })
      let json: unknown
      try { json = extraerJsonProveedor(contenido) } catch { throw createError({ statusCode: 502, statusMessage: 'El proveedor devolvió una propuesta inválida.', data: { codigo: 'IA_REDACCION_INVALIDA' } }) }
      const propuesta = esquemaPropuestaBorradorIa.safeParse(json)
      if (!propuesta.success) throw createError({ statusCode: 502, statusMessage: 'La propuesta no cumple el contrato editorial.', data: { codigo: 'IA_REDACCION_CONTRATO_INVALIDO' } })
      return { propuesta: propuesta.data, proveedor: 'deepseek', modelo: respuesta.model || modelo, consumo: { tokensEntrada: respuesta.usage?.prompt_tokens ?? null, tokensSalida: respuesta.usage?.completion_tokens ?? null, tokensRazonamiento: respuesta.usage?.reasoning_tokens ?? null, costoUsd: null, versionTarifa: null, duracionMs: Date.now() - inicio } }
    }
  }
}

export function hashPromptRedaccion(entrada: EntradaRedaccionIa): string {
  return createHash('sha256').update(JSON.stringify(entrada)).digest('hex')
}
