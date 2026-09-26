import type {
  BloqueEditorEditorial,
  DatosEditorArticulo,
  EstadoContenidoEditorial,
  IdPasoEditorEditorial
} from '~/types/contenidoEditorial'

interface EntradaProgresoEditor {
  datos: DatosEditorArticulo | null
  bloques: BloqueEditorEditorial[]
  tienePortada: boolean
  estado: EstadoContenidoEditorial
}

export function evaluarCompletitudEditor(
  entrada: EntradaProgresoEditor
): Record<IdPasoEditorEditorial, boolean> {
  const { datos } = entrada
  const tieneCuerpo = entrada.bloques.some(bloque =>
    bloque.tipo === 'articuloRelacionado'
      ? Boolean(bloque.articuloRelacionado)
      : Boolean(bloque.texto.trim())
  )
  const slugValido = Boolean(
    datos?.slug.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  )

  return {
    contenido: Boolean(
      datos
      && datos.titulo.trim().length >= 8
      && datos.resumen.trim().length >= 20
      && tieneCuerpo
    ),
    presentacion: Boolean(
      datos?.categoriaId
      && slugValido
    ),
    seo: Boolean(
      datos
      && (datos.seo.titulo || datos.titulo).trim().length >= 8
      && datos.seo.descripcion.trim().length >= 40
    ),
    revision: ['review', 'approved', 'scheduled', 'published'].includes(entrada.estado)
  }
}
