import { describe, expect, it } from 'vitest'
import type { MapeoProveedorDeportivo } from '../../types/entidadesDeportivas'
import type { FixtureApiFootball } from '../../types/resultados'
import { obtenerResolverIdentidadDeportiva } from '../../server/utils/repositorioEntidadesDeportivasPublicas'
import { crearResolverIdentidadDeportiva } from '../../utils/entidadesDeportivas'
import { mapearFixtureApiFootball } from '../../utils/resultadosDeportivos'

const fixture: FixtureApiFootball = {
  fixture: { id: 10, date: '2026-09-30T12:00:00Z', status: { short: 'NS' } },
  league: { id: 9, name: 'Liga de ejemplo' },
  teams: {
    home: { id: 101, name: 'Equipo con nombre original' },
    away: { id: 202, name: 'Visitante' }
  },
  goals: { home: null, away: null }
}

const mapeos: MapeoProveedorDeportivo[] = [
  { proveedor: 'api-sports', tipoEntidad: 'team', idExterno: '101', idInterno: 'equipo-interno-1' },
  { proveedor: 'the-sports-db', tipoEntidad: 'team', idExterno: '101', idInterno: 'equipo-interno-2' },
  { proveedor: 'api-sports', tipoEntidad: 'team', idExterno: '202', idInterno: 'equipo-interno-3' },
  { proveedor: 'api-sports', tipoEntidad: 'competition', idExterno: '9', idInterno: 'competencia-interna-1' },
  {
    proveedor: 'api-sports', tipoEntidad: 'fixture', idExterno: '10',
    idInterno: 'partido-interno-1', slugInterno: 'equipo-local-vs-visitante-2026-09-30'
  }
]

describe('identidades deportivas internas', () => {
  it('resuelve por proveedor, tipo de entidad e ID externo exactos', () => {
    const resolver = crearResolverIdentidadDeportiva(mapeos)

    expect(resolver('api-sports', 'team', '101')).toBe('equipo-interno-1')
    expect(resolver('the-sports-db', 'team', '101')).toBe('equipo-interno-2')
    expect(resolver('api-sports', 'competition', '101')).toBeUndefined()
    expect(resolver('api-sports', 'team', 'nombre-parecido')).toBeUndefined()
    expect(resolver('the-sports-db', 'competition', '9')).toBeUndefined()
    expect(resolver('api-sports', 'fixture', '10')).toBe('partido-interno-1')
    expect(resolver.slugInterno?.('api-sports', 'fixture', '10')).toBe('equipo-local-vs-visitante-2026-09-30')
    expect(resolver.slugInterno?.('the-sports-db', 'fixture', '10')).toBeUndefined()
  })

  it('añade IDs internos estables sin sustituir los identificadores ni nombres del proveedor', () => {
    const resolver = crearResolverIdentidadDeportiva(mapeos)
    const partidoOriginal = mapearFixtureApiFootball(fixture, resolver)
    const partidoConNombresActualizados = mapearFixtureApiFootball({
      ...fixture,
      teams: {
        home: { ...fixture.teams.home, name: 'Nombre actualizado' },
        away: { ...fixture.teams.away, name: 'Visitante actualizado' }
      }
    }, resolver)

    expect(partidoOriginal).toMatchObject({
      competenciaIdInterno: 'competencia-interna-1',
      idInterno: 'partido-interno-1',
      slugInterno: 'equipo-local-vs-visitante-2026-09-30',
      equipoLocal: { id: '101', idInterno: 'equipo-interno-1' },
      equipoVisitante: { id: '202', idInterno: 'equipo-interno-3' }
    })
    expect(partidoConNombresActualizados.equipoLocal).toMatchObject({
      id: '101', idInterno: 'equipo-interno-1', nombre: 'Nombre actualizado'
    })
    expect(partidoConNombresActualizados.equipoVisitante.idInterno).toBe('equipo-interno-3')
  })

  it('mantiene resultados disponibles cuando Supabase público no está configurado', async () => {
    const resolver = await obtenerResolverIdentidadDeportiva(undefined, 'api-sports', ['101'])

    expect(resolver('api-sports', 'team', '101')).toBeUndefined()
  })
})
