// Horas propuestas para programar Reels y Shorts, según la regla de config/horariosPublicacion.json.
// Todo se calcula en hora de Bogotá (UTC-5, sin horario de verano) y se devuelve en ISO UTC.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REGLA = JSON.parse(readFileSync(fileURLToPath(new URL('../config/horariosPublicacion.json', import.meta.url)), 'utf8'))
const HORA = 3_600_000

const minutosDe = hhmm => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m }

/**
 * Las próximas `cantidad` horas libres. `ocupadas` son fechas ya programadas (ISO o ms): se respeta la separación mínima
 * y el máximo por día contando también esas.
 */
export function proponerHoras({ ahora = Date.now(), cantidad = 1, ocupadas = [], regla = REGLA } = {}) {
  const { desfaseUtcHoras: desfase, franjas, reglas } = regla
  const desde = minutosDe(reglas.prohibidoDesde)
  const hasta = minutosDe(reglas.prohibidoHasta)
  const separacion = reglas.separacionMinimaHoras * HORA
  const tomadas = ocupadas.map(f => (typeof f === 'number' ? f : Date.parse(f))).filter(Number.isFinite)
  const dia = ms => Math.floor((ms + desfase * HORA) / (24 * HORA))
  const resultado = []
  const primerDia = dia(ahora)
  for (let d = primerDia; d < primerDia + 14 && resultado.length < cantidad; d++) {
    for (const { hora } of franjas) {
      if (resultado.length >= cantidad) break
      const minutos = minutosDe(hora)
      if (minutos >= desde || minutos < hasta) continue
      const instante = d * 24 * HORA + minutos * 60_000 - desfase * HORA
      if (instante < ahora + reglas.minutosMinimos * 60_000) continue
      if (tomadas.filter(t => dia(t) === d).length >= reglas.maximoPorDia) continue
      if (tomadas.some(t => Math.abs(t - instante) < separacion)) continue
      tomadas.push(instante)
      resultado.push(new Date(instante).toISOString())
    }
  }
  return resultado
}

export const horariosPublicacion = REGLA
