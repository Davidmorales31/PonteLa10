export class ErrorProveedorFutbol extends Error {
  constructor(
    readonly codigo: 'CONFIGURACION_AUSENTE' | 'HTTP' | 'LIMITE_CUOTA' | 'RESPUESTA_INVALIDA' | 'RED',
    readonly estadoHttp?: number,
    readonly reintentarDespuesSegundos?: number
  ) {
    super(`Falló el proveedor de fútbol (${codigo}${estadoHttp ? `, HTTP ${estadoHttp}` : ''}).`)
    this.name = 'ErrorProveedorFutbol'
  }
}
