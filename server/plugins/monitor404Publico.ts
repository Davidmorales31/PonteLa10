import type { H3Event } from 'h3'
import {
  normalizarRutaPublica404,
  obtenerRefererPublico404
} from '~/server/utils/monitor404Seo'

interface ContextoConCandidato404 {
  candidato404Seo?: {
    ruta: string
    refererRuta: string | null
    metodo: 'GET' | 'HEAD'
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (evento: H3Event) => {
    const metodo = String(evento.node.req.method || '').toUpperCase()
    if (metodo !== 'GET' && metodo !== 'HEAD') return

    const ruta = normalizarRutaPublica404(getRequestURL(evento).pathname)
    if (!ruta) return

    const origenCanonico = String(useRuntimeConfig(evento).public.siteUrl || '')
    const refererRuta = obtenerRefererPublico404(getRequestHeader(evento, 'referer'), origenCanonico)
    const contexto = evento.context as typeof evento.context & ContextoConCandidato404
    contexto.candidato404Seo = { ruta, refererRuta, metodo }
  })

  nitroApp.hooks.hook('afterResponse', (evento: H3Event) => {
    const contexto = evento.context as typeof evento.context & ContextoConCandidato404
    const candidato = contexto.candidato404Seo
    if (!candidato || evento.node.res.statusCode !== 404) return

    console.warn('[seo_404_publico]', JSON.stringify({
      ocurridoEn: new Date().toISOString(),
      metodo: candidato.metodo,
      ruta: candidato.ruta,
      refererRuta: candidato.refererRuta,
      estado: 404
    }))
  })
})
