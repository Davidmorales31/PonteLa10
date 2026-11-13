import { parse } from 'opentype.js'
import type { Font } from 'opentype.js'
import type { MedioEditorial } from '~/types/mediaEditorial'
import type { DocumentoSocial } from '~/utils/editorial/publicacionesSociales'
import { componerSvgSocial } from '~/utils/editorial/composicionSocial'

let recursos: Promise<{ fuente: Font, logo: string, imagenCta: string }> | null = null
export function cargarRecursosComposicionSocial() {
  recursos ||= (async () => {
    const almacenamiento = useStorage('assets:server')
    const [fuenteBytes, logoBytes, imagenCtaBytes] = await Promise.all([
      almacenamiento.getItemRaw<Buffer>('redes/Montserrat-Bold.ttf'), almacenamiento.getItemRaw<Buffer>('redes/logo.png'),
      almacenamiento.getItemRaw<Buffer>('redes/cta-pont3la10-generada-v2.png')
    ])
    if (!fuenteBytes || !logoBytes || !imagenCtaBytes) throw createError({ statusCode: 503, statusMessage: 'Los recursos de renderizado no están disponibles.' })
    const buffer = Buffer.from(fuenteBytes)
    return { fuente: parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer),
      logo: `data:image/png;base64,${Buffer.from(logoBytes).toString('base64')}`,
      imagenCta: `data:image/png;base64,${Buffer.from(imagenCtaBytes).toString('base64')}` }
  })().catch(error => { recursos = null; throw error })
  return recursos
}

export async function validarPublicacionSocialLista(documento: DocumentoSocial, medios: MedioEditorial[], dominio: string) {
  if (!documento.textos[documento.red].trim()) throw createError({ statusCode: 422, statusMessage: 'Escribe la descripción del destino antes de marcar la publicación como lista.' })
  if (documento.red === 'x' && documento.diapositivas.length > 4) throw createError({ statusCode: 422, statusMessage: 'X admite hasta cuatro fotografías. Adapta el carrusel antes de marcarlo como listo.' })
  const recursos = await cargarRecursosComposicionSocial()
  for (const [indice, diapositiva] of documento.diapositivas.entries()) {
    const medio = medios.find(actual => actual.id === diapositiva.medioId)
    try {
      componerSvgSocial({ diapositiva, formato: documento.formato, ...recursos, dominio,
        imagen: medio ? { url: medio.urlPublica, ancho: medio.ancho, alto: medio.alto } : null })
    } catch (error) {
      throw createError({ statusCode: 422, statusMessage: `Diapositiva ${indice + 1}: ${error instanceof Error ? error.message : 'Composición inválida.'}` })
    }
  }
}
