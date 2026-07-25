import type { ResumenPanelEditorial } from '~/types/editorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'

interface FilaEstadoArticulo {
  status: string
}

export default defineEventHandler(async (evento): Promise<ResumenPanelEditorial> => {
  await exigirPermisoEditorial(evento, 'panel.acceder')
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  const { data, error } = await clienteSupabase
    .from('articles')
    .select('status')

  if (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudo cargar el resumen editorial.'
    })
  }

  const estados = (data || []).map(fila => (fila as FilaEstadoArticulo).status)

  return {
    borradores: estados.filter(estado => estado === 'draft').length,
    enRevision: estados.filter(estado => estado === 'review').length,
    publicados: estados.filter(estado => estado === 'published').length,
    totalContenidos: estados.length
  }
})
