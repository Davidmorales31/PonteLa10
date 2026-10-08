import { createError, getRouterParam } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'
import {
  filtrarArticulosDeAutor,
  obtenerPerfilAutorPorSlug
} from '~/utils/perfilesAutoresPublicos'

export default defineEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  const perfil = obtenerPerfilAutorPorSlug(slug)

  if (!perfil) {
    throw createError({ statusCode: 404, statusMessage: 'El perfil de autor no existe.' })
  }

  const clienteSupabase = obtenerClienteSupabaseAnonimo(evento)
  // El RPC ya limita cada consulta a 50 filas y devuelve únicamente artículos
  // publicados; no se consulta user_profiles ni se exponen IDs del CMS.
  const publicacionesRecientes = await listarArticulosPublicosEditoriales(clienteSupabase, 50, 0)
  aplicarCachePublica(evento, 'articulo')

  return {
    perfil,
    articulos: filtrarArticulosDeAutor(publicacionesRecientes, perfil).slice(0, 24)
  }
})
