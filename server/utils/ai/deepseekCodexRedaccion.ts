import { esquemaPropuestaBorradorIa, versionContratoRedaccionIa } from '~/utils/editorial/redaccionIa'
import type { EntradaRedaccionIa, ProveedorRedaccionIa, ResultadoRedaccionIa } from './contratosRedaccion'
import { normalizarPropuestaProveedor } from './deepseekRedaccion'
import { instruccionesRedaccionCodex } from './instrucciones/redaccion-codex.mjs'
import { normalizarSeleccionEditorialCodex, prepararContextoEditorialCodex } from './seleccionEditorialCodex'

interface RespuestaDeepSeekCodex {
  choices?: Array<{ finish_reason?: string, message?: { content?: string | null } }>
  usage?: { prompt_tokens?: number, completion_tokens?: number, reasoning_tokens?: number }
  model?: string
}

function extraerJsonCodex(contenido: string): unknown {
  const limpio = contenido.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const inicio = limpio.indexOf('{')
  if (inicio < 0) throw new Error('JSON_NO_ENCONTRADO')

  let profundidad = 0
  let dentroDeCadena = false
  let escapado = false
  for (let indice = inicio; indice < limpio.length; indice += 1) {
    const caracter = limpio[indice]
    if (dentroDeCadena) {
      if (escapado) escapado = false
      else if (caracter === '\\') escapado = true
      else if (caracter === '"') dentroDeCadena = false
      continue
    }
    if (caracter === '"') dentroDeCadena = true
    else if (caracter === '{') profundidad += 1
    else if (caracter === '}') {
      profundidad -= 1
      if (profundidad === 0) return JSON.parse(limpio.slice(inicio, indice + 1))
    }
  }
  throw new Error('JSON_INCOMPLETO')
}

export function crearProveedorDeepSeekCodex(): ProveedorRedaccionIa {
  return {
    async redactarBorrador(entrada: EntradaRedaccionIa): Promise<ResultadoRedaccionIa> {
      const configuracion = useRuntimeConfig()
      const apiKey = String(configuracion.editorialAiApiKey || '')
      const modelo = String(configuracion.editorialAiModel || '')
      if (!apiKey || !modelo) {
        throw createError({ statusCode: 503, statusMessage: 'La redacción IA no está configurada.', data: { codigo: 'IA_REDACCION_NO_CONFIGURADA' } })
      }

      const inicio = Date.now()
      const respuesta = await $fetch<RespuestaDeepSeekCodex>('/chat/completions', {
        baseURL: String(configuracion.editorialAiBaseUrl || 'https://api.deepseek.com'),
        method: 'POST',
        timeout: 60000,
        headers: { Authorization: `Bearer ${apiKey}` },
        body: {
          model: modelo,
          reasoning_effort: 'none',
          max_tokens: 6144,
          stream: false,
          messages: [
            { role: 'system', content: instruccionesRedaccionCodex },
            { role: 'user', content: JSON.stringify({
              versionContrato: versionContratoRedaccionIa,
              operacion: 'redactar_borrador_investigado',
              ...prepararContextoEditorialCodex(entrada)
            }) }
          ]
        }
      })
      const eleccion = respuesta.choices?.[0]
      const contenido = typeof eleccion?.message?.content === 'string' ? eleccion.message.content.trim() : ''
      if (!contenido) {
        throw createError({ statusCode: 502, statusMessage: 'DeepSeek respondió sin contenido para el expediente de Codex.', data: { codigo: 'IA_REDACCION_SIN_CONTENIDO' } })
      }
      if (eleccion?.finish_reason === 'length') {
        throw createError({ statusCode: 502, statusMessage: 'DeepSeek truncó la propuesta de Codex antes de terminar.', data: { codigo: 'IA_REDACCION_TRUNCADA' } })
      }

      let json: unknown
      try {
        json = extraerJsonCodex(contenido)
      } catch {
        throw createError({ statusCode: 502, statusMessage: 'DeepSeek devolvió JSON inválido para la propuesta de Codex.', data: { codigo: 'IA_REDACCION_INVALIDA' } })
      }

      const propuesta = esquemaPropuestaBorradorIa.safeParse(normalizarPropuestaProveedor(json, entrada))
      if (!propuesta.success) {
        throw createError({ statusCode: 502, statusMessage: 'La propuesta de Codex no cumple el contrato editorial.', data: { codigo: 'IA_REDACCION_CONTRATO_INVALIDO' } })
      }

      return {
        propuesta: propuesta.data,
        proveedor: 'deepseek',
        modelo: respuesta.model || modelo,
        consumo: {
          tokensEntrada: respuesta.usage?.prompt_tokens ?? null,
          tokensSalida: respuesta.usage?.completion_tokens ?? null,
          tokensRazonamiento: respuesta.usage?.reasoning_tokens ?? null,
          costoUsd: null,
          versionTarifa: null,
          duracionMs: Date.now() - inicio
        },
        seleccionEditorial: normalizarSeleccionEditorialCodex(json, entrada)
      }
    }
  }
}
