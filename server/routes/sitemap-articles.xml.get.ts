import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import {
  construirUrlsetSitemapPublico,
  type EntradaSitemapPublico,
  prepararRespuestaSitemap,
  registrarFalloSitemap
} from '~/server/utils/sitemapsPublicos'

const MAX_ARTICULOS_SITEMAP = 50_000
const TAMANO_PAGINA_ARTICULOS = 50

export default defineEventHandler(async (evento) => {
  const urlSitio = String(useRuntimeConfig().public.siteUrl)
  const entradas: EntradaSitemapPublico[] = []

  try {
    const clienteSupabase = obtenerClienteSupabaseAnonimo(evento)
    let desplazamiento = 0

    while (desplazamiento < MAX_ARTICULOS_SITEMAP) {
      const limite = Math.min(TAMANO_PAGINA_ARTICULOS, MAX_ARTICULOS_SITEMAP - desplazamiento)
      const publicaciones = await listarArticulosPublicosEditoriales(clienteSupabase, limite, desplazamiento)
      entradas.push(...publicaciones.map(publicacion => ({
        ruta: `/articulos/${publicacion.slug}`,
        modificadoEn: publicacion.modificadoEn || publicacion.publicadoEn,
        frecuencia: 'weekly' as const,
        prioridad: '0.8'
      })))
      desplazamiento += publicaciones.length

      if (publicaciones.length < limite) break
    }

    if (desplazamiento >= MAX_ARTICULOS_SITEMAP) {
      const hayMasPublicaciones = await listarArticulosPublicosEditoriales(
        clienteSupabase,
        1,
        desplazamiento
      )
      if (hayMasPublicaciones.length) throw new Error('El sitemap de artículos supera el límite por archivo.')
    }
  } catch {
    registrarFalloSitemap(evento, 'articles')
    return construirUrlsetSitemapPublico([], urlSitio)
  }

  prepararRespuestaSitemap(evento)
  return construirUrlsetSitemapPublico(entradas, urlSitio)
})
