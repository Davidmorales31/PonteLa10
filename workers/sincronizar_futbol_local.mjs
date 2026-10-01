import { createHmac, randomUUID } from 'node:crypto'

const rutas = [
  { nombre: 'fixtures', ruta: '/api/internal/futbol/fixtures' },
  { nombre: 'clasificaciones', ruta: '/api/internal/futbol/clasificaciones' }
]
const intervaloPredeterminadoMs = 60 * 60 * 1000
const intervaloMinimoMs = 15 * 60 * 1000
const intervaloMaximoMs = 24 * 60 * 60 * 1000

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
        try {
          const resultado = await solicitar(endpoint.ruta, secreto, baseUrl, transporte, ahora)
          const resumen = resumir(resultado)
          resultados.push({ nombre: endpoint.nombre, ...resumen })
          registrar(`Fútbol local ${endpoint.nombre}: ${JSON.stringify(resumen)}`)
        } catch (error) {
          const estadoHttp = Number.isInteger(error?.estadoHttp) ? error.estadoHttp : null
          const resumen = { estado: 'fallido', estadoHttp }
          resultados.push({ nombre: endpoint.nombre, ...resumen })
          avisar(`Sincronización local de fútbol ${endpoint.nombre} fallida${estadoHttp ? ` (HTTP ${estadoHttp})` : ''}.`)
        }
      }

      return { estado: resultados.some(resultado => resultado.estado === 'fallido') ? 'parcial' : 'completado', resultados }
    }
  }
}

async function solicitar(ruta, secreto, baseUrl, transporte, ahora) {
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
      signal: AbortSignal.timeout(180_000)
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
    'detallesActualizados', 'clasificacionesRecibidas', 'clasificacionesGuardadas', 'errorCode']
  return Object.fromEntries(campos.flatMap(campo => {
    const valor = resultado[campo]
    return typeof valor === 'string' || (typeof valor === 'number' && Number.isFinite(valor))
      ? [[campo, valor]]
      : []
  }))
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
