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

  it('otorga acceso base al panel a todos los roles editoriales', () => {
    rolesEditoriales.forEach((rol) => {
      expect(permisosPorRol[rol]).toContain('panel.acceder')
    })
  })

  it('reserva publicación y gestión del equipo para los roles definidos', () => {
    expect(permisosPorRol.propietario).toContain('contenido.publicar')
    expect(permisosPorRol.administrador).toContain('equipo.gestionar')
    expect(permisosPorRol.editorJefe).toContain('contenido.publicar')
    expect(permisosPorRol.editor).not.toContain('contenido.publicar')
    expect(permisosPorRol.autor).not.toContain('equipo.gestionar')
    expect(permisosPorRol.colaborador).not.toContain('contenido.aprobar')
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
    const rutaMigracion = new URL(
      '../../supabase/migrations/0003_cms_editorial_foundation.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    permisosEditoriales.forEach((permiso) => {
      expect(migracion).toContain(`'${permiso}'`)
    })

    rolesEditoriales.forEach((rol) => {
      expect(migracion).toContain(`'${rol}'`)
    })
  })
})
