import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { fechaNegocioBogota } from '~/server/utils/proveedoresFutbol/configuracionWorkerClasificaciones'
import { leerSnapshotsFutbolPublicos } from '~/server/utils/lecturaSnapshotsFutbol'
import { z } from 'zod'

const esquemaFecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export default defineCachedEventHandler(async (evento) => {
  const query = getQuery(evento)
  let fechaNegocio = fechaNegocioBogota()
  if (query.fecha !== undefined) {
    const fecha = esquemaFecha.safeParse(query.fecha)
    if (!fecha.success) {
      throw createError({ statusCode: 400, statusMessage: 'La fecha solicitada no es válida.' })
    }
    fechaNegocio = fecha.data
  }

  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) return respuestaVacia()

  const fixtures = await leerSnapshotsFutbolPublicos(cliente, {
    fechaNegocio,
    limite: 100
  })
  return fixtures.length
    ? { estado: 'disponible' as const, fixtures }
    : respuestaVacia()
}, {
  maxAge: 15,
  swr: true,
  getKey: (evento) => {
    const query = getQuery(evento)
    const fecha = esquemaFecha.safeParse(query.fecha)
    return `futbol-fixtures-publicos-${fecha.success ? fecha.data : fechaNegocioBogota()}`
  }
})

function respuestaVacia() {
  return {
    estado: 'sin_datos' as const,
    fixtures: [],
    aviso: 'Los partidos verificados aún no están disponibles.'
  }
}
