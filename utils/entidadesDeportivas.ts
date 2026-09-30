import type { PartidoResultado } from '~/types/resultados'
import type {
  MapeoProveedorDeportivo,
  ProveedorDeportivo,
  TipoEntidadDeportiva
} from '~/types/entidadesDeportivas'

export type ResolverIdentidadDeportiva = ((
  proveedor: ProveedorDeportivo,
  tipoEntidad: TipoEntidadDeportiva,
  idExterno: string | null | undefined
) => string | undefined) & {
  slugInterno?: (
    proveedor: ProveedorDeportivo,
    tipoEntidad: TipoEntidadDeportiva,
    idExterno: string | null | undefined
  ) => string | undefined
}

export function crearResolverIdentidadDeportiva(
  mapeos: readonly MapeoProveedorDeportivo[]
): ResolverIdentidadDeportiva {
  const identidades = new Map<string, string>()
  const slugs = new Map<string, string>()

  for (const mapeo of mapeos) {
    if (!mapeo.idExterno || !mapeo.idInterno) continue
    const clave = crearClave(mapeo.proveedor, mapeo.tipoEntidad, mapeo.idExterno)
    identidades.set(clave, mapeo.idInterno)
    if (mapeo.slugInterno) slugs.set(clave, mapeo.slugInterno)
  }

  const resolver = ((proveedor, tipoEntidad, idExterno) => {
    if (!idExterno) return undefined
    return identidades.get(crearClave(proveedor, tipoEntidad, idExterno))
  }) as ResolverIdentidadDeportiva
  resolver.slugInterno = (proveedor, tipoEntidad, idExterno) => {
    if (!idExterno) return undefined
    return slugs.get(crearClave(proveedor, tipoEntidad, idExterno))
  }

  return resolver
}

export function aplicarIdentidadesInternasPartido(
  partido: PartidoResultado,
  resolver: ResolverIdentidadDeportiva | undefined,
  proveedor: ProveedorDeportivo,
  identificadoresExternos: {
    partido?: string | null
    competencia?: string | null
    equipoLocal?: string | null
    equipoVisitante?: string | null
  }
): PartidoResultado {
  if (!resolver) return partido

  const competenciaIdInterno = resolver(proveedor, 'competition', identificadoresExternos.competencia)
  const equipoLocalIdInterno = resolver(proveedor, 'team', identificadoresExternos.equipoLocal)
  const equipoVisitanteIdInterno = resolver(proveedor, 'team', identificadoresExternos.equipoVisitante)
  const partidoIdInterno = resolver(proveedor, 'fixture', identificadoresExternos.partido)
  const partidoSlugInterno = resolver.slugInterno?.(proveedor, 'fixture', identificadoresExternos.partido)

  return {
    ...partido,
    ...(partidoIdInterno ? { idInterno: partidoIdInterno } : {}),
    ...(partidoSlugInterno ? { slugInterno: partidoSlugInterno } : {}),
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
