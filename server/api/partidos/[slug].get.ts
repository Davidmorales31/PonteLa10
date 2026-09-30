import { consultarDetalleResultadoPorId } from '~/server/utils/manejadorDetalleResultado'
import { obtenerIdProveedorPorSlugPartido } from '~/server/utils/repositorioEntidadesDeportivasPublicas'
import { esSlugCanonicoPartidoSeguro } from '~/utils/rutasPartidos'

export default defineCachedEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  if (!esSlugCanonicoPartidoSeguro(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'El identificador del partido no es válido.' })
  }

  let idProveedor: string | undefined
  try {
    const configuracion = useRuntimeConfig()
    if (!configuracion.public.supabaseUrl || !configuracion.public.supabaseKey) {
      throw createError({ statusCode: 503, statusMessage: 'El catálogo de partidos no está configurado.' })
    }
    idProveedor = await obtenerIdProveedorPorSlugPartido(configuracion.public, configuracion, slug)
    if (!idProveedor) {
      throw createError({ statusCode: 404, statusMessage: 'No hay una identidad pública disponible para este partido.' })
    }
    return await consultarDetalleResultadoPorId(idProveedor, configuracion)
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 503, statusMessage: 'No fue posible resolver el partido.' })
  }
}, {
  maxAge: 300,
  getKey: evento => `detalle-partido-canonico-${getRouterParam(evento, 'slug') || 'invalido'}`
})
