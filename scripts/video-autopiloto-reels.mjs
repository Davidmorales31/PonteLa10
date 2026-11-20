// Piloto automático de Reels y Shorts con guion propio (autorizado por el responsable el 2026-11-20: «al menos los shorts»).
// Cuando todas las tomas de voz de un Reel están grabadas y pasó un margen, el estudio lo arma, lo renderiza y lo PROGRAMA
// (nunca lo publica al instante) en la primera franja libre de config/horariosPublicacion.json. Se apaga desde «Ver Reels».
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const ESPERA_MINUTOS = 10 // margen tras la última toma: da tiempo a corregir una toma o una foto antes del render
export const MAXIMO_INTENTOS_RENDER = 2

const ARCHIVO = 'autopiloto-reels.json'

/**
 * Qué toca hacer con un Reel: 'render', 'programar' o null.
 * Un Reel que ya tiene un estado de publicación (programado, publicado o cancelado a mano) no se vuelve a tocar:
 * lo que Juan cancela se queda cancelado.
 */
export function decidirAccion({ activo, tipo, tramos, grabados, ultimaTomaMs, ahora = Date.now(), tieneFinal, publicacion, ocupado, intentos = 0 }) {
  if (!activo || tipo !== 'reel' || ocupado) return null
  if (!tieneFinal) {
    if (!(tramos > 0) || grabados < tramos) return null
    if (ahora - ultimaTomaMs < ESPERA_MINUTOS * 60_000) return null
    return intentos < MAXIMO_INTENTOS_RENDER ? 'render' : null
  }
  return publicacion ? null : 'programar'
}

export async function leerAjustes(carpeta) {
  const ruta = join(carpeta, ARCHIVO)
  try { if (existsSync(ruta)) { const a = JSON.parse(await readFile(ruta, 'utf8')); return { activo: a.activo === true, registro: Array.isArray(a.registro) ? a.registro.slice(-30) : [] } } } catch { /* archivo dañado: apagado */ }
  return { activo: false, registro: [] }
}

export async function guardarAjustes(carpeta, ajustes) {
  await writeFile(join(carpeta, ARCHIVO), JSON.stringify({ activo: ajustes.activo === true, registro: (ajustes.registro || []).slice(-30) }, null, 2))
}

export async function anotarRegistro(carpeta, proyecto, texto) {
  const ajustes = await leerAjustes(carpeta)
  ajustes.registro.push({ en: new Date().toISOString(), proyecto, texto: String(texto).slice(0, 300) })
  await guardarAjustes(carpeta, ajustes)
}
