import { createHmac, randomUUID } from 'node:crypto'

const rutas = [
  { nombre: 'calendario', ruta: '/api/internal/futbol/calendario', timeoutMs: 20 * 60 * 1000, esperaFalloMs: 30 * 60 * 1000 },
  { nombre: 'fixtures', ruta: '/api/internal/futbol/fixtures' }
]
const intervaloPredeterminadoMs = 5 * 60 * 1000
const intervaloMinimoMs = 5 * 60 * 1000
const intervaloMaximoMs = 24 * 60 * 60 * 1000
const esperaBaseFalloMs = 5 * 60 * 1000
const esperaMaximaFalloMs = 60 * 60 * 1000

/** Programa la sincronización de fútbol dentro del worker local existente. */
export function crearSincronizadorFutbolLocal({
  entorno = process.env,
  transporte = globalThis.fetch,
  ahora = () => Date.now(),
  registrar = console.log,
  avisar = console.warn
} = {}) {
  const habilitado = entorno.PONT3LA10_FUTBOL_WORKER_ENABLED === 'true'
  const intervaloMs = leerIntervalo(entorno.PONT3LA10_FUTBOL_SYNC_INTERVAL_MS)
  const secreto = entorno.NUXT_FUTBOL_WORKER_API_SECRET || ''
  const baseUrl = leerUrlLocal(entorno.PONT3LA10_CODEX_API_BASE_URL || 'http://127.0.0.1:3001')
  let proximaEjecucion = 0
  const proximasEjecuciones = new Map(rutas.map(ruta => [ruta.nombre, 0]))
  const fallosPorRuta = new Map(rutas.map(ruta => [ruta.nombre, 0]))

  return {
    async ejecutarSiCorresponde() {
      if (!habilitado) return { estado: 'deshabilitado' }
      if (ahora() < proximaEjecucion) return { estado: 'esperando' }

      // Fijar el siguiente turno antes del primer await evita reintentos cada 5 s
      // si la API local está detenida o no se encuentra disponible.
      proximaEjecucion = ahora() + intervaloMs
      if (!secreto) {
        avisar('Sincronización local de fútbol omitida: falta configurar el secreto del worker.')
        return { estado: 'no_configurado' }
      }
      if (!baseUrl) {
        avisar('Sincronización local de fútbol omitida: la URL del servidor no es local o no es válida.')
        return { estado: 'no_configurado' }
      }

      const resultados = []
      for (const endpoint of rutas) {
        if (ahora() < (proximasEjecuciones.get(endpoint.nombre) || 0)) continue
        try {
          const resultado = await solicitar(endpoint.ruta, secreto, baseUrl, transporte, ahora, endpoint.timeoutMs)
          const resumen = resumir(resultado)
          const fallos = resumen.estado === 'fallido'
            ? (fallosPorRuta.get(endpoint.nombre) || 0) + 1
            : 0
          fallosPorRuta.set(endpoint.nombre, fallos)
          const esperaSugerida = leerEsperaSugerida(
            resultado, intervaloMs, ahora(), fallos, endpoint.esperaFalloMs || esperaBaseFalloMs
          )
          proximasEjecuciones.set(endpoint.nombre, ahora() + esperaSugerida)
          resultados.push({ nombre: endpoint.nombre, ...resumen })
          registrar(`Fútbol local ${endpoint.nombre}: ${JSON.stringify(resumen)}`)
        } catch (error) {
          const fallos = (fallosPorRuta.get(endpoint.nombre) || 0) + 1
          fallosPorRuta.set(endpoint.nombre, fallos)
          const esperaFallo = endpoint.esperaFalloMs || Math.min(intervaloMs, 5 * intervaloMinimoMs)
          proximasEjecuciones.set(endpoint.nombre, ahora() + esperaFallo)
          const estadoHttp = Number.isInteger(error?.estadoHttp) ? error.estadoHttp : null
          const resumen = { estado: 'fallido', estadoHttp }
          resultados.push({ nombre: endpoint.nombre, ...resumen })
          avisar(`Sincronización local de fútbol ${endpoint.nombre} fallida${estadoHttp ? ` (HTTP ${estadoHttp})` : ''}.`)
        }
      }

      proximaEjecucion = Math.min(...[...proximasEjecuciones.values()].filter(fecha => fecha > 0))

      return { estado: resultados.some(resultado => resultado.estado === 'fallido') ? 'parcial' : 'completado', resultados }
    }
  }
}

async function solicitar(ruta, secreto, baseUrl, transporte, ahora, timeoutMs = 180_000) {
  if (typeof transporte !== 'function') throw new Error('TRANSPORTE_NO_DISPONIBLE')
  const cuerpo = '{}'
  const timestamp = String(Math.floor(ahora() / 1000))
  const requestId = randomUUID()
  const metodo = 'POST'
  const firma = createHmac('sha256', secreto)
    .update(`${timestamp}.${metodo}.${ruta}.${requestId}.`)
    .update(cuerpo)
    .digest('hex')

  let respuesta
  try {
    respuesta = await transporte(new URL(ruta, baseUrl), {
      method: metodo,
      headers: {
        'content-type': 'application/json',
        'x-pont3la10-request-id': requestId,
        'x-pont3la10-timestamp': timestamp,
        'x-pont3la10-signature': firma
      },
      body: cuerpo,
      signal: AbortSignal.timeout(timeoutMs)
    })
  } catch {
    const error = new Error('SERVIDOR_LOCAL_NO_DISPONIBLE')
    throw error
  }

  if (!respuesta.ok) {
    const error = new Error('ENDPOINT_LOCAL_FUTBOL_FALLIDO')
    error.estadoHttp = respuesta.status
    throw error
  }

  try {
    return await respuesta.json()
  } catch {
    throw new Error('RESPUESTA_LOCAL_INVALIDA')
  }
}

function resumir(resultado) {
  if (!resultado || typeof resultado !== 'object' || Array.isArray(resultado)) {
    return { estado: 'respuesta_invalida' }
  }
  const campos = ['estado', 'provider', 'solicitudes', 'fixturesRecibidos', 'fixturesGuardados',
    'detallesActualizados', 'siguienteEjecucionMs', 'siguienteEjecucionMotivo', 'omitidos',
    'clasificacionesRecibidas', 'clasificacionesGuardadas', 'errorCode']
  const resumen = Object.fromEntries(campos.flatMap(campo => {
    const valor = resultado[campo]
    return typeof valor === 'string' || (typeof valor === 'number' && Number.isFinite(valor))
      ? [[campo, valor]]
      : []
  }))
  const omitidos = resumirOmitidos(resultado.omitidos)
  if (omitidos) resumen.omitidos = omitidos
  return resumen
}

function resumirOmitidos(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null
  const entradas = Object.entries(valor)
    .filter(([motivo, cantidad]) => /^[a-z_]{1,48}$/.test(motivo)
      && Number.isInteger(cantidad) && cantidad >= 0)
    .slice(0, 8)
  return entradas.length ? Object.fromEntries(entradas) : null
}

function leerUrlLocal(valor) {
  try {
    const url = new URL(valor)
    const hostLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
    if (!hostLocal || !['http:', 'https:'].includes(url.protocol)
      || url.username || url.password || url.search || url.hash) return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function leerIntervalo(valor) {
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero <= 0) return intervaloPredeterminadoMs
  return Math.min(intervaloMaximoMs, Math.max(intervaloMinimoMs, Math.trunc(numero)))
}

function leerEsperaSugerida(
  resultado,
  intervaloPredeterminado,
  ahoraMs = Date.now(),
  fallosConsecutivos = 0,
  esperaBaseFallo = esperaBaseFalloMs
) {
  if (!resultado || typeof resultado !== 'object' || Array.isArray(resultado)) return intervaloPredeterminado
  if (resultado.estado === 'sin_cuota') return esperaHastaMantenimientoBogota(ahoraMs)

  const sugerido = Number.isFinite(resultado.siguienteEjecucionMs) && resultado.siguienteEjecucionMs > 0
    ? Math.trunc(resultado.siguienteEjecucionMs)
    : intervaloPredeterminado
  if (resultado.estado === 'ocupado') return Math.min(intervaloMaximoMs, Math.max(intervaloMinimoMs, sugerido))
  if (resultado.estado === 'fallido') {
    const nivel = Math.min(4, Math.max(0, fallosConsecutivos - 1))
    const esperaPorFallo = Math.min(esperaMaximaFalloMs, esperaBaseFallo * (2 ** nivel))
    return Math.min(intervaloMaximoMs, Math.max(intervaloMinimoMs, sugerido, esperaPorFallo))
  }
  return Math.min(intervaloMaximoMs, Math.max(intervaloMinimoMs, sugerido))
}

function esperaHastaMantenimientoBogota(ahoraMs) {
  const fechaBogota = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(ahoraMs))
  let proximoMantenimiento = Date.parse(`${fechaBogota}T05:05:00.000Z`)
  if (!Number.isFinite(proximoMantenimiento)) return intervaloPredeterminadoMs
  if (proximoMantenimiento <= ahoraMs) proximoMantenimiento += 24 * 60 * 60 * 1000
  return Math.min(intervaloMaximoMs, Math.max(intervaloMinimoMs, proximoMantenimiento - ahoraMs))
}
