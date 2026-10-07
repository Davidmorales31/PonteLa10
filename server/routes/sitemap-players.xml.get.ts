import { prepararRespuestaSitemap, construirUrlsetSitemapPublico } from '~/server/utils/sitemapsPublicos'
import { jugadoresColombianosEuropa } from '~/data/jugadoresColombianosEuropa'
import { evaluarIndexabilidad } from '~/utils/indexabilidadPublica'

export default defineEventHandler((evento) => {
  prepararRespuestaSitemap(evento)
  const perfiles = jugadoresColombianosEuropa.filter(perfil => evaluarIndexabilidad({
    tipo: 'jugador',
    ...perfil
  }))
  const entradas = perfiles.map(perfil => ({
    ruta: `/jugadores/${perfil.slug}`,
    modificadoEn: perfil.verificadoEn,
    frecuencia: 'weekly' as const,
    prioridad: '0.6'
  }))
  return construirUrlsetSitemapPublico(entradas, String(useRuntimeConfig().public.siteUrl))
})
