export default defineEventHandler((evento) => {
  setResponseStatus(evento, 405)
  setHeader(evento, 'Allow', 'POST')
  return { error: { codigo: 'metodo_no_permitido', mensaje: 'Este servidor MCP usa solo POST (JSON-RPC 2.0). Ver /api/agentes/redes/v1/guia.md' } }
})
