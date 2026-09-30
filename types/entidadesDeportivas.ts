export type ProveedorDeportivo = 'api-sports' | 'the-sports-db'
export type TipoEntidadDeportiva = 'competition' | 'team' | 'player'

export interface MapeoProveedorDeportivo {
  proveedor: ProveedorDeportivo
  tipoEntidad: TipoEntidadDeportiva
  idExterno: string
  idInterno: string
}
