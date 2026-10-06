import { normalizarClaveEquipoLiga, type PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'

export interface DatosCorrespondenciaResultado {
  competencia: string
  fechaIso: string
  local: string
  visitante: string
}

export function buscarCorrespondenciaPartidoSeo(
  partidos: readonly PartidoSeoPublico[],
  resultado: DatosCorrespondenciaResultado
): PartidoSeoPublico | null {
  if (!esCompetenciaColombiana(resultado.competencia) || !Number.isFinite(Date.parse(resultado.fechaIso))) return null

  const local = normalizarClaveEquipoLiga(resultado.local)
  const visitante = normalizarClaveEquipoLiga(resultado.visitante)
  const diaPartido = fechaBogota(resultado.fechaIso)
  if (!local || !visitante || !diaPartido) return null

  return partidos
    .filter((partido) => {
      if (!esCompetenciaColombiana(partido.competencia)) return false
      return normalizarClaveEquipoLiga(partido.local) === local
        && normalizarClaveEquipoLiga(partido.visitante) === visitante
        && fechaBogota(partido.fechaIso) === diaPartido
        && Math.abs(Date.parse(partido.fechaIso) - Date.parse(resultado.fechaIso)) <= 6 * 60 * 60 * 1000
    })
    .sort((a, b) => Math.abs(Date.parse(a.fechaIso) - Date.parse(resultado.fechaIso))
      - Math.abs(Date.parse(b.fechaIso) - Date.parse(resultado.fechaIso)))[0] || null
}

function esCompetenciaColombiana(valor: string): boolean {
  const normalizado = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
  return /liga[\s-]*(betplay|dimayor)|primera\s*a|torneo[\s-]*(betplay|dimayor)|primera\s*b|copa\s*colombia/.test(normalizado)
}

function fechaBogota(valor: string): string {
  const fecha = new Date(valor)
  if (!Number.isFinite(fecha.getTime())) return ''
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(fecha)
  const componente = (tipo: string) => partes.find(parte => parte.type === tipo)?.value || ''
  return `${componente('year')}-${componente('month')}-${componente('day')}`
}
