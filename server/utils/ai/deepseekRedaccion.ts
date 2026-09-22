import { createHash } from 'node:crypto'
import { esquemaPropuestaBorradorIa, versionContratoRedaccionIa } from '~/utils/editorial/redaccionIa'
import type { EntradaRedaccionIa, ProveedorRedaccionIa, ResultadoRedaccionIa } from './contratosRedaccion'
import { instruccionesRedaccionV1 } from './instrucciones/redaccion-v1'

interface RespuestaDeepSeek { choices?: Array<{ finish_reason?: string, message?: { content?: string | null } }>, usage?: { prompt_tokens?: number, completion_tokens?: number, reasoning_tokens?: number }, model?: string }

function prepararEntradaParaProveedor(entrada: EntradaRedaccionIa): EntradaRedaccionIa {
  return entrada
}

function extraerJsonProveedor(contenido: string): unknown {
  const limpio = contenido
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const inicio = limpio.indexOf('{')
  const fin = limpio.lastIndexOf('}')
  if (inicio < 0 || fin <= inicio) throw new Error('JSON_NO_ENCONTRADO')
  return JSON.parse(limpio.slice(inicio, fin + 1))
}

function normalizarPropuestaProveedor(propuesta: unknown, entrada: EntradaRedaccionIa): unknown {
  if (!propuesta || typeof propuesta !== 'object') return propuesta
  const origen = propuesta as Record<string, unknown>
  const texto = (valor: unknown) => typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : ''
  const limitar = (valor: unknown, maximo: number) => texto(valor).slice(0, maximo)
  const recolectar = (valor: unknown): string => {
    if (typeof valor === 'string') return valor
    if (Array.isArray(valor)) return valor.map(recolectar).join('\n')
    if (!valor || typeof valor !== 'object') return ''
    const nodo = valor as { text?: unknown, content?: unknown }
    return typeof nodo.text === 'string' ? nodo.text : recolectar(nodo.content)
  }
  const evidencia = entrada.segmentos.map(segmento => texto(segmento.texto)).filter(Boolean).join('\n')
  const cuerpoSinFuente = recolectar(origen.documento || origen.cuerpo || origen.contenido)
    .split(/\n{1,}/u)
    .filter(parrafo => !/^\s*fuente\s*:/iu.test(parrafo))
    .join('\n')
  const cuerpo = limitar(cuerpoSinFuente, 60_000) || evidencia
  const contenido = cuerpo.split(/\n{1,}|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/u)
    .map(fragmento => limitar(fragmento, 4500)).filter(Boolean).slice(0, 80)
    .map(fragmento => ({ type: 'paragraph' as const, content: [{ type: 'text' as const, text: fragmento }] }))
  const seo = origen.seo && typeof origen.seo === 'object' ? origen.seo as Record<string, unknown> : {}
  const fuente = origen.fuente && typeof origen.fuente === 'object' ? origen.fuente as Record<string, unknown> : {}
  const ids = new Set(entrada.segmentos.map(segmento => segmento.id))
  const referencias = Array.isArray(origen.segmentosFundamento)
    ? origen.segmentosFundamento.map(segmento => typeof segmento === 'object' && segmento ? (segmento as { id?: unknown }).id : null)
      .filter((id): id is number => typeof id === 'number' && ids.has(id))
    : []
  const segmentosFundamento = (referencias.length ? referencias : [entrada.segmentos[0]?.id])
    .map(id => entrada.segmentos.find(segmento => segmento.id === id))
    .filter((segmento): segmento is EntradaRedaccionIa['segmentos'][number] => Boolean(segmento))
  const lista = (valor: unknown) => Array.isArray(valor)
    ? valor.map(item => limitar(item, 500)).filter(Boolean).slice(0, 30)
    : []
  const titulo = limitar(origen.titulo || origen.title, 160)
    || limitar(entrada.tituloSugerido, 160)
    || limitar(`Resumen de la fuente: ${cuerpo}`, 160)
  const resumen = limitar(origen.resumen || origen.summary || origen.descripcion, 320)
    || limitar(cuerpo, 320)
  return {
    versionContrato: 1,
    titulo,
    resumen,
    tipo: typeof origen.tipo === 'string' && ['breve', 'noticia', 'analisis', 'blog', 'informe', 'opinion', 'especial'].includes(origen.tipo) ? origen.tipo : entrada.tipoSugerido,
    documento: { type: 'doc', content: contenido },
    seo: {
      titulo: limitar(seo.titulo, 70) || limitar(titulo, 70),
      descripcion: limitar(seo.descripcion, 170) || limitar(resumen, 170),
      textoSocial: limitar(seo.textoSocial, 280) || limitar(`${titulo}. ${resumen}`, 280)
    },
    categoriaId: entrada.categoriaId,
    temaIds: [],
    fuente: { url: entrada.urlFuente, nombre: limitar(fuente.nombre, 160) || 'Fuente original', autor: limitar(fuente.autor, 160), creditos: limitar(entrada.creditos, 500) },
    segmentosFundamento,
    afirmacionesPorCorroborar: lista(origen.afirmacionesPorCorroborar),
    advertencias: lista(origen.advertencias)
  }
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
        // La redacción es una transformación estructurada: el modo de razonamiento
        // puede consumir todo el límite antes de emitir `content`. Lo desactivamos
        // para reservar la salida al JSON que valida el contrato editorial.
        body: { model: modelo, reasoning_effort: 'none', max_tokens: 6144, stream: false,
          messages: [{ role: 'system', content: instruccionesRedaccionV1 }, { role: 'user', content: JSON.stringify({ versionContrato: versionContratoRedaccionIa, operacion: 'redactar_borrador', ...prepararEntradaParaProveedor(entrada) }) }] }
      })
      const eleccion = respuesta.choices?.[0]
      const contenido = typeof eleccion?.message?.content === 'string'
        ? eleccion.message.content.trim()
        : ''
      if (!contenido) throw createError({ statusCode: 502, statusMessage: 'DeepSeek respondió sin contenido. La ingesta quedó protegida: no se reintentó ni se cobró una segunda generación.', data: { codigo: 'IA_REDACCION_SIN_CONTENIDO' } })
      if (eleccion?.finish_reason === 'length') throw createError({ statusCode: 502, statusMessage: 'DeepSeek truncó la propuesta antes de terminar. La ingesta quedó protegida: no se reintentó automáticamente.', data: { codigo: 'IA_REDACCION_TRUNCADA' } })
      let json: unknown
      try { json = extraerJsonProveedor(contenido) } catch { throw createError({ statusCode: 502, statusMessage: 'El proveedor devolvió una propuesta inválida.', data: { codigo: 'IA_REDACCION_INVALIDA' } }) }
      const propuesta = esquemaPropuestaBorradorIa.safeParse(normalizarPropuestaProveedor(json, entrada))
      if (!propuesta.success) throw createError({ statusCode: 502, statusMessage: 'La propuesta no cumple el contrato editorial.', data: { codigo: 'IA_REDACCION_CONTRATO_INVALIDO' } })
      return { propuesta: propuesta.data, proveedor: 'deepseek', modelo: respuesta.model || modelo, consumo: { tokensEntrada: respuesta.usage?.prompt_tokens ?? null, tokensSalida: respuesta.usage?.completion_tokens ?? null, tokensRazonamiento: respuesta.usage?.reasoning_tokens ?? null, costoUsd: null, versionTarifa: null, duracionMs: Date.now() - inicio } }
    }
  }
}

export function hashPromptRedaccion(entrada: EntradaRedaccionIa): string {
  return createHash('sha256').update(JSON.stringify(entrada)).digest('hex')
}
