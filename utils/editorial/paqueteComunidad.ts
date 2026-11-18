// Textos listos para pegar en canales sin API oficial de publicación:
// YouTube Comunidad y la Comunidad (o Canal) de WhatsApp.
export type CanalComunidad = 'youtube' | 'whatsapp'

export interface ArticuloPaquete {
  id: string
  slug: string
  titulo: string
  resumen?: string | null
}

const SITIO = 'https://www.pont3la10.com'

export function enlaceComunidad(articulo: Pick<ArticuloPaquete, 'id' | 'slug'>, canal: CanalComunidad): string {
  const url = new URL(`${SITIO}/articulos/${articulo.slug}`)
  url.searchParams.set('utm_source', canal)
  url.searchParams.set('utm_medium', 'organic_social')
  url.searchParams.set('utm_campaign', `noticia_${articulo.id}`)
  url.searchParams.set('utm_content', 'comunidad')
  return url.toString()
}

function resumenCorto(resumen: string | null | undefined, maximo: number): string {
  const limpio = String(resumen || '').replace(/\s+/g, ' ').trim()
  if (limpio.length <= maximo) return limpio
  return `${limpio.slice(0, maximo - 1).replace(/\s+\S*$/, '')}…`
}

export function construirPaqueteComunidad(articulo: ArticuloPaquete): Record<CanalComunidad, string> {
  const titulo = articulo.titulo.trim()
  const resumen = resumenCorto(articulo.resumen, 220)
  const cuerpo = resumen ? `\n\n${resumen}` : ''
  return {
    youtube: `${titulo}${cuerpo}\n\nNota completa: ${enlaceComunidad(articulo, 'youtube')}`,
    // WhatsApp usa asteriscos para la negrita.
    whatsapp: `*${titulo}*${cuerpo}\n\nLee la nota completa: ${enlaceComunidad(articulo, 'whatsapp')}`
  }
}
