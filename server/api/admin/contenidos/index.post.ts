import type { BorradorCreadoEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { crearBorradorEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaCrearBorrador } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento): Promise<BorradorCreadoEditorial> => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.crear')
  const entrada = validarEntradaEditorial(
    esquemaCrearBorrador,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  setResponseStatus(evento, 201)

  return crearBorradorEditorial(
    clienteSupabase,
    entrada,
    contexto.usuario.id
  )
})
