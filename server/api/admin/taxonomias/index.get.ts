import type { TaxonomiasEditoriales } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerTaxonomiasEditoriales } from '~/server/utils/repositorioContenidoEditorial'

export default defineEventHandler(async (evento): Promise<TaxonomiasEditoriales> => {
  await exigirPermisoEditorial(evento, 'taxonomia.ver')
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return obtenerTaxonomiasEditoriales(clienteSupabase)
})
