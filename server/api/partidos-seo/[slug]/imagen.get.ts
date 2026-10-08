import { createError, getQuery, getRouterParam, send } from 'h3'
import sharp from 'sharp'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { crearCartelSvg } from '~/server/utils/cartelPartidoSeo'
import { obtenerEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'
import { obtenerPartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { obtenerTipoCachePartido } from '~/utils/cachePublica'

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

  const partido = await obtenerPartidoSeoPublico(obtenerClienteSupabaseAnonimo(evento), slug)
  const dimensiones = formatos[formato as keyof typeof formatos]
  const clave = [slug, formato, partido.estado || 'sin-estado', partido.verificadoEn].join('-')
  const ahora = Date.now()
  let imagen = cacheCarteles.get(clave)
  if (!imagen || imagen.venceEn <= ahora) {
    let renderizado = renderizadosPendientes.get(clave)
    if (!renderizado) {
      const almacenamientoEscudos = useStorage('assets:server')
      renderizado = crearCartelSvg(partido, dimensiones.ancho, dimensiones.alto,
        nombreEquipo => obtenerEscudoPartidoSeo(nombreEquipo, almacenamientoEscudos))
        .then(svg => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer())
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
    'X-Content-Type-Options': 'nosniff'
  })
  aplicarCachePublica(evento, obtenerTipoCachePartido(partido.estado))
  return send(evento, imagen.imagen, 'image/png')
})
