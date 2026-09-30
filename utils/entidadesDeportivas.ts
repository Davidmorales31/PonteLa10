import type { PartidoResultado } from '~/types/resultados'
import type {
  MapeoProveedorDeportivo,
  ProveedorDeportivo,
  TipoEntidadDeportiva
} from '~/types/entidadesDeportivas'

export type ResolverIdentidadDeportiva = (
  proveedor: ProveedorDeportivo,
  tipoEntidad: TipoEntidadDeportiva,
  idExterno: string | null | undefined
) => string | undefined

export function crearResolverIdentidadDeportiva(
  mapeos: readonly MapeoProveedorDeportivo[]
): ResolverIdentidadDeportiva {
  const identidades = new Map<string, string>()

  for (const mapeo of mapeos) {
    if (!mapeo.idExterno || !mapeo.idInterno) continue
    identidades.set(crearClave(mapeo.proveedor, mapeo.tipoEntidad, mapeo.idExterno), mapeo.idInterno)
  }

  return (proveedor, tipoEntidad, idExterno) => {
    if (!idExterno) return undefined
    return identidades.get(crearClave(proveedor, tipoEntidad, idExterno))
  }
}

export function aplicarIdentidadesInternasPartido(
  partido: PartidoResultado,
  resolver: ResolverIdentidadDeportiva | undefined,
  proveedor: ProveedorDeportivo,
  identificadoresExternos: {
    competencia?: string | null
    equipoLocal?: string | null
    equipoVisitante?: string | null
  }
): PartidoResultado {
  if (!resolver) return partido

  const competenciaIdInterno = resolver(proveedor, 'competition', identificadoresExternos.competencia)
  const equipoLocalIdInterno = resolver(proveedor, 'team', identificadoresExternos.equipoLocal)
  const equipoVisitanteIdInterno = resolver(proveedor, 'team', identificadoresExternos.equipoVisitante)

  return {
    ...partido,
    ...(competenciaIdInterno ? { competenciaIdInterno } : {}),
    equipoLocal: {
      ...partido.equipoLocal,
      ...(equipoLocalIdInterno ? { idInterno: equipoLocalIdInterno } : {})
    },
    equipoVisitante: {
      ...partido.equipoVisitante,
      ...(equipoVisitanteIdInterno ? { idInterno: equipoVisitanteIdInterno } : {})
    }
  }
}

function crearClave(
  proveedor: ProveedorDeportivo,
  tipoEntidad: TipoEntidadDeportiva,
  idExterno: string
): string {
  return JSON.stringify([proveedor, tipoEntidad, idExterno])
}
