import { getRouterParam, send, setResponseHeader } from 'h3'
import sharp from 'sharp'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { obtenerEquipoLigaPublicoPorSlug, type EquipoLigaPublico } from '~/server/utils/equiposLigaPublicos'
import { crearCartelEquipoSvg } from '~/server/utils/cartelEquipoSeo'
import { obtenerEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'

const ancho = 1200
const alto = 630
const DURACION_CACHE_EQUIPO_MS = 120_000
const DURACION_CACHE_NO_ENCONTRADO_MS = 30_000
const cacheEquipos = new Map<string, { venceEn: number, equipo: EquipoLigaPublico | null }>()
const consultasEquipoPendientes = new Map<string, Promise<EquipoLigaPublico | null>>()
const cacheCarteles = new Map<string, { venceEn: number, imagen: Buffer }>()
const renderizadosPendientes = new Map<string, Promise<Buffer>>()

export default defineEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'La dirección del equipo no es válida.' })
  }

  const ahora = Date.now()
  let equipoCache = cacheEquipos.get(slug)
  if (!equipoCache || equipoCache.venceEn <= ahora) {
    let consultaEquipo = consultasEquipoPendientes.get(slug)
    if (!consultaEquipo) {
      consultaEquipo = obtenerEquipoLigaPublicoPorSlug(obtenerClienteSupabaseAnonimo(evento), slug)
      consultasEquipoPendientes.set(slug, consultaEquipo)
    }
    try {
      const equipo = await consultaEquipo
      equipoCache = {
        venceEn: Date.now() + (equipo ? DURACION_CACHE_EQUIPO_MS : DURACION_CACHE_NO_ENCONTRADO_MS),
        equipo
      }
      cacheEquipos.set(slug, equipoCache)
      if (cacheEquipos.size > 200) cacheEquipos.delete(cacheEquipos.keys().next().value!)
    } finally {
      if (consultasEquipoPendientes.get(slug) === consultaEquipo) consultasEquipoPendientes.delete(slug)
    }
  }
  const equipo = equipoCache.equipo
  if (!equipo) {
    if (aplicarCachePublica(evento, 'equipo')) {
      setResponseHeader(evento, 'CDN-Cache-Control', 'public, s-maxage=30')
    }
    throw createError({ statusCode: 404, statusMessage: 'No encontramos ese equipo.' })
  }

  const clasificacion = equipo.clasificaciones[0]
  const clave = [slug, equipo.actualizadoEn, clasificacion?.verificadoEn || 'sin-tabla', clasificacion?.posicion, clasificacion?.puntos].join('|')
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
