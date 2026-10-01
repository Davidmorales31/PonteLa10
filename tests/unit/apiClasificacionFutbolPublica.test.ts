import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const ruta = new URL('../../server/api/futbol/clasificacion.get.ts', import.meta.url)

describe('API SSR pública de clasificación', () => {
  it('lee sólo snapshots aprobados y proyecta el resultado', () => {
    const contenido = readFileSync(ruta, 'utf8')
    expect(contenido).toContain(".eq('competition_id', competencia.data)")
    expect(contenido).toContain("z.string().uuid().safeParse(String(configuracion.futbolLigaBetplayCompetitionId || '').trim())")
    expect(contenido).toContain(".order('provider_fetched_at', { ascending: false })")
    expect(contenido).toContain('proyectarStandingsFutbolPublicos(data)')

    const configuracion = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')
    expect(configuracion).toContain('futbolLigaBetplayCompetitionId: process.env.NUXT_FUTBOL_LIGA_BETPLAY_COMPETITION_ID ||')
  })

  it('no consulta proveedores ni filtra payload crudo', () => {
    const contenido = readFileSync(ruta, 'utf8')
    expect(contenido).not.toContain('crearProveedoresFutbolConfigurados')
    expect(contenido).not.toContain('obtenerClasificacion(')
    expect(contenido).toContain('proyectarStandingsFutbolPublicos(data)')
    expect(contenido).not.toContain('return data')
  })
})
