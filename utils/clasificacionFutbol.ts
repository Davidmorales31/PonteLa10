export type CategoriaFutbol = 'colombia' | 'europa' | 'cinco-grandes' | 'otros'

const ligasTopCinco: Record<string, string[]> = {
  england: ['premier league'],
  spain: ['la liga', 'laliga', 'primera division'],
  italy: ['serie a'],
  germany: ['bundesliga'],
  france: ['ligue 1']
}

const competicionesEuropeasClave = [
  'uefa champions league', 'champions league', 'uefa europa league', 'europa league',
  'uefa conference league', 'conference league', 'uefa nations league', 'nations league',
  'european championship', 'uefa european championship', 'euro cup', 'uefa super cup'
]

const torneosSelecciones = [
  'world cup', 'copa america', 'friendly', 'friendlies', 'qualifier', 'qualification', 'qualifying',
  'international friendly', 'world cup qualification', 'olympic', 'olympics'
]

export function clasificarCategoriaFutbol(entrada: {
  competencia: string
  paisCompetencia?: string | null
  equipoLocal?: string | null
  equipoVisitante?: string | null
  paisEquipoLocal?: string | null
  paisEquipoVisitante?: string | null
}): CategoriaFutbol {
  const nombre = normalizarTextoFutbol(entrada.competencia)
  const pais = normalizarTextoFutbol(entrada.paisCompetencia || '')
  const equipos = [entrada.equipoLocal || '', entrada.equipoVisitante || ''].map(normalizarTextoFutbol)
  const paisesEquipos = [entrada.paisEquipoLocal || '', entrada.paisEquipoVisitante || ''].map(normalizarTextoFutbol)
  const haySeleccionColombia = equipos.some(esSeleccionColombia) || paisesEquipos.some((paisEquipo, indice) =>
    paisEquipo.includes('colombia') && esNombreSeleccion(equipos[indice] || '')
  )
  const esLigaColombiana = pais.includes('colombia')
    || /\b(liga betplay|primera a|primera b|copa colombia|superliga colombiana)\b/.test(nombre)

  if (esLigaColombiana || (haySeleccionColombia && torneosSelecciones.some(torneo => nombre.includes(torneo)))) {
    return 'colombia'
  }
  if (competicionesEuropeasClave.some(competicion => nombre.includes(competicion))) return 'europa'
  if (ligasTopCinco[pais]?.some(liga => nombre.includes(liga))) return 'cinco-grandes'
  return 'otros'
}

export function normalizarTextoFutbol(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function esSeleccionColombia(nombre: string): boolean {
  return nombre === 'colombia' || nombre === 'seleccion colombia' || nombre === 'seleccion de colombia'
    || /^seleccion (de )?colombia (femenina|femenino|women|sub ?\d+|u ?\d+)\b/.test(nombre)
    || /^colombia (u ?\d+|sub ?\d+|femenina|femenino|women|olimpica|olimpico)\b/.test(nombre)
}

function esNombreSeleccion(nombre: string): boolean {
  return esSeleccionColombia(nombre) || nombre.startsWith('seleccion ')
}
