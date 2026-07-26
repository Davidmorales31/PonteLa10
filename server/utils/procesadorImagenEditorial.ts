import { createHash } from 'node:crypto'
import sharp from 'sharp'
import {
  anchoMaximoImagenEditorial,
  limitePixelesImagenEditorial,
  tiposImagenEditorialPermitidos
} from '~/utils/media/editorial'

export interface ImagenEditorialProcesada {
  contenido: Buffer
  tipoMime: 'image/webp'
  ancho: number
  alto: number
  tamanoBytes: number
  hash: string
}

export async function procesarImagenEditorial(
  contenido: Buffer,
  tipoMimeDeclarado: string
): Promise<ImagenEditorialProcesada> {
  if (!tiposImagenEditorialPermitidos.includes(
    tipoMimeDeclarado as typeof tiposImagenEditorialPermitidos[number]
  )) {
    throw createError({
      statusCode: 415,
      statusMessage: 'El formato de imagen no está permitido.',
      data: { codigo: 'FORMATO_IMAGEN_NO_PERMITIDO' }
    })
  }

  let imagen

  try {
    imagen = sharp(contenido, {
      failOn: 'error',
      limitInputPixels: limitePixelesImagenEditorial,
      animated: false
    })
    const metadatos = await imagen.metadata()

    if (!metadatos.width || !metadatos.height) {
      throw new Error('La imagen no tiene dimensiones válidas.')
    }

    if (!['jpeg', 'png', 'webp'].includes(metadatos.format || '')) {
      throw new Error('La firma del archivo no corresponde a una imagen admitida.')
    }
  } catch {
    throw createError({
      statusCode: 422,
      statusMessage: 'La imagen está dañada o no es válida.',
      data: { codigo: 'IMAGEN_EDITORIAL_INVALIDA' }
    })
  }

  const resultado = await imagen
    .rotate()
    .resize({
      width: anchoMaximoImagenEditorial,
      height: anchoMaximoImagenEditorial,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: 84,
      effort: 4,
      smartSubsample: true
    })
    .toBuffer({ resolveWithObject: true })

  const ancho = resultado.info.width
  const alto = resultado.info.height
  const hash = createHash('sha256')
    .update(resultado.data)
    .digest('hex')

  return {
    contenido: resultado.data,
    tipoMime: 'image/webp',
    ancho,
    alto,
    tamanoBytes: resultado.data.byteLength,
    hash
  }
}
