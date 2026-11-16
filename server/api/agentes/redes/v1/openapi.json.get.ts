import { construirOpenApi } from '~/server/utils/agentesRedes/openapi'

/** Especificación OpenAPI 3.1 pública (no contiene secretos) para que cualquier agente o SDK descubra la API. */
export default defineEventHandler((evento) => {
  setHeader(evento, 'Cache-Control', 'public, max-age=300')
  return construirOpenApi(`${getRequestURL(evento).origin}/api/agentes/redes/v1`)
})
