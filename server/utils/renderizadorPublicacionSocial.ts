import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiapositivaSocial, FormatoSocial } from '~/utils/editorial/publicacionesSociales'
import { componerSvgSocial } from '~/utils/editorial/composicionSocial'
import { cargarRecursosComposicionSocial } from '~/server/utils/recursosComposicionSocial'
import { obtenerMedioEditorial } from '~/server/utils/repositorioMediaEditorial'

const limiteImagenOriginalBytes = 12 * 1024 * 1024
const limiteImagenXBytes = 5 * 1024 * 1024

export async function renderizarDiapositivaSocial(
  cliente: SupabaseClient, diapositiva: DiapositivaSocial, formato: FormatoSocial, dominio: string
): Promise<{ bytes: Buffer, tipoMime: 'image/png' | 'image/jpeg' }> {
  const recursos = await cargarRecursosComposicionSocial()
  let imagen = null
  let credito = ''
  if (diapositiva.tipo === 'noticia') {
    if (!diapositiva.medioId) throw createError({ statusCode: 422, statusMessage: 'Selecciona una fotografía para cada diapositiva.' })
    const medio = await obtenerMedioEditorial(cliente, diapositiva.medioId)
    if (medio.bucket !== 'editorial-media' || medio.tamanoBytes > limiteImagenOriginalBytes) {
      throw createError({ statusCode: 422, statusMessage: 'El medio no es compatible con la publicación.' })
    }
    const { data, error } = await cliente.storage.from(medio.bucket).download(medio.ruta)
    if (error || !data || data.size > limiteImagenOriginalBytes) {
      throw createError({ statusCode: 503, statusMessage: 'No se pudo recuperar la fotografía original.' })
    }
    const normalizada = await sharp(Buffer.from(await data.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate().png().toBuffer({ resolveWithObject: true })
    imagen = { url: `data:image/png;base64,${normalizada.data.toString('base64')}`,
      ancho: normalizada.info.width, alto: normalizada.info.height }
    credito = medio.credito
  }

  let svg: string
  try {
    svg = componerSvgSocial({ diapositiva, formato, ...recursos, imagen, credito, dominio })
  } catch (error) {
    throw createError({ statusCode: 422, statusMessage: error instanceof Error ? error.message : 'No se pudo componer la imagen.' })
  }
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  if (png.byteLength <= limiteImagenXBytes) return { bytes: png, tipoMime: 'image/png' }
  for (const calidad of [90, 82, 74]) {
    const jpeg = await sharp(png).jpeg({ quality: calidad, mozjpeg: true }).toBuffer()
    if (jpeg.byteLength <= limiteImagenXBytes) return { bytes: jpeg, tipoMime: 'image/jpeg' }
  }
  throw createError({ statusCode: 422, statusMessage: 'La imagen resultante supera el límite de 5 MB de X.' })
}
