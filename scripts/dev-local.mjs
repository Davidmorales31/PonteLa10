import { spawn } from 'node:child_process'
import { setTimeout as esperar } from 'node:timers/promises'
import process from 'node:process'

const origenDatos = (process.env.NUXT_PUBLIC_API_ORIGIN || 'https://www.pont3la10.com').replace(/\/+$/, '')
const puerto = process.env.PONT3LA10_LOCAL_PORT || '3333'
const origenLocal = `http://127.0.0.1:${puerto}`
const procesoNuxt = process.execPath
const cliNuxt = 'node_modules/nuxt/bin/nuxt.mjs'
const entornoLocal = {
  ...process.env,
  NUXT_PUBLIC_API_ORIGIN: origenDatos,
  NUXT_PUBLIC_SITE_URL: origenLocal,
  PONT3LA10_FUTBOL_WORKER_ENABLED: 'true',
  PONT3LA10_CODEX_API_BASE_URL: origenLocal
}

let detener = false
let codigoSalida = 0
let trabajador
const servidor = spawn(procesoNuxt, [cliNuxt, 'dev', '--host', '127.0.0.1', '--port', puerto], {
  cwd: process.cwd(),
  env: entornoLocal,
  stdio: 'inherit'
})

function detenerProcesos(codigo = 0) {
  if (detener) return
  detener = true
  codigoSalida = codigo
  if (trabajador && trabajador.exitCode === null) trabajador.kill('SIGINT')
  if (servidor.exitCode === null) servidor.kill('SIGINT')
}

process.once('SIGINT', () => detenerProcesos(0))
process.once('SIGTERM', () => detenerProcesos(0))

servidor.once('error', error => {
  console.error(`No se pudo iniciar Nuxt: ${error.message}`)
  detenerProcesos(1)
})
servidor.once('exit', (codigo, senal) => {
  if (!detener) {
    const codigoFinal = Number.isInteger(codigo) ? codigo : (senal ? 1 : 0)
    console.info('Nuxt se detuvo; cerrando el worker local.')
    detenerProcesos(codigoFinal)
  }
})

console.info(`Iniciando Pont3la10 en ${origenLocal}; datos públicos desde ${origenDatos}.`)
const servidorListo = await esperarNuxt(servidor, origenLocal)

if (!detener && servidorListo && process.env.NUXT_FUTBOL_WORKER_API_SECRET?.trim()) {
  trabajador = spawn(procesoNuxt, ['--env-file-if-exists=.env', 'workers/ejecutar_futbol_local.mjs'], {
    cwd: process.cwd(),
    env: entornoLocal,
    stdio: 'inherit'
  })
  trabajador.once('error', error => console.warn(`No se pudo iniciar el worker de fútbol: ${error.message}`))
  trabajador.once('exit', codigo => {
    if (!detener && codigo !== 0) console.warn(`El worker de fútbol se detuvo (código ${codigo ?? 'desconocido'}); Nuxt seguirá disponible.`)
  })
  console.info('Worker local de fútbol iniciado.')
} else if (!detener && servidorListo) {
  console.warn('Nuxt está disponible; el worker se omitió porque falta su secreto en la configuración local.')
}

if (!detener && servidorListo) {
  await new Promise(resolve => servidor.once('exit', resolve))
}

if (!detener && !servidorListo) detenerProcesos(1)
process.exitCode = codigoSalida

async function esperarNuxt(proceso, origen) {
  const limite = Date.now() + 600_000
  while (!detener && proceso.exitCode === null && Date.now() < limite) {
    try {
      if (await comprobarRespuestaHttp(origen)) {
        console.info(`Nuxt respondió HTTP 200 en ${origen}. Presiona Ctrl+C para detener Nuxt y el worker.`)
        return true
      }
    } catch {
      // Nuxt puede tardar mientras prepara el primer render de desarrollo.
    }
    await esperar(1000)
  }
  if (!detener) console.error('Nuxt no respondió en 10 minutos; revisa el error del servidor.')
  return false
}

async function comprobarRespuestaHttp(origen) {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), 1500)
  try {
    const respuesta = await fetch(new URL('/brand/pont3la10_logo_05_app_icon_favicon.png', origen), {
      signal: controlador.signal,
      cache: 'no-store'
    })
    const estado = respuesta.status
    await respuesta.body?.cancel()
    return estado === 200
  } catch {
    return false
  } finally {
    clearTimeout(temporizador)
  }
}
