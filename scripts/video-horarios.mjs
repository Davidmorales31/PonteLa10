// Horas propuestas para programar Reels y Shorts, según la regla de config/horariosPublicacion.json.
// Todo se calcula en hora de Bogotá (UTC-5, sin horario de verano) y se devuelve en ISO UTC.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REGLA = JSON.parse(readFileSync(fileURLToPath(new URL('../config/horariosPublicacion.json', import.meta.url)), 'utf8'))
const HORA = 3_600_000

const minutosDe = hhmm => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m }

/**
 * Franjas y días permitidos de un tipo de publicación. Un video largo usa las de su edición (`franjasPorEdicion`:
 * latam, internacional o documental) y, si no tiene entrada (la edición de Colombia, por ejemplo), las del video largo.
 * `dias` son días de la semana (0 = domingo … 5 = viernes) en hora de Bogotá; null = todos.
 */
export function franjasDe(regla, tipo, edicion) {
  if (tipo !== 'video') return { franjas: regla.franjas, dias: null }
  const propia = regla.franjasPorEdicion?.[String(edicion || '').toLowerCase()]
  if (Array.isArray(propia) && propia.length) return { franjas: propia, dias: null }
  if (propia?.franjas?.length) return { franjas: propia.franjas, dias: propia.diasSemana?.length ? propia.diasSemana : null }
  return { franjas: regla.franjasVideoLargo?.length ? regla.franjasVideoLargo : regla.franjas, dias: null }
}

/**
 * Las próximas `cantidad` horas libres. `ocupadas` son fechas ya programadas (ISO o ms): se respeta la separación mínima.
 * No hay tope por día (lo pidió el responsable: «lo que salga»); solo lo limitan las franjas. `tipo: 'video'` usa las del
 * video largo, y con `edicion` ('latam', 'internacional' o 'documental') las franjas propias de esa edición.
 */
export function proponerHoras({ ahora = Date.now(), cantidad = 1, ocupadas = [], regla = REGLA, tipo = 'reel', edicion } = {}) {
  const { desfaseUtcHoras: desfase, reglas } = regla
  const { franjas, dias } = franjasDe(regla, tipo, edicion)
  const desde = minutosDe(reglas.prohibidoDesde)
  const hasta = minutosDe(reglas.prohibidoHasta)
  const separacion = reglas.separacionMinimaHoras * HORA
  const tomadas = ocupadas.map(f => (typeof f === 'number' ? f : Date.parse(f))).filter(Number.isFinite)
  const dia = ms => Math.floor((ms + desfase * HORA) / (24 * HORA))
  const resultado = []
  const primerDia = dia(ahora)
  for (let d = primerDia; d < primerDia + 14 && resultado.length < cantidad; d++) {
    // El 1 de enero de 1970 fue jueves: el día de la semana de un número de día es (d + 4) % 7.
    if (dias && !dias.includes((d + 4) % 7)) continue
    for (const { hora } of franjas) {
      if (resultado.length >= cantidad) break
      const minutos = minutosDe(hora)
      if (minutos >= desde || minutos < hasta) continue
      const instante = d * 24 * HORA + minutos * 60_000 - desfase * HORA
      if (instante < ahora + reglas.minutosMinimos * 60_000) continue
      if (tomadas.some(t => Math.abs(t - instante) < separacion)) continue
      tomadas.push(instante)
      resultado.push(new Date(instante).toISOString())
    }
    // Decisión del responsable (2026-11-22): todos los Reels de un video salen el MISMO día, sin importar cuántos sean.
    // Si las franjas del día ya no alcanzan, se llena el resto de ese día (cada media hora, con separación corta) antes de
    // pasar al siguiente. Solo aplica a Reels y Shorts; el video largo conserva sus dos franjas.
    if (tipo !== 'video' && reglas.relleno) {
      const { primera, ultima, separacionMinutos } = reglas.relleno
      for (let minutos = minutosDe(primera); minutos <= minutosDe(ultima) && resultado.length < cantidad; minutos += 30) {
        if (minutos >= desde || minutos < hasta) continue
        const instante = d * 24 * HORA + minutos * 60_000 - desfase * HORA
        if (instante < ahora + reglas.minutosMinimos * 60_000) continue
        if (tomadas.some(t => Math.abs(t - instante) < separacionMinutos * 60_000)) continue
        tomadas.push(instante)
        resultado.push(new Date(instante).toISOString())
      }
    }
  }
  return resultado.sort((a, b) => Date.parse(a) - Date.parse(b))
}

export const horariosPublicacion = REGLA
