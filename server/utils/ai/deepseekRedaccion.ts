import { createHash } from 'node:crypto'
import { esquemaPropuestaBorradorIa, versionContratoRedaccionIa } from '~/utils/editorial/redaccionIa'
import type { EntradaRedaccionIa, ProveedorRedaccionIa, ResultadoRedaccionIa } from './contratosRedaccion'
import { instruccionesRedaccionV1 } from './instrucciones/redaccion-v1'
import { esquemaDatosEditorArticulo } from '~/utils/editorial/contenido'
import type { DatosEditorArticulo } from '~/types/contenidoEditorial'

interface RespuestaDeepSeek { choices?: Array<{ finish_reason?: string, message?: { content?: string | null } }>, usage?: { prompt_tokens?: number, completion_tokens?: number, reasoning_tokens?: number }, model?: string }

function prepararEntradaParaProveedor(entrada: EntradaRedaccionIa): EntradaRedaccionIa {
  return entrada
}

function extraerJsonProveedor(contenido: string): unknown {
  const limpio = contenido
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
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

export function normalizarPropuestaProveedor(propuesta: unknown, entrada: EntradaRedaccionIa): unknown {
  if (!propuesta || typeof propuesta !== 'object') return propuesta
  const origen = propuesta as Record<string, unknown>
  const texto = (valor: unknown) => typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : ''
  const limitar = (valor: unknown, maximo: number) => texto(valor).slice(0, maximo)
  const textoConParrafos = (valor: unknown) => typeof valor === 'string'
    ? valor.replace(/[^\S\r\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    : ''
  const limitarConParrafos = (valor: unknown, maximo: number) => textoConParrafos(valor).slice(0, maximo)
  const recolectar = (valor: unknown): string => {
    if (typeof valor === 'string') return valor
    if (Array.isArray(valor)) return valor.map(recolectar).join('\n\n')
    if (!valor || typeof valor !== 'object') return ''
    const nodo = valor as { text?: unknown, content?: unknown }
    return typeof nodo.text === 'string' ? nodo.text : recolectar(nodo.content)
  }
  const esAtribucionDeFuente = (parrafo: string): boolean => {
    const contenido = texto(parrafo)
    const etiqueta = /^(?:fuente(?:\s+original)?|cr[eé]ditos?|video\s+original|origen)\s*[:—-]/iu
    if (etiqueta.test(contenido)) return true

    const hostFuente = new URL(entrada.urlFuente).hostname.replace(/^www\./, '')
    return contenido.includes(hostFuente)
      && (/(?:https?:\/\/|www\.)/iu.test(contenido)
        || /(?:fuente|cr[eé]ditos?|video\s+original)/iu.test(contenido))
  }
  const consolidarParrafos = (fragmentos: string[]): string[] => {
    const minimoPalabras = 55
    return fragmentos.reduce<string[]>((resultado, fragmento) => {
      const anterior = resultado.at(-1)
      const palabrasAnterior = anterior?.match(/[\p{L}\p{N}]+/gu)?.length || 0
      if (anterior && palabrasAnterior < minimoPalabras) {
        resultado[resultado.length - 1] = `${anterior} ${fragmento}`.trim()
      } else {
        resultado.push(fragmento)
      }
      return resultado
    }, [])
  }
  const evidencia = entrada.segmentos.map(segmento => texto(segmento.texto)).filter(Boolean).join('\n')
  const cuerpoSinFuente = recolectar(origen.documento || origen.cuerpo || origen.contenido)
    .split(/\n{1,}/u)
    .filter(parrafo => !esAtribucionDeFuente(parrafo))
    .join('\n\n')
  const cuerpo = limitarConParrafos(cuerpoSinFuente, 60_000) || evidencia
  const contenido = consolidarParrafos(cuerpo.split(/\n{2,}/u)
    .map(fragmento => limitar(fragmento, 4500)).filter(Boolean).slice(0, 80))
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

const instruccionesReescrituraEditorial = `Eres un asistente de edición de Pont3la10. Recibirás un artículo estructurado y una instrucción editorial de una persona revisora. Devuelve exclusivamente JSON válido con la misma forma de datosEditorArticulo. Aplica solo los cambios solicitados y conserva literalmente los campos que no se mencionan. No inventes hechos, fuentes, citas, URLs, autores, fechas ni imágenes. No pongas créditos, URLs de TikTok ni frases como "Fuente:" dentro de los párrafos: la fuente vive únicamente en el objeto fuente. Mantén bloques articuloRelacionado sin cambios. Desarrolla párrafos completos y naturales, no fragmentos telegráficos. No apruebes, publiques ni cambies el estado editorial.`

export async function reescribirArticuloConDeepSeek(
  datos: DatosEditorArticulo,
  instruccion: string
): Promise<{ datos: DatosEditorArticulo, proveedor: string, modelo: string, duracionMs: number }> {
  const configuracion = useRuntimeConfig()
  const apiKey = String(configuracion.editorialAiApiKey || '')
  const modelo = String(configuracion.editorialAiModel || '')
  if (!apiKey || !modelo) {
    throw createError({ statusCode: 503, statusMessage: 'La redacción IA no está configurada.', data: { codigo: 'IA_REDACCION_NO_CONFIGURADA' } })
  }

  const inicio = Date.now()
  const respuesta = await $fetch<RespuestaDeepSeek>('/chat/completions', {
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
        { role: 'system', content: instruccionesReescrituraEditorial },
        { role: 'user', content: JSON.stringify({ operacion: 'aplicar_cambios_solicitados', instruccion, datosEditorArticulo: datos }) }
      ]
    }
  })
  const contenido = respuesta.choices?.[0]?.message?.content?.trim() || ''
  if (!contenido) {
    throw createError({ statusCode: 502, statusMessage: 'DeepSeek respondió sin contenido. No se aplicaron cambios ni se generó un segundo cobro.', data: { codigo: 'IA_REESCRITURA_SIN_CONTENIDO' } })
  }
  if (respuesta.choices?.[0]?.finish_reason === 'length') {
    throw createError({ statusCode: 502, statusMessage: 'DeepSeek truncó los cambios antes de terminarlos. No se aplicaron cambios.', data: { codigo: 'IA_REESCRITURA_TRUNCADA' } })
  }

  let propuesta: unknown
  try {
    propuesta = extraerJsonProveedor(contenido)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'DeepSeek devolvió cambios en un formato inválido. No se aplicaron cambios.', data: { codigo: 'IA_REESCRITURA_INVALIDA' } })
  }

  const validada = esquemaDatosEditorArticulo.safeParse(propuesta)
  if (!validada.success) {
    throw createError({ statusCode: 502, statusMessage: 'La propuesta de cambios no cumple el contrato editorial. No se aplicaron cambios.', data: { codigo: 'IA_REESCRITURA_CONTRATO_INVALIDO' } })
  }

  return {
    datos: validada.data,
    proveedor: 'deepseek',
    modelo: respuesta.model || modelo,
    duracionMs: Date.now() - inicio
  }
}

export function hashPromptReescritura(datos: DatosEditorArticulo, instruccion: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ datos, instruccion }))
    .digest('hex')
}
