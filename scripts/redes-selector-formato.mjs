// Selector del formato visual de cada publicación de imagen (docs/PLAN_FLUJO_IMAGENES_REDES.md, secciones 1 y 2).
// Puro y sin red: recibe lo que la nota tiene y el historial, y devuelve el formato. El azar es ponderado y reproducible
// (semilla = id de la nota + fecha de Bogotá), nunca puro: un formato solo es elegible si la nota trae lo que necesita.
import { citaDeNota, cifraDeNota, puntosDeNota } from './redes-formatos.mjs'

export const PESOS_BASE = { circulo: 30, impacto: 30, banda: 20, carrusel: 15 }
export const PESOS_CONDICIONALES = { cita: 40, ficha: 30, versus: 25 }

/** Número pseudoaleatorio reproducible en [0, 1) a partir de un texto (mulberry32 sobre un hash FNV-1a). */
export function azarDesde(semilla) {
  let h = 2166136261
  for (const c of String(semilla)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  let t = (h + 0x6D2B79F5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const fechaBogota = (ms = Date.now()) => new Date(ms - 5 * 3_600_000).toISOString().slice(0, 10)

/**
 * Formatos que la nota puede usar hoy. `fotosExtra` es cuántas fotos adicionales a la portada hay (fase de fotos: hoy 0,
 * así que `circulo` y `versus` quedan fuera hasta que exista).
 * @param {any} articulo
 * @param {{ fotosExtra?: number }} [opciones]
 * @returns {string[]}
 */
export function formatosElegibles(articulo, { fotosExtra = 0 } = {}) {
  const titular = String(articulo?.tituloPortada || articulo?.titulo || '')
  const elegibles = ['impacto', 'banda'] // `impacto-desenfocado` ya no se elige: sin fondo desenfocado sería idéntico a `impacto`.
  if (fotosExtra >= 1) elegibles.push('circulo')
  if (citaDeNota(articulo)) elegibles.push('cita')
  if (cifraDeNota(`${titular} ${articulo?.resumen || ''}`)) elegibles.push('ficha')
  if (puntosDeNota(articulo).length >= 3) elegibles.push('carrusel')
  if (fotosExtra >= 1 && articulo?.versusCon) elegibles.push('versus')
  return elegibles
}

/**
 * Elige el formato. `historial` es una lista [{ formato, fecha (YYYY-MM-DD Bogotá) }] de más antigua a más reciente.
 * Reglas de variedad: no repetir el de las dos últimas piezas (si no queda otro, se repite) y, si hoy aún no hubo carrusel
 * y la nota puede serlo, su peso se triplica. No hay tope de piezas por formato ni por día (decisión del responsable, 2026-11-22).
 * @param {any} articulo
 * @param {{ historial?: { formato: string, fecha: string }[], ahora?: number, fotosExtra?: number }} [opciones]
 * @returns {string}
 */
export function elegirFormato(articulo, { historial = [], ahora = Date.now(), fotosExtra = 0 } = {}) {
  const hoy = fechaBogota(ahora)
  const recientes = historial.slice(-2).map(h => h.formato)
  const deHoy = historial.filter(h => h.fecha === hoy).map(h => h.formato)
  const todos = formatosElegibles(articulo, { fotosExtra })
  const permitidos = todos.filter(f => !recientes.includes(f))
  const candidatos = permitidos.length ? permitidos : todos
  const pesos = candidatos.map(f => {
    let peso = PESOS_CONDICIONALES[f] ?? PESOS_BASE[f] ?? 10
    if (f === 'carrusel' && !deHoy.includes('carrusel')) peso *= 3
    return peso
  })
  const total = pesos.reduce((a, b) => a + b, 0)
  let punto = azarDesde(`${articulo?.id || articulo?.slug}|${hoy}`) * total
  for (const [i, f] of candidatos.entries()) { punto -= pesos[i]; if (punto < 0) return f }
  return candidatos.at(-1)
}
