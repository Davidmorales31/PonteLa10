import type { PartidoResultado } from '~/types/resultados'

const expresionSlugPartido = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function esSlugCanonicoPartidoSeguro(slug: string): boolean {
  return slug.length >= 1 && slug.length <= 180 && expresionSlugPartido.test(slug)
}

export function construirRutaPartido(partido: Pick<PartidoResultado, 'id' | 'slugInterno'>): string {
  if (partido.slugInterno && esSlugCanonicoPartidoSeguro(partido.slugInterno)) {
    return `/partidos/${partido.slugInterno}`
  }

  return `/resultados/${encodeURIComponent(partido.id)}`
}

export function construirRutaCanonicaDetallePartido(
  partido: Pick<PartidoResultado, 'id' | 'slugInterno'>
): string {
  return construirRutaPartido(partido)
}

export function construirEndpointDetallePartido(parametroRuta: string, esRutaCanonica = false): string {
  if (esRutaCanonica && esSlugCanonicoPartidoSeguro(parametroRuta)) {
    return `/api/partidos/${encodeURIComponent(parametroRuta)}`
  }

  return `/api/resultados/${encodeURIComponent(parametroRuta)}`
}
