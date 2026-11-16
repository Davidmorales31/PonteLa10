import { guiaAgentes } from '~/server/utils/agentesRedes/guia'

export default defineEventHandler((evento) => {
  setHeader(evento, 'Content-Type', 'text/markdown; charset=utf-8')
  setHeader(evento, 'Cache-Control', 'public, max-age=300')
  return guiaAgentes
})
