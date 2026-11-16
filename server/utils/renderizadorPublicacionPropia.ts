import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cargarRecursosComposicionSocial } from './recursosComposicionSocial'
import { obtenerMedioEditorial } from './repositorioMediaEditorial'
import { buscarTemporalesSociales, descargarTemporalSocial } from './mediosTemporalesSociales'
import { componerSvgPropio } from '~/utils/editorial/composicionPropia'
import type { DiapositivaPropia, DocumentoPropio } from '~/utils/editorial/publicacionesPropias'

const limiteImagenOriginalBytes = 12 * 1024 * 1024
const limiteMetaBytes = 5 * 1024 * 1024

async function originalImagen(cliente: SupabaseClient, privado: SupabaseClient, medioId: string): Promise<Buffer> {
  const [temporal] = await buscarTemporalesSociales(privado, [medioId])
  if (temporal) {
    if (temporal.kind !== 'imagen') throw createError({ statusCode: 422, statusMessage: 'Una imagen no es compatible con las redes.' })
    return descargarTemporalSocial(privado, temporal)
  }
  const medio = await obtenerMedioEditorial(cliente, medioId)
  if (medio.bucket !== 'editorial-media' || medio.tamanoBytes > limiteImagenOriginalBytes) {
    throw createError({ statusCode: 422, statusMessage: 'Una imagen no es compatible con las redes.' })
  }
  const { data, error } = await cliente.storage.from(medio.bucket).download(medio.ruta)
  if (error || !data || data.size > limiteImagenOriginalBytes) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo recuperar una imagen original.' })
  }
  return Buffer.from(await data.arrayBuffer())
}

async function cargarImagen(cliente: SupabaseClient, privado: SupabaseClient, medioId: string | null) {
  if (!medioId) throw createError({ statusCode: 422, statusMessage: 'Elige todas las imágenes antes de continuar.' })
  const original = await originalImagen(cliente, privado, medioId)
  if (original.byteLength > limiteImagenOriginalBytes * 2) throw createError({ statusCode: 422, statusMessage: 'Una imagen es demasiado pesada.' })
  // Se reduce antes de incrustar: una pieza de 4 imágenes por diapositiva no debe ocupar cientos de MB.
  const normalizada = await sharp(original, { limitInputPixels: 40_000_000 })
    .rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer({ resolveWithObject: true })
  return { url: `data:image/jpeg;base64,${normalizada.data.toString('base64')}`, ancho: normalizada.info.width, alto: normalizada.info.height }
}

export async function renderizarDiapositivaPropia(cliente: SupabaseClient, privado: SupabaseClient, diapositiva: DiapositivaPropia, formato: DocumentoPropio['formato']): Promise<Buffer> {
  const recursos = await cargarRecursosComposicionSocial()
  const imagenes = []
  for (const medio of diapositiva.medios) imagenes.push(await cargarImagen(cliente, privado, medio.medioId))
  let svg: string
  try {
    svg = componerSvgPropio({ diapositiva, formato, fuente: recursos.fuente, logo: recursos.logo, imagenes })
  } catch (error) {
    throw createError({ statusCode: 422, statusMessage: error instanceof Error ? error.message : 'No se pudo componer la imagen.' })
  }
  const jpeg = await sharp(Buffer.from(svg)).flatten({ background: '#ffffff' }).jpeg({ quality: 90, mozjpeg: true }).toBuffer()
  if (jpeg.byteLength > limiteMetaBytes) throw createError({ statusCode: 422, statusMessage: 'Una imagen supera 5 MB. Usa un formato más pequeño.' })
  return jpeg
}

export async function renderizarImagenesPropias(cliente: SupabaseClient, privado: SupabaseClient, documento: DocumentoPropio): Promise<Buffer[]> {
  const imagenes: Buffer[] = []
  for (const diapositiva of documento.diapositivas) imagenes.push(await renderizarDiapositivaPropia(cliente, privado, diapositiva, documento.formato))
  return imagenes
}

export function huellaImagenesPropias(imagenes: Buffer[]) {
  return createHash('sha256').update(JSON.stringify(imagenes.map(imagen => createHash('sha256').update(imagen).digest('hex')))).digest('hex')
}
