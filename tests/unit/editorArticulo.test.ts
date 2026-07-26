import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  esquemaAutoguardadoArticulo,
  esquemaGuardarArticulo
} from '~/utils/editorial/contenido'
import {
  convertirBloquesADocumento,
  convertirDocumentoABloques,
  estimarMinutosLectura,
  extraerTextoDocumento
} from '~/utils/editorial/documento'

const datosValidos = {
  titulo: 'Colombia prepara una nueva jornada internacional',
  slug: 'colombia-prepara-nueva-jornada',
  resumen: 'Claves y protagonistas antes del próximo partido.',
  tipo: 'noticia' as const,
  categoriaId: null,
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
})
