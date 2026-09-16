import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizarRedireccionInterna } from '~/utils/auth/redirecciones'
import {
  permisosEditoriales,
  permisosPorRol,
  requiereMfaEditorial,
  rolesEditoriales,
  tienePermisoEditorial
} from '~/utils/editorial/permisos'

describe('seguridad editorial', () => {
  it('rechaza redirecciones externas después del login', () => {
    expect(normalizarRedireccionInterna('https://sitio-malicioso.test')).toBe('/')
    expect(normalizarRedireccionInterna('//sitio-malicioso.test')).toBe('/')
    expect(normalizarRedireccionInterna('/\\sitio-malicioso.test')).toBe('/')
    expect(normalizarRedireccionInterna('/admin/seguridad')).toBe('/admin/seguridad')
  })

  it('otorga acceso base al panel a todos los roles editoriales humanos', () => {
    rolesEditoriales.filter(rol => rol !== 'workerIngesta').forEach((rol) => {
      expect(permisosPorRol[rol]).toContain('panel.acceder')
    })
    expect(permisosPorRol.workerIngesta).not.toContain('panel.acceder')
  })

  it('reserva publicación y gestión del equipo para los roles definidos', () => {
    expect(permisosPorRol.propietario).toContain('contenido.publicar')
    expect(permisosPorRol.administrador).toContain('equipo.gestionar')
    expect(permisosPorRol.editorJefe).toContain('contenido.publicar')
    expect(permisosPorRol.editor).not.toContain('contenido.publicar')
    expect(permisosPorRol.autor).not.toContain('equipo.gestionar')
    expect(permisosPorRol.colaborador).not.toContain('contenido.aprobar')
    expect(permisosPorRol.propietario).toContain('contenido.eliminar')
    expect(permisosPorRol.administrador).toContain('contenido.eliminar')
    expect(permisosPorRol.propietario).toContain('ingestas.eliminar')
    expect(permisosPorRol.administrador).toContain('ingestas.eliminar')
    expect(permisosPorRol.editorJefe).not.toContain('contenido.eliminar')
  })

  it('exige MFA para roles sensibles o capacidad de publicar', () => {
    expect(requiereMfaEditorial(['propietario'], permisosPorRol.propietario)).toBe(true)
    expect(requiereMfaEditorial(['editorJefe'], permisosPorRol.editorJefe)).toBe(true)
    expect(requiereMfaEditorial(['autor'], permisosPorRol.autor)).toBe(false)
  })

  it('evalúa capacidades explícitas sin depender del nombre del rol', () => {
    expect(tienePermisoEditorial(permisosPorRol.editor, 'contenido.revisar')).toBe(true)
    expect(tienePermisoEditorial(permisosPorRol.editor, 'contenido.aprobar')).toBe(false)
  })

  it('mantiene sincronizados permisos y roles con la migración de Supabase', () => {
    const rutaMigracionFundacion = new URL(
      '../../supabase/migrations/0003_cms_editorial_foundation.sql',
      import.meta.url
    )
    const rutaMigracionEliminacion = new URL(
      '../../supabase/migrations/0009_editorial_quick_actions_and_deletion.sql',
      import.meta.url
    )
    const rutaMigracionIngestaDurable = new URL(
      '../../supabase/migrations/0013_ingesta_worker_durable.sql',
      import.meta.url
    )
    const rutaMigracionEliminarIngestas = new URL(
      '../../supabase/migrations/0014_eliminar_ingestas_fallidas.sql',
      import.meta.url
    )
    const migraciones = [
      readFileSync(rutaMigracionFundacion, 'utf8'),
      readFileSync(rutaMigracionEliminacion, 'utf8'),
      readFileSync(rutaMigracionIngestaDurable, 'utf8'),
      readFileSync(rutaMigracionEliminarIngestas, 'utf8')
    ].join('\n')

    permisosEditoriales.forEach((permiso) => {
      expect(migraciones).toContain(`'${permiso}'`)
    })

    rolesEditoriales.forEach((rol) => {
      expect(migraciones).toContain(`'${rol}'`)
    })
  })
})
