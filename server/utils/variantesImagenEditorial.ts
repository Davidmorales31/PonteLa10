import sharp from 'sharp'
import { anchosVariantesImagenEditorial } from '~/utils/media/variantesEditoriales'

export interface VarianteImagenEditorial {
  ancho: number
  contenido: Buffer
  tamanoBytes: number
}

export async function generarVariantesImagenEditorial(
  contenido: Buffer
): Promise<VarianteImagenEditorial[]> {
  const metadatos = await sharp(contenido, {
    failOn: 'error',
    limitInputPixels: 40_000_000,
    animated: false
  }).metadata()

  if (!metadatos.width || !metadatos.height) return []

  const anchosDisponibles = anchosVariantesImagenEditorial
    .filter(ancho => ancho < metadatos.width!)

  return Promise.all(anchosDisponibles.map(async (ancho) => {
    const variante = await sharp(contenido, {
      failOn: 'error',
      limitInputPixels: 40_000_000,
      animated: false
    })
      .rotate()
      .resize({
        width: ancho,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 78,
        effort: 4,
        smartSubsample: true
      })
      .toBuffer({ resolveWithObject: true })

    return {
      ancho: variante.info.width,
      contenido: variante.data,
      tamanoBytes: variante.data.byteLength
    }
  }))
}

export function rutaVarianteImagenEditorial(rutaOriginal: string, ancho: number): string {
  if (!/^.+\.webp$/i.test(rutaOriginal) || !Number.isSafeInteger(ancho) || ancho < 1) {
    throw new Error('La ruta de variante editorial no es válida.')
  }

  return rutaOriginal.replace(/\.webp$/i, `-${ancho}.webp`)
}
