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
    expect(lectura).toContain('.limit(limiteLecturaSnapshots)')
  })

  it('no trunca la agenda de fútbol al límite histórico de 32 resultados', () => {
    const ruta = readFileSync(new URL('../../server/api/resultados/index.get.ts', import.meta.url), 'utf8')
    expect(ruta).toContain('limite: 1000')
    expect(ruta).toContain('partidosSinLimite.sort((primero, segundo) => Date.parse(primero.fechaIso) - Date.parse(segundo.fechaIso))')
    expect(ruta).toContain(': ordenarPartidosRelevantes(partidosSinLimite).slice(0, 32)')
  })

  it('no conserva snapshots vencidos en SWR y la página refresca su agenda cada minuto', () => {
    const ruta = readFileSync(new URL('../../server/api/resultados/index.get.ts', import.meta.url), 'utf8')
    const pagina = readFileSync(new URL('../../pages/partidos-hoy.vue', import.meta.url), 'utf8')
    expect(ruta).toContain('swr: false')
    expect(ruta).toContain('staleMaxAge: 0')
    expect(pagina).toContain('intervaloActualizacion = setInterval(')
    expect(pagina).toContain('void refresh()')
    expect(pagina).toContain('clearInterval(intervaloActualizacion)')
  })
})
