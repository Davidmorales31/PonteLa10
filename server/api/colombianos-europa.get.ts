import { obtenerColombianosEuropa } from '~/server/utils/repositorioColombianosEuropa'
import { obtenerFechaEnZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

export default defineCachedEventHandler(async () => {
  const configuracion = useRuntimeConfig()
  return obtenerColombianosEuropa(configuracion.public)
}, {
  maxAge: 60,
  getKey: () => `colombianos-europa-${obtenerFechaEnZonaHoraria(new Date(), zonaHorariaColombia)}`
})
