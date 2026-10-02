import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('API SSR pública de fixtures', () => {
  it('solo habilita publicación global desde configuración privada y mantiene mappings', () => {
    const ruta = readFileSync(new URL('../../server/api/futbol/fixtures.get.ts', import.meta.url), 'utf8')
    const lectura = readFileSync(new URL('../../server/utils/lecturaSnapshotsFutbol.ts', import.meta.url), 'utf8')
    const configuracion = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')
    expect(ruta).toContain('leerSnapshotsFutbolPublicos(cliente')
    expect(ruta).not.toContain('crearProveedoresFutbolConfigurados')
    expect(configuracion).toContain("process.env.NUXT_FUTBOL_DERECHOS_PUBLICACION_CONFIRMADOS === 'true'")
    expect(ruta).toContain('derechosPublicacionConfirmados: configuracion.futbolDerechosPublicacionConfirmados === true')
    expect(lectura).toContain('filtros.derechosPublicacionConfirmados !== true')
    expect(lectura).toContain("consulta = consulta.eq('is_public', true).eq('publication_rights_confirmed', true)")
    expect(lectura).toContain('validarIdentidadesPublicas(cliente, filas, exigirAutorizacionPorRegistro)')
    expect(lectura).toContain('proyectarFixtureFutbolPublico(')
    expect(lectura).toContain("tieneMapping(mappingsPorClave, proveedor, 'fixture'")
  })
})
