// Piloto automático de Reels, Shorts y video largo (autorizado por el responsable el 2026-11-20: Reels/Shorts y videos largos).
// Cuando todas las tomas de voz de un Reel están grabadas y pasó un margen, el estudio lo arma, lo renderiza y lo PROGRAMA
// (nunca lo publica al instante) en la primera franja libre de config/horariosPublicacion.json. El video largo se sube a YouTube
// y se programa con `publishAt`. Se apaga desde «Ver Reels».
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const ESPERA_MINUTOS = 10 // margen tras la última toma: da tiempo a corregir una toma o una foto antes del render
export const MAXIMO_INTENTOS_RENDER = 2

const ARCHIVO = 'autopiloto-reels.json'

/**
 * Qué toca hacer con un proyecto: 'render', 'programar' (Reel) o 'subir' (video largo), o null.
 * Un Reel que ya tiene un estado de publicación (programado, publicado o cancelado a mano) no se vuelve a tocar:
 * lo que Juan cancela se queda cancelado. Un video largo solo se sube si el piloto fue quien lo renderizó
 * (`renderizadoPorPiloto`) y aún no tiene un video de YouTube vinculado: nunca toca videos viejos ni subidos a mano.
 */
export function decidirAccion({ activo, tipo, tramos, grabados, ultimaTomaMs, ahora = Date.now(), tieneFinal, publicacion, ocupado, intentos = 0, youtubeId = null, renderizadoPorPiloto = false }) {
  if (!activo || !['reel', 'video'].includes(tipo) || ocupado) return null
  if (!tieneFinal) {
    if (!(tramos > 0) || grabados < tramos) return null
    if (ahora - ultimaTomaMs < ESPERA_MINUTOS * 60_000) return null
    return intentos < MAXIMO_INTENTOS_RENDER ? 'render' : null
  }
  if (tipo === 'video') return !youtubeId && renderizadoPorPiloto && intentos < MAXIMO_INTENTOS_RENDER ? 'subir' : null
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
