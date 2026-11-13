import type { ArticuloDetalleEditorial } from './contenidoEditorial'
import type { MedioEditorial } from './mediaEditorial'
import type { DocumentoSocial } from '~/utils/editorial/publicacionesSociales'

export interface BorradorSocial {
  documento: DocumentoSocial
  revision: number
  estado: 'draft' | 'ready'
  actualizadoEn: string | null
}
export interface EditorPublicacionSocial {
  articulo: ArticuloDetalleEditorial
  urlCanonica: string
  dominio: string
  borrador: BorradorSocial
  medios: MedioEditorial[]
  almacenamientoDisponible: boolean
}
export interface BandejaPublicacionesSociales {
  articulos: Array<{ id: string, titulo: string, resumen: string, slug: string,
    publicadoEn: string | null, categoria: string, estado: 'pending' | 'draft' | 'ready',
    actualizadoEn: string | null, portada: string | null }>
  total: number
  pagina: number
  almacenamientoDisponible: boolean
}
