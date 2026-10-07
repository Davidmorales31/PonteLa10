const anchosEscudosPublicos = [48, 96, 192, 384] as const
const rutaEscudoLigaColombiana = /^\/images\/escudos\/liga-colombiana\/([a-z0-9-]+)\.png$/

export function obtenerSrcsetEscudoPublico(ruta: string | null | undefined): string | undefined {
  if (!ruta) return undefined
  const coincidencia = rutaEscudoLigaColombiana.exec(ruta)
  if (!coincidencia) return undefined

  const slug = coincidencia[1]
  return anchosEscudosPublicos
    .map(ancho => `/images/escudos/liga-colombiana/${slug}-${ancho}.webp ${ancho}w`)
    .join(', ')
}
