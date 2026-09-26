import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  esquemaAprobarProgramarEditorial,
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

  it('solo ofrece aprobación y programación automática con ambos permisos y confirmación explícita', () => {
    const soloAprobar = obtenerAccionesFlujoEditorial('review', ['contenido.aprobar'])
    const aprobarYProgramar = obtenerAccionesFlujoEditorial('review', [
      'contenido.aprobar',
      'contenido.programar'
    ])

    expect(soloAprobar.map(accion => accion.id)).toContain('aprobar')
    expect(soloAprobar.map(accion => accion.id)).not.toContain('aprobarYProgramar')
    expect(aprobarYProgramar.map(accion => accion.id)).toContain('aprobarYProgramar')
    expect(esquemaAprobarProgramarEditorial.safeParse({
      versionBloqueo: 2,
      confirmar: true
    }).success).toBe(true)
    expect(esquemaAprobarProgramarEditorial.safeParse({
      versionBloqueo: 2,
      confirmar: false
    }).success).toBe(false)
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

  it('reserva slots sin colisiones y exige permisos, MFA, versión y consentimiento en una transacción', () => {
    const nuevaMigracion = readFileSync(new URL(
      '../../supabase/migrations/20260926085214_hu_ed_12_aprobar_programar_siguiente_slot.sql',
      import.meta.url
    ), 'utf8')

    expect(nuevaMigracion).toContain('public.approve_and_schedule_editorial_article')
    expect(nuevaMigracion).toContain("public.has_editorial_permission('contenido.aprobar')")
    expect(nuevaMigracion).toContain("public.has_editorial_permission('contenido.programar')")
    expect(nuevaMigracion).toContain('public.has_aal2()')
    expect(nuevaMigracion).toContain('p_confirmed is not true')
    expect(nuevaMigracion).toContain('v_article.lock_version <> p_expected_lock_version')
    expect(nuevaMigracion).toContain('pg_advisory_xact_lock')
    expect(nuevaMigracion).toContain('public.enforce_editorial_publication_spacing()')
    expect(nuevaMigracion).toContain('occupied.scheduled_at > new.scheduled_at - make_interval(mins => v_interval)')
    expect(nuevaMigracion).toContain("'APROBADO_SIN_SLOT'")
    expect(nuevaMigracion).toContain("grant execute on function public.approve_and_schedule_editorial_article(uuid, integer, boolean)\n  to authenticated")
    expect(nuevaMigracion).toContain("set status = 'approved'::public.article_status")
    expect(nuevaMigracion).toContain("set status = 'scheduled'::public.article_status")
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
