import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaImportacionSearchConsole,
  parsearCsvSearchConsole
} from '~/utils/editorial/searchConsole'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'contenido.editarTodos', { exigirMfa: true })

  const largoContenido = Number(getHeader(evento, 'content-length') || 0)
  if (largoContenido > 2_000_000) {
    throw createError({ statusCode: 413, statusMessage: 'El CSV supera el tamaño permitido de 1.5 MB.' })
  }

  const entrada = validarEntradaEditorial(esquemaImportacionSearchConsole, await readBody(evento))
  if (new TextEncoder().encode(entrada.csv).byteLength > 1_500_000) {
    throw createError({ statusCode: 413, statusMessage: 'El CSV supera el tamaño permitido de 1.5 MB.' })
  }
  const urlSitio = String(useRuntimeConfig(evento).public.siteUrl || '')
  let filas
  try {
    filas = parsearCsvSearchConsole(entrada.csv, urlSitio)
  } catch (error: unknown) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'El CSV no cumple el formato esperado.',
      data: { codigo: 'SEARCH_CONSOLE_CSV_INVALIDO' }
    })
  }

  const cliente = obtenerClienteSupabaseEditorial(evento)
  const { data, error } = await cliente.rpc('import_editorial_search_console_report', {
    p_period_start: entrada.fechaDesde,
    p_period_end: entrada.fechaHasta,
    p_rows: filas.map(fila => ({
      query: fila.consulta,
      page_url: fila.paginaUrl,
      clicks: fila.clics,
      impressions: fila.impresiones,
      ctr: fila.ctr,
      average_position: fila.posicion
    }))
  })

  if (error) {
    if (error.code === '42501') {
      throw createError({ statusCode: 403, statusMessage: 'La importación requiere permiso editorial y MFA.' })
    }
    if (['22023', '22P02', '23505', '23514'].includes(error.code || '')) {
      throw createError({ statusCode: 400, statusMessage: 'Supabase rechazó una fila del reporte. Revisa el CSV y las fechas.' })
    }
    throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar el informe privado de Search Console.' })
  }

  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  return data
})
