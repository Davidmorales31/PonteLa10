import { getRouterParam, send } from 'h3'
import sharp from 'sharp'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarEquiposLigaPublicos } from '~/server/utils/equiposLigaPublicos'
import { crearCartelEquipoSvg } from '~/server/utils/cartelEquipoSeo'
import { obtenerEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'

const ancho = 1200
const alto = 630
const cacheCarteles = new Map<string, { venceEn: number, imagen: Buffer }>()
const renderizadosPendientes = new Map<string, Promise<Buffer>>()

export default defineEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'La dirección del equipo no es válida.' })
  }

  const equipos = await listarEquiposLigaPublicos(obtenerClienteSupabaseAnonimo(evento))
  const equipo = equipos.find(item => item.slug === slug)
  if (!equipo) throw createError({ statusCode: 404, statusMessage: 'No encontramos ese equipo.' })

  const clasificacion = equipo.clasificaciones[0]
  const clave = [slug, equipo.actualizadoEn, clasificacion?.verificadoEn || 'sin-tabla', clasificacion?.posicion, clasificacion?.puntos].join('|')
  const ahora = Date.now()
  let imagen = cacheCarteles.get(clave)
  if (!imagen || imagen.venceEn <= ahora) {
    let renderizado = renderizadosPendientes.get(clave)
    if (!renderizado) {
      const almacenamientoEscudos = useStorage('assets:server')
      renderizado = crearCartelEquipoSvg(equipo, ancho, alto,
        nombreEquipo => obtenerEscudoPartidoSeo(nombreEquipo, almacenamientoEscudos))
        .then(svg => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer())
      renderizadosPendientes.set(clave, renderizado)
    }
    try {
      imagen = { imagen: await renderizado, venceEn: ahora + 120_000 }
      cacheCarteles.set(clave, imagen)
      if (cacheCarteles.size > 150) cacheCarteles.delete(cacheCarteles.keys().next().value!)
    } finally {
      if (renderizadosPendientes.get(clave) === renderizado) renderizadosPendientes.delete(clave)
    }
  }

  setResponseHeaders(evento, {
    'Content-Type': 'image/png',
    'Content-Length': String(imagen.imagen.length),
    'X-Content-Type-Options': 'nosniff'
  })
  aplicarCachePublica(evento, 'equipo')
  return send(evento, imagen.imagen, 'image/png')
})
