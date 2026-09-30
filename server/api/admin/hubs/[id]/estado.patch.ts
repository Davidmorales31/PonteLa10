import type { HubEditorialResumen } from '~/types/contenidoEditorial'
import { z } from 'zod'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  cambiarEstadoHubEditorial,
  listarHubsEditoriales,
  validarAlimentacionHub
} from '~/server/utils/repositorioHubsPublicos'
import { esquemaDatosHubPublico, evaluarHubIndexable } from '~/utils/editorial/hubs'

const esquemaTransicionHub = z.object({ estado: z.enum(['published', 'draft', 'archived']) })

export default defineEventHandler(async (evento): Promise<HubEditorialResumen> => {
  await exigirPermisoEditorial(evento, 'hub.gestionar')
  const entrada = esquemaTransicionHub.safeParse(await readBody(evento))
  if (!entrada.success) {
    throw createError({ statusCode: 400, statusMessage: 'La transición solicitada no es válida.' })
  }

  if (entrada.data.estado === 'archived') {
    await exigirPermisoEditorial(evento, 'contenido.archivar')
    await exigirPermisoEditorial(evento, 'contenido.publicar', { exigirMfa: true })
  } else {
    await exigirPermisoEditorial(evento, 'contenido.publicar', { exigirMfa: true })
  }
  const id = String(getRouterParam(evento, 'id') || '')
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Hub no encontrado.' })
  }

  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  if (entrada.data.estado === 'published') {
    const hubs = await listarHubsEditoriales(clienteSupabase)
    const hubActual = hubs.find(hub => hub.id === id)
    if (!hubActual) throw createError({ statusCode: 404, statusMessage: 'Hub no encontrado.' })
    const datos = esquemaDatosHubPublico.parse({
      slug: hubActual.slug,
      tipo: hubActual.tipo,
      titulo: hubActual.titulo,
      descripcion: hubActual.descripcion,
      cuerpo: hubActual.cuerpo,
      modulos: hubActual.modulos,
      tituloSeo: hubActual.tituloSeo,
      descripcionSeo: hubActual.descripcionSeo
    })
    const alimentacion = await validarAlimentacionHub(clienteSupabase, datos)
    const evaluacion = evaluarHubIndexable(datos, alimentacion.articulos)
    if (!alimentacion.valido || !evaluacion.indexable) {
      throw createError({
        statusCode: 422,
        statusMessage: 'El hub aún no puede indexarse: necesita contenido suficiente y publicaciones en su módulo de artículos.',
        data: { motivos: evaluacion.motivos }
      })
    }
  }

  return cambiarEstadoHubEditorial(
    clienteSupabase,
    id,
    entrada.data.estado
  )
})
