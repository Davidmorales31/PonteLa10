export interface ArticuloResumen {
  slug: string
  titulo: string
  bajada: string
  categoria: string
  autor: string
  publicadoHace: string
  lecturaMinutos: number
  imagen: string
  destacado?: boolean
}

export interface ModuloInteractivo {
  slug: string
  nombre: string
  resumen: string
  estado: string
}

export interface TendenciaEditorial {
  posicion: number
  titulo: string
  categoria: string
}
