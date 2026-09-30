import { createError, setResponseHeader } from 'h3'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { leerCsvSearchConsoleLimitado } from '~/server/utils/leerCsvSearchConsoleLimitado'
import { importarMetricasSearchConsole } from '~/server/utils/repositorioSearchConsole'
import { analizarCsvSearchConsole } from '~/utils/searchConsoleCsv'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'searchConsole.importar', { exigirMfa: true })
  setResponseHeader(evento, 'Cache-Control', 'no-store')

  const textoCsv = await leerCsvSearchConsoleLimitado(evento)
  const configuracion = useRuntimeConfig(evento)
  const urlPublica = String(configuracion.public.siteUrl || '')
  const resultado = analizarCsvSearchConsole(textoCsv, urlPublica)
  if (resultado.incidencias.length) {
    throw createError({
      statusCode: 422,
      statusMessage: 'El archivo no pasó la validación. No se guardó ninguna fila.',
      data: {
        codigo: 'SEARCH_CONSOLE_CSV_NO_VALIDO',
        filasLeidas: resultado.filasLeidas,
        filasValidas: resultado.filas.length,
        duplicados: resultado.duplicados,
        incidencias: resultado.incidencias
      }
    })
  }

  const cliente = obtenerClienteSupabaseEditorial(evento)
  const importacion = await importarMetricasSearchConsole(
    cliente,
    resultado.filas
  )

  return {
    ...importacion,
    filasDuplicadas: resultado.duplicados,
    fechaDesde: resultado.filas.reduce((menor, fila) => fila.fecha < menor ? fila.fecha : menor, resultado.filas[0]!.fecha),
    fechaHasta: resultado.filas.reduce((mayor, fila) => fila.fecha > mayor ? fila.fecha : mayor, resultado.filas[0]!.fecha)
  }
})
