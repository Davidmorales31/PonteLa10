export type ProveedorDeportivo = 'api-sports' | 'the-sports-db'
export type TipoEntidadDeportiva = 'competition' | 'team' | 'player' | 'fixture'

export interface MapeoProveedorDeportivo {
  proveedor: ProveedorDeportivo
  tipoEntidad: TipoEntidadDeportiva
  idExterno: string
  idInterno: string
  slugInterno?: string
}
