import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import type {
  EnlaceContextualSeo,
  NavegacionContextualPartidoSeo
} from '~/types/navegacionContextualSeo'
import type { RelacionEntidadSeoPublica, TipoEntidadSeo } from '~/types/contenidoEditorial'

interface PartidoNavegableSeo {
  slug: string
  competencia: string
  fechaIso: string
  local: string
  visitante: string
  estado: string | null
  golesLocal: number | null
  golesVisitante: number | null
  equipoLocalSlug?: string
  equipoVisitanteSlug?: string
}

interface EntidadNavegableSeo {
  tipo: TipoEntidadSeo
  slug: string
  nombre: string
  ruta: string
}

export function construirNavegacionContextualPartidoSeo(
  partido: PartidoNavegableSeo,
  partidos: readonly PartidoNavegableSeo[],
  entidades: readonly EntidadNavegableSeo[]
): NavegacionContextualPartidoSeo {
  const porClave = new Map(entidades.map(entidad => [`${entidad.tipo}:${entidad.slug}`, entidad]))
  const equipoLocal = buscarEntidad(porClave, 'team', partido.equipoLocalSlug)
  const equipoVisitante = buscarEntidad(porClave, 'team', partido.equipoVisitanteSlug)
  const competencia = buscarEntidad(porClave, 'competition', partido.competencia)
  const equipos = new Set([equipoLocal?.slug, equipoVisitante?.slug].filter((slug): slug is string => Boolean(slug)))
  const fechaActual = Date.parse(partido.fechaIso)
  const partidosDelEquipo = equipos.size && Number.isFinite(fechaActual)
    ? partidos.filter((candidato) => {
        if (candidato.slug === partido.slug || !porClave.has(`match:${candidato.slug}`)) return false
        if (!Number.isFinite(Date.parse(candidato.fechaIso))) return false
        return Boolean(
          (candidato.equipoLocalSlug && equipos.has(candidato.equipoLocalSlug))
          || (candidato.equipoVisitanteSlug && equipos.has(candidato.equipoVisitanteSlug))
        )
      })
    : []

  const siguiente = partidosDelEquipo
    .filter(candidato => Date.parse(candidato.fechaIso) > fechaActual
      && ['PROGRAMADO', 'EN VIVO'].includes(etiquetaEstadoSeoPartido(candidato.estado)))
    .sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))[0]
  const anterior = partidosDelEquipo
    .filter(candidato => Date.parse(candidato.fechaIso) < fechaActual
      && etiquetaEstadoSeoPartido(candidato.estado) === 'FINALIZADO'
      && candidato.golesLocal !== null && candidato.golesVisitante !== null)
    .sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))[0]

  return {
    equipoLocal: convertirEnlace(equipoLocal),
    equipoVisitante: convertirEnlace(equipoVisitante),
    competencia: convertirEnlace(competencia),
    siguientePartido: siguiente
      ? {
          nombre: `${siguiente.local} vs. ${siguiente.visitante}`,
          ruta: `/partidos/${siguiente.slug}`,
          fechaIso: siguiente.fechaIso,
          detalle: siguiente.competencia
        }
      : null,
    resultadoAnterior: anterior
      ? {
          nombre: `${anterior.local} ${anterior.golesLocal}–${anterior.golesVisitante} ${anterior.visitante}`,
          ruta: `/como-quedo/${anterior.slug}`,
          fechaIso: anterior.fechaIso,
          detalle: 'Resultado anterior'
        }
      : null
  }
}

export function seleccionarProximoPartidoArticuloSeo(
  relaciones: readonly RelacionEntidadSeoPublica[],
  partidos: readonly PartidoNavegableSeo[],
  entidades: readonly EntidadNavegableSeo[],
  ahoraMs = Date.now()
): EnlaceContextualSeo | null {
  const principal = relaciones.find(relacion => relacion.relacion === 'about')
  if (!principal) return null

  const claves = new Set(entidades.map(entidad => `${entidad.tipo}:${entidad.slug}`))
  let slugsEquipo = new Set<string>()
  let competencia: string | null = null

  if (principal.tipo === 'team' && claves.has(`team:${principal.slug}`)) {
    slugsEquipo = new Set([principal.slug])
  } else if (principal.tipo === 'competition' && claves.has(`competition:${principal.slug}`)) {
    competencia = principal.slug
  } else if (principal.tipo === 'match' && claves.has(`match:${principal.slug}`)) {
    const partidoPrincipal = partidos.find(partido => partido.slug === principal.slug)
    slugsEquipo = new Set([
      partidoPrincipal?.equipoLocalSlug,
      partidoPrincipal?.equipoVisitanteSlug
    ].filter((slug): slug is string => Boolean(slug && claves.has(`team:${slug}`))))
  }

  const proximo = partidos
    .filter((partido) => {
      if (!claves.has(`match:${partido.slug}`)) return false
      const fecha = Date.parse(partido.fechaIso)
      if (!Number.isFinite(fecha) || fecha <= ahoraMs
        || etiquetaEstadoSeoPartido(partido.estado) !== 'PROGRAMADO') return false
      if (competencia) return partido.competencia === competencia
      return Boolean(
        (partido.equipoLocalSlug && slugsEquipo.has(partido.equipoLocalSlug))
        || (partido.equipoVisitanteSlug && slugsEquipo.has(partido.equipoVisitanteSlug))
      )
    })
    .sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))[0]

  return proximo
    ? {
        nombre: `${proximo.local} vs. ${proximo.visitante}`,
        ruta: `/partidos/${proximo.slug}`,
        fechaIso: proximo.fechaIso,
        detalle: proximo.competencia
      }
    : null
}

function buscarEntidad(
  entidades: Map<string, EntidadNavegableSeo>,
  tipo: TipoEntidadSeo,
  slug?: string
): EntidadNavegableSeo | undefined {
  return slug ? entidades.get(`${tipo}:${slug}`) : undefined
}

function convertirEnlace(entidad?: EntidadNavegableSeo): EnlaceContextualSeo | null {
  return entidad ? { nombre: entidad.nombre, ruta: entidad.ruta } : null
}
