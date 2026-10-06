import { crearSincronizadorFutbolLocal } from './sincronizar_futbol_local.mjs'

if (process.env.PONT3LA10_FUTBOL_WORKER_ENABLED !== 'true') {
  throw new Error('El worker local de fútbol no está habilitado en este entorno.')
}
if (!process.env.NUXT_FUTBOL_WORKER_API_SECRET) {
  throw new Error('Falta configurar el secreto del worker local de fútbol.')
}

const intervaloMs = 5_000
let cicloActivo = false
let detenido = false
const sincronizador = crearSincronizadorFutbolLocal({ debeDetener: () => detenido })

async function ejecutarCiclo() {
  if (cicloActivo || detenido) return
  cicloActivo = true
  try {
    await sincronizador.ejecutarSiCorresponde()
  } catch {
    // No registrar cuerpos de respuesta ni valores de entorno en logs persistentes.
    console.warn('El ciclo del worker local de fútbol falló; se aplicará el backoff configurado.')
  } finally {
    cicloActivo = false
  }
}

const temporizador = setInterval(() => { void ejecutarCiclo() }, intervaloMs)
process.once('SIGINT', detener)
process.once('SIGTERM', detener)
console.info('Worker local de fútbol iniciado; sondeará su agenda sin exceder los intervalos mínimos.')
void ejecutarCiclo()

function detener() {
  if (detenido) return
  detenido = true
  clearInterval(temporizador)
  console.info('Worker local de fútbol: se esperará únicamente la ruta actual antes de detenerse.')
  process.exitCode = 0
}
