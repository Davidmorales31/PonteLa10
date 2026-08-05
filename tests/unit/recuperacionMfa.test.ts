import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('recuperación de contraseña con MFA', () => {
  it('eleva la sesión a AAL2 antes de actualizar la contraseña', () => {
    const formulario = readFileSync(new URL(
      '../../components/FormularioLoginEditorial.vue',
      import.meta.url
    ), 'utf8')
    const autenticacion = readFileSync(new URL(
      '../../composables/useAutenticacionEditorial.ts',
      import.meta.url
    ), 'utf8')
    const mfa = readFileSync(new URL(
      '../../composables/useMfaEditorial.ts',
      import.meta.url
    ), 'utf8')

    expect(mfa).toContain('getAuthenticatorAssuranceLevel')
    expect(mfa).toContain("currentLevel === 'aal1'")
    expect(mfa).toContain("nextLevel === 'aal2'")
    expect(mfa).toContain('$clienteSupabase.auth.mfa.challenge')
    expect(mfa).toContain('$clienteSupabase.auth.mfa.verify')
    expect(formulario).toContain("prepararVerificacionMfa('actualizarContrasena')")
    expect(formulario).toContain('verificarSesionMfa')
    expect(formulario).toContain('autocomplete="one-time-code"')
    expect(autenticacion).toContain('clienteSupabase.auth.updateUser')
    expect(formulario).not.toContain('service_role')
  })
})
