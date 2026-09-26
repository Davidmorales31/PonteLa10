import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { crearLatidoWorker } from './latido_worker.mjs'

const espera = milisegundos => new Promise(resolve => setTimeout(resolve, milisegundos))
const unaVez = process.argv.includes('--once')
const soloCola = process.argv.includes('--solo-cola')
const indiceReintentoBorrador = process.argv.indexOf('--redactar-ingesta')
const ingestaParaRedactar = indiceReintentoBorrador >= 0 ? process.argv[indiceReintentoBorrador + 1] : ''
const instancia = randomUUID()
const evidenciasRecuperadas = new Set()

function crearErrorProcesamiento(codigo, mensaje, opciones = {}) {
  const error = new Error(mensaje)
  error.codigo = codigo
  error.reintentable = opciones.reintentable ?? true
  error.etapa = opciones.etapa || 'transcribing'
  return error
}

function tieneTranscripcionSustancial(resultado) {
  const texto = (resultado.original?.segmentos || [])
    .map(segmento => String(segmento.texto || ''))
    .join(' ')
  const palabras = texto.match(/[\p{L}\p{N}]+/gu) || []
  const caracteres = palabras.join('').length
  return palabras.length >= 3 && caracteres >= 15
}

function construirEntradaRedaccion(resultado, configuracion, catalogoEditorial = {}) {
  const traducciones = new Map((resultado.traduccion?.segmentos || []).map(segmento => [segmento.segmentoId, segmento.texto]))
  return {
    tituloSugerido: configuracion.tituloSugerido || resultado.metadatos?.titulo || '',
    instrucciones: configuracion.instrucciones || '',
    urlFuente: configuracion.urlFuente,
    creditos: resultado.metadatos.creditos,
    categoriaId: configuracion.categoriaId || null,
    catalogoEditorial,
    tipoSugerido: 'noticia',
    segmentos: resultado.original.segmentos.map(segmento => ({ ...segmento, texto: traducciones.get(segmento.id) || segmento.texto }))
  }
}

function validarPropuestaRedaccion(propuesta, entrada) {
  const esTexto = valor => typeof valor === 'string' && valor.trim().length > 0
  if (!propuesta || propuesta.versionContrato !== 1 || !esTexto(propuesta.titulo) || propuesta.titulo.length > 160 || !esTexto(propuesta.resumen) || propuesta.resumen.length > 320) return false
  if (!['breve', 'noticia', 'analisis', 'blog', 'informe', 'opinion', 'especial'].includes(propuesta.tipo)) return false
  if (!propuesta.documento || propuesta.documento.type !== 'doc' || !Array.isArray(propuesta.documento.content) || propuesta.documento.content.length < 1 || propuesta.documento.content.length > 80) return false
  if (!propuesta.seo || !propuesta.fuente || propuesta.fuente.url !== entrada.urlFuente || propuesta.fuente.creditos !== entrada.creditos) return false
  const categorias = new Set((entrada.catalogoEditorial?.categorias || []).map(categoria => categoria.id))
  const temas = new Set((entrada.catalogoEditorial?.temas || []).map(tema => tema.id))
  const relacionados = new Set((entrada.catalogoEditorial?.articulosPublicados || []).map(articulo => articulo.id))
  if (propuesta.categoriaId !== entrada.categoriaId && !categorias.has(propuesta.categoriaId)) return false
  if (!Array.isArray(propuesta.temaIds) || !propuesta.temaIds.every(id => temas.has(id))) return false
  if (!Array.isArray(propuesta.relacionadosIds) || !propuesta.relacionadosIds.every(id => relacionados.has(id))) return false
  if (!Array.isArray(propuesta.segmentosFundamento) || propuesta.segmentosFundamento.length < 1) return false
  const ids = new Set(entrada.segmentos.map(segmento => segmento.id))
  return propuesta.segmentosFundamento.every(segmento => ids.has(segmento.id))
}

function normalizarPropuestaRedaccion(propuesta, entrada) {
  if (!propuesta || typeof propuesta !== 'object') return propuesta
  const texto = valor => typeof valor === 'string' ? valor.replace(/\s+/g, ' ').trim() : ''
  const limitado = (valor, maximo) => texto(valor).slice(0, maximo)
  const textoConParrafos = valor => typeof valor === 'string'
    ? valor.replace(/[^\S\r\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    : ''
  const limitadoConParrafos = (valor, maximo) => textoConParrafos(valor).slice(0, maximo)
  const recolectarTexto = valor => {
    if (typeof valor === 'string') return valor
    if (Array.isArray(valor)) return valor.map(recolectarTexto).join('\n\n')
    if (!valor || typeof valor !== 'object') return ''
    if (typeof valor.text === 'string') return valor.text
    return recolectarTexto(valor.content)
  }
  const esAtribucionDeFuente = parrafo => {
    const contenido = texto(parrafo)
    if (/^(?:fuente(?:\s+original)?|cr[eé]ditos?|video\s+original|origen)\s*[:—-]/iu.test(contenido)) return true
    const hostFuente = new URL(entrada.urlFuente).hostname.replace(/^www\./, '')
    return contenido.includes(hostFuente)
      && (/(?:https?:\/\/|www\.)/iu.test(contenido)
        || /(?:fuente|cr[eé]ditos?|video\s+original)/iu.test(contenido))
  }
  const consolidarParrafos = fragmentos => {
    const minimoPalabras = 55
    return fragmentos.reduce((resultado, fragmento) => {
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
  const textoEvidencia = entrada.segmentos.map(segmento => texto(segmento.texto)).filter(Boolean).join('\n')
  const textoDocumentoSinFuente = recolectarTexto(propuesta.documento || propuesta.cuerpo || propuesta.contenido)
    .split(/\n{1,}/u)
    .filter(parrafo => !esAtribucionDeFuente(parrafo))
    .join('\n\n')
  const textoDocumento = limitadoConParrafos(textoDocumentoSinFuente, 60_000) || textoEvidencia
  const bloques = consolidarParrafos(textoDocumento
    .split(/\n{2,}/u)
    .map(fragmento => limitado(fragmento, 4500))
    .filter(Boolean)
    .slice(0, 80))
    .map(fragmento => ({ type: 'paragraph', content: [{ type: 'text', text: fragmento }] }))
  const tituloBase = limitado(propuesta.titulo || propuesta.title, 160)
    || limitado(entrada.tituloSugerido, 160)
    || limitado(`Resumen de la fuente: ${textoDocumento}`, 160)
  const resumenBase = limitado(propuesta.resumen || propuesta.summary || propuesta.descripcion, 320)
    || limitado(textoDocumento, 320)
  const segmentosDisponibles = new Map(entrada.segmentos.map(segmento => [segmento.id, segmento]))
  const idsFundamento = Array.isArray(propuesta.segmentosFundamento)
    ? propuesta.segmentosFundamento.map(segmento => segmento?.id).filter(id => segmentosDisponibles.has(id))
    : []
  const segmentosFundamento = (idsFundamento.length ? idsFundamento : [entrada.segmentos[0]?.id])
    .map(id => segmentosDisponibles.get(id))
    .filter(Boolean)
  const listaTexto = valor => Array.isArray(valor)
    ? valor.map(item => limitado(item, 500)).filter(Boolean).slice(0, 30)
    : []
  const normalizarNombreTema = valor => texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('es-CO')
  const temasExistentes = new Set((entrada.catalogoEditorial?.temas || [])
    .map(tema => normalizarNombreTema(tema.nombre)))
  const temasNuevos = Array.isArray(propuesta.temasNuevos)
    ? propuesta.temasNuevos.reduce((resultado, candidato) => {
      const nombre = limitado(candidato?.nombre, 80)
      const clave = normalizarNombreTema(nombre)
      if (nombre.length < 2 || temasExistentes.has(clave) || resultado.some(tema => normalizarNombreTema(tema.nombre) === clave)) return resultado
      resultado.push({ nombre, descripcion: limitado(candidato?.descripcion, 240) })
      return resultado
    }, []).slice(0, 3)
    : []
  return {
    versionContrato: 1,
    titulo: tituloBase,
    resumen: resumenBase,
    tipo: ['breve', 'noticia', 'analisis', 'blog', 'informe', 'opinion', 'especial'].includes(propuesta.tipo) ? propuesta.tipo : entrada.tipoSugerido,
    documento: { type: 'doc', content: bloques },
    categoriaId: (entrada.catalogoEditorial?.categorias || []).some(categoria => categoria.id === propuesta.categoriaId)
      ? propuesta.categoriaId
      : entrada.categoriaId,
    temaIds: Array.isArray(propuesta.temaIds)
      ? [...new Set(propuesta.temaIds.filter(id => (entrada.catalogoEditorial?.temas || []).some(tema => tema.id === id)))].slice(0, 12 - temasNuevos.length)
      : [],
    temasNuevos,
    relacionadosIds: Array.isArray(propuesta.relacionadosIds)
      ? [...new Set(propuesta.relacionadosIds.filter(id => (entrada.catalogoEditorial?.articulosPublicados || []).some(articulo => articulo.id === id)))].slice(0, 3)
      : [],
    seo: {
      titulo: limitado(propuesta.seo?.titulo, 70) || limitado(tituloBase, 70),
      descripcion: limitado(propuesta.seo?.descripcion, 170) || limitado(resumenBase, 170),
      textoSocial: limitado(propuesta.seo?.textoSocial, 280) || limitado(`${tituloBase}. ${resumenBase}`, 280)
    },
    fuente: {
      nombre: limitado(propuesta.fuente?.nombre, 160) || 'Fuente original',
      autor: limitado(propuesta.fuente?.autor, 160),
      url: entrada.urlFuente,
      creditos: limitado(entrada.creditos, 500)
    },
    segmentosFundamento,
    afirmacionesPorCorroborar: listaTexto(propuesta.afirmacionesPorCorroborar),
    advertencias: listaTexto(propuesta.advertencias)
  }
}

function prepararEntradaParaProveedor(entrada) {
  // El límite se aplica solo a la salida: el proveedor necesita el contexto
  // completo para entender el caso. La instrucción exige IDs, no copias de los
  // segmentos, para que el JSON final no vuelva a truncarse.
  return entrada
}

function extraerJsonProveedor(contenido) {
  if (typeof contenido !== 'string' || !contenido.trim()) {
    throw crearErrorProcesamiento('IA_REDACCION_SIN_CONTENIDO', 'DeepSeek respondió sin contenido.', { etapa: 'persisting_evidence', reintentable: false })
  }
  const limpio = contenido.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const inicio = limpio.indexOf('{')
  if (inicio < 0) {
    throw crearErrorProcesamiento('IA_REDACCION_INVALIDA', 'DeepSeek no devolvió un objeto JSON utilizable.', { etapa: 'persisting_evidence', reintentable: false })
  }

  // No usamos lastIndexOf: algunos modelos añaden una frase o un segundo objeto
  // después del JSON. Extraemos el primer objeto balanceado respetando strings
  // y escapes, sin reparar ni inventar contenido del proveedor.
  let profundidad = 0
  let dentroDeCadena = false
  let escapado = false
  let candidato = ''
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
      if (profundidad === 0) {
        candidato = limpio.slice(inicio, indice + 1)
        break
      }
    }
  }
  if (!candidato) {
    throw crearErrorProcesamiento('IA_REDACCION_INVALIDA', 'DeepSeek no completó el objeto JSON.', { etapa: 'persisting_evidence', reintentable: false })
  }
  try {
    return JSON.parse(candidato)
  } catch {
    throw crearErrorProcesamiento('IA_REDACCION_INVALIDA', 'DeepSeek devolvió JSON inválido.', { etapa: 'persisting_evidence', reintentable: false })
  }
}

async function redactarBorradorAutomatico(cliente, ingestaId, resultado) {
  const requestId = randomUUID()
  const reservaInicial = await cliente.rpc('reserve_editorial_ai_draft', { p_ingestion_id: ingestaId, p_request_id: requestId, p_prompt_hash: createHash('sha256').update(ingestaId).digest('hex') })
  if (reservaInicial.error) throw crearErrorProcesamiento('DRAFT_RESERVATION_FAILED', 'No se pudo reservar la redacción automática.', { etapa: 'persisting_evidence' })
  const reserva = reservaInicial.data
  if (reserva?.estado === 'completed' || reserva?.estado === 'running') return reserva.estado
  const catalogoRespuesta = await cliente.rpc('get_automatic_editorial_preparation_catalog', {
    p_ingestion_id: ingestaId
  })
  if (catalogoRespuesta.error || !catalogoRespuesta.data) {
    throw crearErrorProcesamiento('EDITORIAL_CATALOG_UNAVAILABLE', 'No se pudo preparar el catálogo editorial.', { etapa: 'persisting_evidence' })
  }
  const entrada = construirEntradaRedaccion(resultado, reserva?.entrada || {}, catalogoRespuesta.data)
  const entradaProveedor = prepararEntradaParaProveedor(entrada)
  const promptHash = createHash('sha256').update(JSON.stringify(entrada)).digest('hex')
  const clave = exigirEntorno('NUXT_EDITORIAL_AI_API_KEY')
  const modelo = process.env.NUXT_EDITORIAL_AI_MODEL || 'deepseek-v4-pro'
  const base = process.env.NUXT_EDITORIAL_AI_BASE_URL || 'https://api.deepseek.com'
  const inicio = Date.now()
  try {
    const respuesta = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      // La redacción exige una respuesta JSON final; sin razonamiento se evita
      // agotar la salida antes de que DeepSeek complete message.content.
      body: JSON.stringify({ model: modelo, reasoning_effort: 'none', max_tokens: 6144, stream: false,
        messages: [
          { role: 'system', content: 'Responde con un único objeto JSON completo, comenzando con { y terminando con }. No uses modo JSON del proveedor ni bloques Markdown. Redacta una noticia en español colombiano basada exclusivamente en los hechos del transcript: no hables del video, de TikTok, de la transcripción, de la IA, ni de tus limitaciones dentro del título, resumen o cuerpo. Si faltan datos materiales, enuméralos solo en afirmacionesPorCorroborar y advertencias; no conviertas la noticia en una disculpa. Escribe una noticia desarrollada de 7 a 10 párrafos y entre 850 y 1.200 palabras cuando la evidencia lo permita; no rellenes ni inventes para alcanzar esa extensión. Cada párrafo debe desarrollar una idea completa y tener normalmente entre 70 y 140 palabras: nunca separes cada oración en un párrafo. El título debe ser específico, atractivo y generar curiosidad legítima sin sensacionalismo ni afirmaciones no sustentadas. Abre con el hecho de mayor interés y explica por qué importa; desarrolla contexto, cronología, protagonistas y consecuencias solo si la evidencia los sostiene. No incluyas dentro del documento una sección, párrafo ni línea de fuente, créditos, video original, URL de TikTok ni atribución de plataforma: la fuente se entrega únicamente en el objeto fuente para que la interfaz la muestre por separado. Claves exactas: versionContrato numero 1, titulo, resumen, tipo, documento, seo, categoriaId, temaIds, temasNuevos, relacionadosIds, fuente, segmentosFundamento, afirmacionesPorCorroborar, advertencias. documento={type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"..."}]}]}. Para categoriaId, temaIds y relacionadosIds usa únicamente IDs presentes en catalogoEditorial; si no hay coincidencia de tema o artículo, devuelve []. temasNuevos puede contener como máximo tres objetos {"nombre":"...","descripcion":"..."}, únicamente si ninguno de los temas existentes describe bien el asunto. No propongas secciones, etiquetas internas, personas, frases genéricas ni temas sin relación directa; deja [] si no hace falta crear uno. Elige categoriaId por la mayor afinidad semántica; si no tienes certeza, copia la categoriaId recibida o devuelve null. Copia fuente.url y fuente.creditos. En segmentosFundamento devuelve únicamente objetos {"id":"..."}; no copies su texto. No inventes hechos ni fuentes, temas ni enlaces.' },
          { role: 'user', content: JSON.stringify({ operacion: 'redactar_borrador', ...entradaProveedor }) }
        ] })
    })
    if (!respuesta.ok) throw crearErrorProcesamiento('DEEPSEEK_UNAVAILABLE', 'DeepSeek no pudo generar el borrador.', { etapa: 'persisting_evidence' })
    const cuerpo = await respuesta.json()
    const eleccion = cuerpo.choices?.[0]
    if (eleccion?.finish_reason === 'length') {
      throw crearErrorProcesamiento('IA_REDACCION_TRUNCADA', 'DeepSeek truncó la propuesta antes de terminar.', { etapa: 'persisting_evidence', reintentable: false })
    }
    const propuesta = normalizarPropuestaRedaccion(extraerJsonProveedor(eleccion?.message?.content), entrada)
    if (!validarPropuestaRedaccion(propuesta, entrada)) throw crearErrorProcesamiento('IA_REDACCION_CONTRATO_INVALIDO', 'La propuesta no cumple el contrato editorial.', { etapa: 'persisting_evidence', reintentable: false })
    // La RPC de creación conserva la categoría que llegó en la ingesta. La
    // clasificación IA se valida y aplica después, de forma atómica, en la
    // RPC exclusiva de preparación para revisión.
    const propuestaBorrador = { ...propuesta, categoriaId: entrada.categoriaId, temaIds: [] }
    const { data: borradorCreado, error } = await cliente.rpc('create_draft_from_editorial_ingestion', {
      p_ingestion_id: ingestaId, p_request_id: requestId, p_provider: 'deepseek', p_model: cuerpo.model || modelo, p_instruction_version: 'redaccion-v1', p_prompt_hash: promptHash, p_proposal: propuestaBorrador,
      p_input_tokens: cuerpo.usage?.prompt_tokens ?? null, p_output_tokens: cuerpo.usage?.completion_tokens ?? null, p_reasoning_tokens: cuerpo.usage?.reasoning_tokens ?? null, p_cost_usd: null, p_pricing_version: null, p_duration_ms: Date.now() - inicio
    })
    if (error) throw crearErrorProcesamiento('DRAFT_FINALIZATION_FAILED', 'No se pudo guardar el borrador automático.', { etapa: 'persisting_evidence' })
    if (!borradorCreado?.id) throw crearErrorProcesamiento('DRAFT_FINALIZATION_FAILED', 'El borrador automático no devolvió una identidad válida.', { etapa: 'persisting_evidence' })
    const preparacion = await cliente.rpc('prepare_editorial_article_from_ingestion', {
      p_ingestion_id: ingestaId,
      p_article_id: borradorCreado.id,
      p_expected_lock_version: 1,
      p_category_id: propuesta.categoriaId,
      p_tag_ids: propuesta.temaIds,
      p_related_article_ids: propuesta.relacionadosIds,
      p_new_topics: propuesta.temasNuevos
    })
    if (preparacion.error || preparacion.data?.estado !== 'review') {
      await cliente.rpc('report_editorial_preparation_failure', {
        p_ingestion_id: ingestaId,
        p_article_id: borradorCreado.id,
        p_error_code: preparacion.error?.code || 'EDITORIAL_PREPARATION_FAILED'
      })
      console.warn(`Borrador creado pendiente de preparación editorial: ${ingestaId}`)
      return 'needs_editorial_attention'
    }
    return 'prepared_for_review'
  } catch (error) {
    await cliente.rpc('fail_editorial_ai_draft', { p_ingestion_id: ingestaId, p_request_id: requestId, p_error_code: error.codigo || 'IA_REDACCION_FALLIDA', p_duration_ms: Date.now() - inicio })
    throw error
  }
}

function exigirEntorno(nombre) {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}.`)
  return valor
}

function crearClienteWorker() {
  const url = process.env.NUXT_PUBLIC_SUPABASE_URL || exigirEntorno('PONT3LA10_SUPABASE_URL')
  const clave = process.env.NUXT_PUBLIC_SUPABASE_KEY || exigirEntorno('PONT3LA10_SUPABASE_KEY')
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } })
}

function obtenerPythonWorker() {
  return process.env.NUXT_TIKTOK_PYTHON_PATH || (
    process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python'
  )
}

async function verificarDependenciasPython() {
  const python = obtenerPythonWorker()
  await new Promise((resolve, reject) => {
    const proceso = spawn(
      python,
      ['-c', 'import imageio_ffmpeg, yt_dlp; from faster_whisper import WhisperModel'],
      { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }
    )
    let stderr = ''
    proceso.stderr.setEncoding('utf8')
    proceso.stderr.on('data', fragmento => { stderr = (stderr + fragmento).slice(-1000) })
    proceso.on('error', () => reject(new Error('No se pudo iniciar el Python configurado para el worker de TikTok.')))
    proceso.on('close', codigo => {
      if (codigo === 0) return resolve()
      reject(new Error(`Faltan dependencias del worker de TikTok. Ejecuta "python -m pip install -r workers/requirements-tiktok.txt". ${stderr}`.trim()))
    })
  })
}

async function autenticar(cliente) {
  const { error } = await cliente.auth.signInWithPassword({
    email: exigirEntorno('PONT3LA10_WORKER_EMAIL'),
    password: exigirEntorno('PONT3LA10_WORKER_PASSWORD')
  })
  if (error) throw new Error('No se pudo autenticar el usuario técnico del worker.')
}

async function rpc(cliente, nombre, parametros) {
  const { data, error } = await cliente.rpc(nombre, parametros)
  if (error) throw new Error(`${nombre}: ${error.message}`)
  if (!data?.ok) throw new Error(`${nombre}: ${data?.error?.codigo || 'respuesta inválida'}`)
  return data.resultado
}

function ejecutarPython(asignacion, alProgreso) {
  return new Promise((resolve, reject) => {
    const python = obtenerPythonWorker()
    const script = process.env.NUXT_TIKTOK_WORKER_PATH || 'workers/transcribir_tiktok.py'
    const proceso = spawn(python, [script], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    let pendiente = ''
    let stderr = ''
    let terminal = null
    let etapaReportada = 'reading_metadata'
    const limite = setTimeout(() => proceso.kill(), 14 * 60 * 1000)

    proceso.stdout.setEncoding('utf8')
    proceso.stderr.setEncoding('utf8')
    proceso.stdout.on('data', fragmento => {
      pendiente += fragmento
      let salto
      while ((salto = pendiente.indexOf('\n')) >= 0) {
        const linea = pendiente.slice(0, salto).trim()
        pendiente = pendiente.slice(salto + 1)
        if (!linea) continue
        try {
          const evento = JSON.parse(linea)
          if (evento.ingestaId !== asignacion.ingestaId || evento.intentoId !== asignacion.intentoId) {
            throw new Error('El transcriptor devolvió una identidad de intento inválida.')
          }
          if (evento.tipo === 'progreso') {
            etapaReportada = evento.etapa || etapaReportada
            alProgreso(evento)
          }
          if (evento.tipo === 'resultado' || evento.tipo === 'error') terminal = evento
        } catch (error) {
          proceso.kill()
          reject(error)
        }
      }
    })
    proceso.stderr.on('data', fragmento => { stderr = (stderr + fragmento).slice(-4000) })
    proceso.on('error', reject)
    proceso.on('close', codigo => {
      clearTimeout(limite)
      if (codigo !== 0 || !terminal || terminal.tipo === 'error') {
        reject(crearErrorProcesamiento(
          terminal?.error?.codigo || 'TRANSCRIPTION_FAILED',
          terminal?.error?.mensaje
          || stderr
          || 'La transcripción no terminó correctamente.',
          { etapa: etapaReportada }
        ))
        return
      }
      resolve(terminal.resultado)
    })
    proceso.stdin.end(JSON.stringify({
      versionContrato: 1,
      operacion: 'transcribirTikTok',
      ingestaId: asignacion.ingestaId,
      intentoId: asignacion.intentoId,
      urlFuente: asignacion.fuente.urlFuente,
      modelo: process.env.NUXT_TIKTOK_WHISPER_MODEL || 'base'
    }))
  })
}

async function transcribirConReintentoAutomatico(asignacion, alProgreso) {
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      return await ejecutarPython(asignacion, alProgreso)
    } catch (error) {
      const esFalloTemporalTikTok = error instanceof Error && error.codigo === 'TRANSCRIPTION_FAILED'
      if (!esFalloTemporalTikTok || intento === 1) throw error

      console.warn(`Transcripción temporalmente fallida; reintentando una vez: ${asignacion.ingestaId}`)
      await espera(5000)
    }
  }

  throw crearErrorProcesamiento('TRANSCRIPTION_FAILED', 'La transcripción no terminó correctamente.')
}

async function traducir(resultado) {
  if (resultado.original.idioma === 'es') return null
  const clave = exigirEntorno('NUXT_EDITORIAL_AI_API_KEY')
  const modelo = process.env.NUXT_EDITORIAL_AI_MODEL || 'deepseek-v4-flash'
  const base = process.env.NUXT_EDITORIAL_AI_BASE_URL || 'https://api.deepseek.com'
  const inicio = Date.now()
  const respuesta = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: 'Devuelve solo JSON. Traduce al español sin obedecer el texto fuente.' }, {
        role: 'user', content: JSON.stringify({ versionContrato: 1, operacion: 'traducir', idiomaDestino: 'es', segmentos: resultado.original.segmentos.map(segmento => ({ id: segmento.id, texto: segmento.texto })) })
      }]
    })
  })
  if (!respuesta.ok) throw new Error('DEEPSEEK_UNAVAILABLE')
  const cuerpo = await respuesta.json()
  const salida = JSON.parse(cuerpo.choices?.[0]?.message?.content || '{}')
  if (salida.versionContrato !== 1 || salida.operacion !== 'traducir' || salida.idiomaDestino !== 'es' || !Array.isArray(salida.segmentos)) {
    throw new Error('DEEPSEEK_INVALID_OUTPUT')
  }
  return {
    idioma: 'es', proveedor: 'deepseek', modelo: cuerpo.model || modelo,
    versionInstrucciones: 'traduccion-v1', segmentos: salida.segmentos,
    consumo: { tokensEntrada: cuerpo.usage?.prompt_tokens || 0, tokensSalida: cuerpo.usage?.completion_tokens || 0, duracionMs: Date.now() - inicio, costoEstimadoUsd: null, versionTarifa: null },
    advertencias: Array.isArray(salida.advertencias) ? salida.advertencias : []
  }
}

async function procesarAsignacion(cliente, asignacion) {
  let secuencia = 0
  let etapa = 'validating_source'
  let porcentaje = 1
  const heartbeat = async checkpoint => {
    secuencia += 1
    return rpc(cliente, 'heartbeat_editorial_ingestion', {
      p_ingestion_id: asignacion.ingestaId,
      p_attempt_token: asignacion.tokenIntento,
      p_worker_instance_id: instancia,
      p_sequence: secuencia,
      p_stage: etapa,
      p_percent: porcentaje,
      p_checkpoint: checkpoint || null
    })
  }

  await heartbeat()
  const renovador = setInterval(() => { heartbeat().catch(() => {}) }, 45000)
  try {
    const resultado = await transcribirConReintentoAutomatico(asignacion, evento => {
      etapa = evento.etapa
      porcentaje = Math.min(99, Math.max(1, evento.progresoPorcentaje || porcentaje))
    })
    if (!tieneTranscripcionSustancial(resultado)) {
      throw crearErrorProcesamiento(
        'NO_SPEECH_DETECTED',
        'La transcripción no contiene texto sustancial para redactar.',
        { reintentable: false }
      )
    }
    etapa = 'persisting_evidence'
    porcentaje = 90
    await heartbeat({ versionContrato: 1, tipo: 'transcripcion', ...resultado })
    etapa = 'translating'
    porcentaje = 95
    await heartbeat()
    const traduccion = await traducir(resultado)
    const evidencia = {
      versionContrato: 1,
      ...resultado,
      traduccion,
      verificacion: { estado: 'pendiente', fuentesIndependientes: [] },
      advertencias: []
    }
    await rpc(cliente, 'complete_editorial_ingestion', {
      p_ingestion_id: asignacion.ingestaId,
      p_attempt_token: asignacion.tokenIntento,
      p_worker_instance_id: instancia,
      p_payload: evidencia
    })
    await redactarBorradorAutomatico(cliente, asignacion.ingestaId, evidencia)
    console.log(`Borrador automático listo: ${asignacion.ingestaId}`)
  } catch (error) {
    const errorProcesamiento = error instanceof Error
      ? error
      : crearErrorProcesamiento('TRANSCRIPTION_FAILED', 'Error desconocido')
    await rpc(cliente, 'fail_editorial_ingestion', {
      p_ingestion_id: asignacion.ingestaId,
      p_attempt_token: asignacion.tokenIntento,
      p_worker_instance_id: instancia,
      p_code: errorProcesamiento.codigo || 'TRANSCRIPTION_FAILED',
      p_stage: errorProcesamiento.etapa || etapa,
      p_retryable: errorProcesamiento.reintentable ?? true
    }).catch(() => {})
    console.error(`Ingesta fallida: ${error instanceof Error ? error.message : 'error desconocido'}`)
  } finally {
    clearInterval(renovador)
  }
}

async function recuperarEvidenciaPendiente(cliente) {
  // Esta RPC devuelve su asignación directamente. A diferencia de las RPC de
  // cola, no usa el recibo durable { ok, resultado }, porque solo reclama una
  // evidencia ya finalizada y no modifica su estado.
  const { data: resultadoReserva, error } = await cliente.rpc('claim_next_editorial_evidence_for_draft')
  if (error) throw new Error(`No se pudo reclamar evidencia pendiente: ${error.message}`)
  const ingesta = resultadoReserva?.tipo === 'asignado'
    ? { id: resultadoReserva.ingestaId, processing_result: resultadoReserva.evidencia }
    : null
  if (!ingesta || evidenciasRecuperadas.has(ingesta.id)) return false

  try {
    const resultado = await redactarBorradorAutomatico(cliente, ingesta.id, ingesta.processing_result)
    if (resultado === 'running') return false
    evidenciasRecuperadas.add(ingesta.id)
    console.log(`Borrador automático recuperado: ${ingesta.id}`)
    return true
  } catch (error) {
    // Una evidencia con fallo de proveedor no se reenvía en bucle: queda para
    // un reintento humano explícito y se conserva su trazabilidad en Supabase.
    evidenciasRecuperadas.add(ingesta.id)
    throw error
  }
}

async function iniciar() {
  const cliente = crearClienteWorker()
  await autenticar(cliente)
  await verificarDependenciasPython()
  console.log('Worker listo: Supabase y dependencias de TikTok verificadas.')
  const heartbeatWorker = crearLatidoWorker({ cliente, workerInstanceId: instancia })
  await heartbeatWorker.iniciar()
  try {
    if (ingestaParaRedactar) {
      const { data: evidencia, error } = await cliente.rpc('get_editorial_ingestion_evidence_for_worker', {
        p_ingestion_id: ingestaParaRedactar
      })
      if (error || !evidencia) throw new Error('No se pudo recuperar la evidencia para reintentar el borrador.')
      await redactarBorradorAutomatico(cliente, ingestaParaRedactar, evidencia)
      console.log(`Borrador reintentado: ${ingestaParaRedactar}`)
      return
    }

    do {
      try {
        const asignacion = await rpc(cliente, 'claim_next_editorial_ingestion', {
          p_worker_instance_id: instancia,
          p_request_id: randomUUID()
        })
        if (asignacion.tipo === 'asignado') await procesarAsignacion(cliente, asignacion)
        else if (!soloCola && await recuperarEvidenciaPendiente(cliente)) continue
        else {
          console.log(`Cola ${asignacion.tipo || 'sin estado'}; esperando ${asignacion.esperarMs || 0} ms.`)
          if (!unaVez && !heartbeatWorker.debeDetenerse()) await espera(asignacion.esperarMs || 5000)
        }
      } catch (error) {
        if (unaVez) throw error
        console.error(`Worker temporalmente sin conexión: ${error instanceof Error ? error.message : 'error desconocido'}`)
        if (!heartbeatWorker.debeDetenerse()) await espera(5000)
      }
    } while (!unaVez && !heartbeatWorker.debeDetenerse())
  } finally {
    await heartbeatWorker.detener()
  }
}

iniciar().catch(error => {
  console.error(error instanceof Error ? error.message : 'Worker detenido.')
  process.exitCode = 1
})
