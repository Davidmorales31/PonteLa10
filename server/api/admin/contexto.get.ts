import { obtenerContextoEditorialServidor } from '~/server/utils/autorizacionEditorial'

export default defineEventHandler(async (evento) => {
  return obtenerContextoEditorialServidor(evento)
})
