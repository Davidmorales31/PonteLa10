import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { crearTaxonomiaEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaCrearTaxonomia } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'taxonomia.gestionar')
  const entrada = validarEntradaEditorial(
    esquemaCrearTaxonomia,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  setResponseStatus(evento, 201)

  return crearTaxonomiaEditorial(clienteSupabase, entrada)
})
