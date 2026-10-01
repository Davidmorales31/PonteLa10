import type {
  AlineacionFutbolProveedor,
  CapacidadesProveedorFutbol,
  ClasificacionFutbolProveedor,
  ConsultaPartidosPorFecha,
  EstadisticaFutbolProveedor,
  EventoFutbolProveedor,
  IdentificadorProveedorFutbol,
  PartidoFutbolProveedor,
  PaqueteActualizacionFutbolProveedor,
  RespuestaProveedorFutbol
} from '~/types/futbolProveedor'

/** Contrato interno compartido por el worker y los adaptadores de fútbol. */
export interface ProveedorFutbol {
  readonly id: IdentificadorProveedorFutbol
  readonly capacidades: Readonly<CapacidadesProveedorFutbol>
  obtenerPartidosPorFecha(
    consulta: ConsultaPartidosPorFecha
  ): Promise<RespuestaProveedorFutbol<PartidoFutbolProveedor>>
  obtenerPartidosEnVivo(): Promise<RespuestaProveedorFutbol<PartidoFutbolProveedor>>
  obtenerDetalleFixture(idFixture: string): Promise<PartidoFutbolProveedor | null>
  obtenerEventos(idFixture: string): Promise<RespuestaProveedorFutbol<EventoFutbolProveedor>>
  obtenerAlineaciones(idFixture: string): Promise<RespuestaProveedorFutbol<AlineacionFutbolProveedor>>
  obtenerEstadisticas(idFixture: string): Promise<RespuestaProveedorFutbol<EstadisticaFutbolProveedor>>
  obtenerClasificacion(
    idCompetencia: string,
    temporada?: number | string
  ): Promise<ClasificacionFutbolProveedor | null>
  obtenerActualizacionesPorLote?(
    idsFixture: string[]
  ): Promise<RespuestaProveedorFutbol<PaqueteActualizacionFutbolProveedor>>
}

const metodosObligatorios: Array<keyof ProveedorFutbol> = [
  'obtenerPartidosPorFecha',
  'obtenerPartidosEnVivo',
  'obtenerDetalleFixture',
  'obtenerEventos',
  'obtenerAlineaciones',
  'obtenerEstadisticas',
  'obtenerClasificacion'
]

/** Valida adaptadores configurados dinámicamente sin registrar configuración sensible. */
export function validarProveedorFutbol(proveedor: ProveedorFutbol): void {
  if (proveedor.id !== 'goal-api' && proveedor.id !== 'api-football') {
    throw new Error('El identificador del proveedor de fútbol no es válido.')
  }

  for (const metodo of metodosObligatorios) {
    if (typeof proveedor[metodo] !== 'function') {
      throw new Error(`El proveedor de fútbol no implementa ${metodo}.`)
    }
  }

  if (typeof proveedor.capacidades !== 'object' || proveedor.capacidades === null) {
    throw new Error('El proveedor de fútbol no declara sus capacidades.')
  }

  if (proveedor.capacidades.actualizacionPorLote && typeof proveedor.obtenerActualizacionesPorLote !== 'function') {
    throw new Error('El proveedor declara actualización por lote, pero no implementa el método.')
  }
}
