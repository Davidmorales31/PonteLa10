import { configuracionSitios } from '~/utils/sitio'

/**
 * Competiciones de México que cubre el sitio `mx`. Los identificadores de GOAL API
 * se verificaron contra su catálogo (país Mexico) el 2026-11-19.
 */
export const ligasMexico = [
  { slug: 'liga-mx', nombre: 'Liga MX', idGoal: 'cmr77dvsv008srx06mier6t7r', equiposEsperados: 18 },
  { slug: 'liga-mx-femenil', nombre: 'Liga MX Femenil', idGoal: 'cmr77dvsv008wrx06ukpkmk8u', equiposEsperados: 18 }
] as const

export type SlugLigaMexico = typeof ligasMexico[number]['slug']

export const slugsLigasMexico: readonly string[] = ligasMexico.map(liga => liga.slug)

export type TorneoLigaMx = 'Apertura' | 'Clausura'

function partesEnMexico(fecha: Date): { anio: number, mes: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: configuracionSitios.mx.zonaHoraria, year: 'numeric', month: '2-digit'
  }).formatToParts(fecha)
  return {
    anio: Number(partes.find(parte => parte.type === 'year')?.value),
    mes: Number(partes.find(parte => parte.type === 'month')?.value)
  }
}

/** Apertura: julio a diciembre. Clausura: enero a junio (la Liguilla va dentro de cada torneo). */
export function torneoLigaMx(fecha: Date): TorneoLigaMx {
  return partesEnMexico(fecha).mes >= 7 ? 'Apertura' : 'Clausura'
}

/** La temporada comienza en julio: el Clausura 2027 pertenece a la temporada 2026-2027. */
export function temporadaLigaMx(fecha: Date): string {
  const { anio, mes } = partesEnMexico(fecha)
  const inicio = mes >= 7 ? anio : anio - 1
  return `${inicio}-${inicio + 1}`
}

/** Instante en que empieza una temporada (1 de julio, hora de Ciudad de México, UTC−6). */
export function inicioTemporadaLigaMx(temporada: string): number {
  const inicio = Number(temporada.slice(0, 4))
  return Date.parse(`${inicio}-07-01T00:00:00-06:00`)
}
