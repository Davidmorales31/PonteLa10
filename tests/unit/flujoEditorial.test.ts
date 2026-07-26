import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  esquemaTransicionEditorial,
  obtenerAccionesFlujoEditorial,
  obtenerPermisoTransicionEditorial
} from '~/utils/editorial/contenido'

describe('flujo editorial y publicación', () => {
  it('expone únicamente acciones permitidas para el rol y el estado', () => {
    const accionesAutor = obtenerAccionesFlujoEditorial('draft', [
      'contenido.enviarRevision'
    ])
    const accionesEditorJefe = obtenerAccionesFlujoEditorial('approved', [
      'contenido.revisar',
      'contenido.programar',
      'contenido.publicar',
      'contenido.archivar'
    ])

    expect(accionesAutor.map(accion => accion.id)).toEqual(['enviarRevision'])
    expect(accionesEditorJefe.map(accion => accion.id)).toEqual([
      'solicitarCambios',
      'programar',
      'publicar',
      'archivar'
    ])
  })

  it('exige observaciones y fecha cuando la transición lo necesita', () => {
    expect(esquemaTransicionEditorial.safeParse({
      estadoObjetivo: 'changes_requested',
      versionBloqueo: 3,
      nota: 'Muy corta',
      programadoPara: null
    }).success).toBe(false)

    expect(esquemaTransicionEditorial.safeParse({
      estadoObjetivo: 'scheduled',
      versionBloqueo: 3,
      nota: '',
      programadoPara: null
    }).success).toBe(false)

    expect(esquemaTransicionEditorial.safeParse({
      estadoObjetivo: 'scheduled',
      versionBloqueo: 3,
      nota: 'Programación editorial',
      programadoPara: '2026-08-01T15:00:00.000Z'
    }).success).toBe(true)
  })

  it('resuelve el permiso en servidor según transición y estado actual', () => {
    expect(obtenerPermisoTransicionEditorial('review', 'draft'))
      .toBe('contenido.enviarRevision')
    expect(obtenerPermisoTransicionEditorial('published', 'approved'))
      .toBe('contenido.publicar')
    expect(obtenerPermisoTransicionEditorial('draft', 'published'))
      .toBe('contenido.editarTodos')
  })

  it('protege el grafo, MFA, versión pública estable y programación', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/0007_editorial_workflow_publication.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain('transition_allowed')
    expect(migracion).toContain('expected_lock_version')
    expect(migracion).toContain('public.has_aal2()')
    expect(migracion).toContain('public.article_review_comments')
    expect(migracion).toContain('public.get_public_editorial_article')
    expect(migracion).toContain('article.published_version_id')
    expect(migracion).toContain('public.publish_due_editorial_articles')
    expect(migracion).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('renderiza documentos públicos sin insertar HTML arbitrario', () => {
    const rutaComponente = new URL(
      '../../components/editorial/ContenidoArticuloPublico.vue',
      import.meta.url
    )
    const componente = readFileSync(rutaComponente, 'utf8')

    expect(componente).not.toContain('v-html')
    expect(componente).toContain('documento.content')
    expect(componente).toContain('blockquote')
  })
})
