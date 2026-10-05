import { createError, getQuery, getRouterParam, send } from 'h3'
import sharp from 'sharp'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { crearCartelSvg } from '~/server/utils/cartelPartidoSeo'
import { obtenerPartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'

const formatos = {
  og: { ancho: 1200, alto: 628 },
  wide: { ancho: 1920, alto: 1080 },
  story: { ancho: 1080, alto: 1920 },
  square: { ancho: 1080, alto: 1080 }
} as const
const cacheCarteles = new Map<string, { venceEn: number, imagen: Buffer }>()
const renderizadosPendientes = new Map<string, Promise<Buffer>>()

export default defineEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  if (slug.length > 240 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'La dirección del partido no es válida.' })
  }

  const query = getQuery(evento)
  const formato = typeof query.formato === 'string' ? query.formato : 'og'
  if (!Object.hasOwn(formatos, formato)) {
    throw createError({ statusCode: 400, statusMessage: 'El formato de imagen solicitado no es válido.' })
  }

  const partido = await obtenerPartidoSeoPublico(obtenerClienteSupabaseEditorial(evento), slug)
  const dimensiones = formatos[formato as keyof typeof formatos]
  const clave = `${slug}-${formato}-${partido.verificadoEn}`
  const ahora = Date.now()
  let imagen = cacheCarteles.get(clave)
  if (!imagen || imagen.venceEn <= ahora) {
    let renderizado = renderizadosPendientes.get(clave)
    if (!renderizado) {
      renderizado = sharp(Buffer.from(crearCartelSvg(partido, dimensiones.ancho, dimensiones.alto)))
        .png({ compressionLevel: 9 })
        .toBuffer()
      renderizadosPendientes.set(clave, renderizado)
    }
    try {
      const bytes = await renderizado
      imagen = { imagen: bytes, venceEn: ahora + 60 * 1000 }
      cacheCarteles.set(clave, imagen)
      if (cacheCarteles.size > 200) cacheCarteles.delete(cacheCarteles.keys().next().value!)
    } finally {
      if (renderizadosPendientes.get(clave) === renderizado) renderizadosPendientes.delete(clave)
    }
  }

  setResponseHeaders(evento, {
    'Content-Type': 'image/png',
    'Content-Length': String(imagen.imagen.length),
    'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=60',
    'X-Content-Type-Options': 'nosniff'
  })
  return send(evento, imagen.imagen, 'image/png')
})
