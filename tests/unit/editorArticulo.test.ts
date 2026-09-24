import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  esEstadoEditableContenido,
  esquemaAutoguardadoArticulo,
  esquemaEliminarArticulo,
  esquemaGuardarArticulo
} from '~/utils/editorial/contenido'
import {
  convertirBloquesADocumento,
  convertirDocumentoABloques,
  estimarMinutosLectura,
  extraerTextoDocumento
} from '~/utils/editorial/documento'
import { evaluarCompletitudEditor } from '~/utils/editorial/progresoEditor'

const datosValidos = {
  titulo: 'Colombia prepara una nueva jornada internacional',
  slug: 'colombia-prepara-nueva-jornada',
  resumen: 'Claves y protagonistas antes del próximo partido.',
  tipo: 'noticia' as const,
  categoriaId: null,
  portadaId: null,
  temaIds: [],
  etiquetaIds: [],
  documento: {
    type: 'doc' as const,
    content: [{
      type: 'paragraph' as const,
      content: [{
        type: 'text' as const,
        text: 'La selección trabaja en los últimos detalles.'
      }]
    }]
  },
  fuente: {
    url: 'https://example.com/fuente',
    nombre: 'Fuente deportiva',
    autor: 'Equipo de prensa',
    creditos: 'Imagen y datos suministrados por la fuente.'
  },
  seo: {
    titulo: 'Colombia prepara una nueva jornada',
    descripcion: 'Las claves de la selección antes de su siguiente partido.',
    textoSocial: 'Colombia ya piensa en su próximo reto.'
  }
}

describe('editor de artículos', () => {
  it('solo habilita edición antes de revisión o cuando se solicitaron cambios', () => {
    expect(esEstadoEditableContenido('draft')).toBe(true)
    expect(esEstadoEditableContenido('changes_requested')).toBe(true)
    expect(esEstadoEditableContenido('review')).toBe(false)
    expect(esEstadoEditableContenido('approved')).toBe(false)
    expect(esEstadoEditableContenido('published')).toBe(false)
  })

  it('convierte bloques estructurados sin perder texto ni orden', () => {
    const documento = convertirBloquesADocumento([
      { id: 'uno', tipo: 'encabezado2', texto: 'La previa' },
      { id: 'dos', tipo: 'parrafo', texto: 'Colombia ultima detalles.' },
      { id: 'tres', tipo: 'lista', texto: 'Convocados\nHorario\nTransmisión' }
    ])

    expect(extraerTextoDocumento(documento)).toContain('La previa')
    expect(extraerTextoDocumento(documento)).toContain('Convocados\nHorario')

    const bloques = convertirDocumentoABloques(documento)
    expect(bloques.map(bloque => bloque.tipo)).toEqual([
      'encabezado2',
      'parrafo',
      'lista'
    ])
  })

  it('calcula un tiempo de lectura mínimo y estable', () => {
    const documento = convertirBloquesADocumento([
      { id: 'uno', tipo: 'parrafo', texto: 'Una noticia breve.' }
    ])

    expect(estimarMinutosLectura(documento)).toBe(1)
  })

  it('conserva las referencias internas como bloques estructurados', () => {
    const articuloRelacionado = {
      articuloId: '127758f0-f1ec-4bd4-a4d1-683ca6c4d6e2',
      slug: 'una-historia-publicada',
      titulo: 'Una historia publicada para seguir leyendo',
      resumen: 'Contexto adicional relacionado con la publicación actual.',
      categoria: 'Tendencias',
      imagen: 'https://example.com/portada.jpg'
    }
    const documento = convertirBloquesADocumento([{
      id: 'relacionado',
      tipo: 'articuloRelacionado',
      texto: '',
      articuloRelacionado
    }])

    expect(documento.content[0]).toEqual({
      type: 'articuloRelacionado',
      attrs: articuloRelacionado
    })
    expect(convertirDocumentoABloques(documento)[0]?.articuloRelacionado)
      .toEqual(articuloRelacionado)
  })

  it('impide repetir una noticia relacionada en el mismo documento', () => {
    const enlace = {
      type: 'articuloRelacionado' as const,
      attrs: {
        articuloId: '127758f0-f1ec-4bd4-a4d1-683ca6c4d6e2',
        slug: 'una-historia-publicada',
        titulo: 'Una historia publicada para seguir leyendo',
        resumen: 'Contexto adicional.',
        categoria: 'Tendencias',
        imagen: ''
      }
    }

    expect(esquemaGuardarArticulo.safeParse({
      ...datosValidos,
      versionBloqueo: 2,
      documento: {
        type: 'doc',
        content: [enlace, enlace]
      }
    }).success).toBe(false)
  })

  it('genera identificadores estables para hidratar el editor', () => {
    const documentoVacio = {
      type: 'doc' as const,
      content: []
    }

    expect(convertirDocumentoABloques(documentoVacio)[0]?.id).toBe('bloque-1')
    expect(convertirDocumentoABloques(datosValidos.documento)[0]?.id)
      .toBe('bloque-1')
  })

  it('valida el guardado manual y su versión optimista', () => {
    expect(esquemaGuardarArticulo.safeParse({
      ...datosValidos,
      versionBloqueo: 2,
      notaCambio: 'Ajuste de enfoque'
    }).success).toBe(true)

    expect(esquemaGuardarArticulo.safeParse({
      ...datosValidos,
      slug: 'Slug Inválido',
      versionBloqueo: 0
    }).success).toBe(false)
  })

  it('permite autoguardar campos parciales sin relajar sus límites', () => {
    expect(esquemaAutoguardadoArticulo.safeParse({
      versionBase: 3,
      datos: {
        ...datosValidos,
        titulo: 'En proceso',
        slug: '',
        fuente: {
          ...datosValidos.fuente,
          url: 'https://fuente-en-proceso'
        }
      }
    }).success).toBe(true)

    expect(esquemaAutoguardadoArticulo.safeParse({
      versionBase: 3,
      datos: {
        ...datosValidos,
        titulo: 'x'.repeat(161)
      }
    }).success).toBe(false)
  })

  it('calcula el avance del editor por requisitos reales de cada etapa', () => {
    const completitud = evaluarCompletitudEditor({
      datos: {
        ...datosValidos,
        categoriaId: '127758f0-f1ec-4bd4-a4d1-683ca6c4d6e2',
        portadaId: '127758f0-f1ec-4bd4-a4d1-683ca6c4d6e2'
      },
      bloques: convertirDocumentoABloques(datosValidos.documento),
      tienePortada: true,
      estado: 'review'
    })

    expect(completitud).toEqual({
      contenido: true,
      presentacion: true,
      seo: true,
      revision: true
    })
  })

  it('mantiene pendientes las etapas incompletas sin bloquear la navegación', () => {
    const completitud = evaluarCompletitudEditor({
      datos: {
        ...datosValidos,
        resumen: '',
        slug: 'Slug inválido',
        seo: { titulo: '', descripcion: '', textoSocial: '' }
      },
      bloques: [],
      tienePortada: false,
      estado: 'draft'
    })

    expect(completitud).toEqual({
      contenido: false,
      presentacion: false,
      seo: false,
      revision: false
    })
  })

  it('mantiene el guardado atómico bajo RLS y sin service role', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/0005_editorial_draft_editor.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain('public.save_editorial_article')
    expect(migracion).toContain('security invoker')
    expect(migracion).toContain('expected_lock_version')
    expect(migracion).toContain('public.can_edit_article(target_article_id)')
    expect(migracion).toContain('article_autosaves')
    expect(migracion).not.toContain('service_role')
  })

  it('protege la eliminación definitiva con confirmación, permiso y MFA', () => {
    expect(esquemaEliminarArticulo.safeParse({
      confirmacion: 'Una noticia completa para eliminar'
    }).success).toBe(true)
    expect(esquemaEliminarArticulo.safeParse({
      confirmacion: 'corto'
    }).success).toBe(false)

    const rutaMigracion = new URL(
      '../../supabase/migrations/0009_editorial_quick_actions_and_deletion.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain("'contenido.eliminar'")
    expect(migracion).toContain('public.delete_editorial_article')
    expect(migracion).toContain('public.has_aal2()')
    expect(migracion).toContain('on public.articles for delete')
    expect(migracion).toContain('security invoker')
    expect(migracion).not.toContain('service_role')
  })

  it('resuelve enlaces públicos sin exponer borradores', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/0008_editorial_internal_links.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain('resolve_public_editorial_links')
    expect(migracion).toContain('published_version_id')
    expect(migracion).toContain("status::text <> 'archived'")
    expect(migracion).toContain('requested_ids[1:8]')
    expect(migracion).not.toContain('service_role')
  })
})
