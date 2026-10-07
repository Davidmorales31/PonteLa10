import { anchosVariantesImagenEditorial } from '~/utils/media/variantesEditoriales'

const prefijoMediosEditoriales = '/storage/v1/object/public/editorial-media/'

export function obtenerSrcsetMedioEditorial(
  urlImagen: string,
  urlSupabase: string,
  anchoOriginal: number | null | undefined
): string | undefined {
  if (!Number.isSafeInteger(anchoOriginal) || !anchoOriginal || anchoOriginal < 1 || anchoOriginal > 2500) {
    return undefined
  }

  let imagen: URL
  let proyecto: URL

  try {
    imagen = new URL(urlImagen)
    proyecto = new URL(urlSupabase)
  } catch {
    return undefined
  }

  if (proyecto.protocol !== 'https:'
    || imagen.protocol !== 'https:'
    || imagen.username
    || imagen.password
    || imagen.origin !== proyecto.origin
    || imagen.search
    || imagen.hash) {
    return undefined
  }

  if (!imagen.pathname.startsWith(prefijoMediosEditoriales) || !imagen.pathname.endsWith('.webp')) {
    return undefined
  }

  const ruta = imagen.pathname.slice(prefijoMediosEditoriales.length)
  let rutaDecodificada: string

  try {
    rutaDecodificada = decodeURIComponent(ruta)
  } catch {
    return undefined
  }

  if (!/^[A-Za-z0-9._/-]+$/.test(rutaDecodificada)
    || rutaDecodificada.split('/').some(segmento => !segmento || segmento === '.' || segmento === '..')) {
    return undefined
  }

  const candidatos = anchosVariantesImagenEditorial
    .filter(ancho => ancho < anchoOriginal)
    .map((ancho) => {
      const variante = new URL(imagen.href)
      variante.pathname = imagen.pathname.replace(/\.webp$/i, `-${ancho}.webp`)
      return `${variante.href} ${ancho}w`
    })

  candidatos.push(`${imagen.href} ${anchoOriginal}w`)
  return candidatos.join(', ')
}
