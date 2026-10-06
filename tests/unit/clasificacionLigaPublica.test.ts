import { describe, expect, it } from 'vitest'
import { proyectarClasificacionLigaPublica } from '~/server/utils/clasificacionLigaPublica'

describe('publicación acotada de clasificaciones colombianas', () => {
  const bases = [
    { competition_slug: 'liga-betplay', season: '2026-II', phase: 'Todos contra todos', team_key: 'independiente-medellin',
      team_name: 'Independiente Medellín', team_logo_url: '/images/escudos/liga-colombiana/independiente-medellin.png',
      is_public: true, publication_rights_confirmed: true }
  ]

  it('refresca posiciones y conserva escudo y autorización de la fila pública existente', () => {
    const filas = proyectarClasificacionLigaPublica([{
      provider: 'goal-api', league_name: 'Primera A', season: '2026',
      standings: { grupos: [{ nombre: 'Tabla', etapa: 'Regular Season', filas: [{
        posicion: 1, equipo: { nombre: 'Ind. Medellín' }, jugados: 13, ganados: 8, empatados: 3,
        perdidos: 2, golesFavor: 22, golesContra: 11, diferenciaGoles: 11, puntos: 27
      }] }] },
      provider_fetched_at: '2026-10-05T23:00:00.000Z'
    }], bases, '2026-10-05')

    expect(filas).toEqual([expect.objectContaining({
      competition_slug: 'liga-betplay', season: '2026-II', phase: 'Todos contra todos',
      team_key: 'independiente-medellin', team_logo_url: bases[0]!.team_logo_url,
      position: 1, played: 13, points: 27,
      is_public: true, publication_rights_confirmed: true,
      source_name: 'Goal API'
    })])
  })

  it('deja fuera filas privadas o equipos que no tienen una base autorizada', () => {
    const filas = proyectarClasificacionLigaPublica([{
      provider: 'goal-api', league_name: 'Primera A', season: '2026',
      standings: { grupos: [{ nombre: 'Grupo A', etapa: 'Cuadrangulares', filas: [{
        posicion: 1, equipo: { nombre: 'Equipo sin autorización' }, jugados: 1, ganados: 1, empatados: 0,
        perdidos: 0, golesFavor: 2, golesContra: 0, diferenciaGoles: 2, puntos: 3
      }] }] }, provider_fetched_at: '2026-10-05T23:00:00.000Z'
    }], [{ ...bases[0]!, is_public: false }], '2026-10-05')

    expect(filas).toEqual([])
  })

  it('no hereda a cuadrangulares el permiso de publicación de todos contra todos', () => {
    const filas = proyectarClasificacionLigaPublica([{
      provider: 'api-football', league_name: 'Primera A', season: '2026',
      standings: { grupos: [{ nombre: 'Group A', etapa: 'Cuadrangulares', filas: [{
        posicion: 1, equipo: { nombre: 'Independiente Medellín' }, jugados: 1, ganados: 1, empatados: 0,
        perdidos: 0, golesFavor: 2, golesContra: 0, diferenciaGoles: 2, puntos: 3
      }] }] }, provider_fetched_at: '2026-10-05T23:00:00.000Z'
    }], bases, '2026-10-05')

    expect(filas).toEqual([])
  })

  it('actualiza cuadrangulares cuando existe una fila base autorizada para esa fase', () => {
    const faseAutorizada = { ...bases[0]!, phase: 'Cuadrangulares · Grupo A' }
    const filas = proyectarClasificacionLigaPublica([{
      provider: 'api-football', league_name: 'Primera A', season: '2026',
      standings: { grupos: [{ nombre: 'Group A', etapa: 'Cuadrangulares', filas: [{
        posicion: 1, equipo: { nombre: 'Independiente Medellín' }, jugados: 1, ganados: 1, empatados: 0,
        perdidos: 0, golesFavor: 2, golesContra: 0, diferenciaGoles: 2, puntos: 3
      }] }] }, provider_fetched_at: '2026-10-05T23:00:00.000Z'
    }], [faseAutorizada], '2026-10-05')

    expect(filas[0]).toMatchObject({ phase: 'Cuadrangulares · Grupo A', position: 1, source_name: 'API-Football' })
  })

  it('rechaza estadísticas incoherentes antes de escribirlas en la tabla pública', () => {
    const filas = proyectarClasificacionLigaPublica([{
      provider: 'goal-api', league_name: 'Primera A', season: '2026',
      standings: { grupos: [{ nombre: 'Tabla', etapa: 'Regular Season', filas: [{
        posicion: 1, equipo: { nombre: 'Ind. Medellín' }, jugados: 3, ganados: 3, empatados: 0,
        perdidos: 0, golesFavor: 4, golesContra: 0, diferenciaGoles: 7, puntos: 9
      }] }] }, provider_fetched_at: '2026-10-05T23:00:00.000Z'
    }], bases, '2026-10-05')

    expect(filas).toEqual([])
  })
})
