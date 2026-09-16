import { z } from 'zod'

const esquemaOembedTikTok = z.object({
  type: z.literal('video'),
  title: z.string().optional().default(''),
  author_name: z.string().optional().default(''),
  author_url: z.string().url().optional().default(''),
  thumbnail_url: z.string().url().optional().default(''),
  html: z.string().optional().default(''),
  provider_name: z.string().optional().default('TikTok')
})

export interface MetadatosTikTok {
  titulo: string
  autor: string
  urlAutor: string
  miniatura: string
  embedHtml: string
  proveedor: string
}

export async function obtenerMetadatosTikTok(urlFuente: string): Promise<MetadatosTikTok> {
  const respuesta = await $fetch<unknown>('https://www.tiktok.com/oembed', {
    query: { url: urlFuente },
    timeout: 15000
  })
  const datos = esquemaOembedTikTok.parse(respuesta)

  return {
    titulo: datos.title,
    autor: datos.author_name,
    urlAutor: datos.author_url,
    miniatura: datos.thumbnail_url,
    embedHtml: datos.html,
    proveedor: datos.provider_name
  }
}
