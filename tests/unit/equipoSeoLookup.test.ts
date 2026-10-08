import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { obtenerEquipoLigaPublicoPorSlug } from '~/server/utils/equiposLigaPublicos'

const fila = {
  competition_slug: 'liga-betplay',
  season: '2026',
  phase: 'Todos contra todos',
  team_key: 'atletico-nacional',
  team_name: 'Atlético Nacional',
  position: 2,
  played: 14,
  won: 8,
  drawn: 3,
  lost: 3,
  goals_for: 22,
  goals_against: 12,
  goal_difference: 10,
  points: 27,
  team_logo_url: '/images/escudos/liga-colombiana/atletico-nacional.png',
  checked_at: '2026-10-08T12:00:00.000Z',
  is_public: true,
  publication_rights_confirmed: true
}

function crearClienteFiltrado(data: unknown, error: unknown = null) {
  const consulta = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn()
  }
  consulta.select.mockReturnValue(consulta)
  consulta.eq.mockReturnValue(consulta)
  consulta.order.mockReturnValue(consulta)
  consulta.limit.mockResolvedValue({ data, error })
  const cliente = { from: vi.fn(() => consulta) }
  return { cliente: cliente as unknown as SupabaseClient, consulta }
}

describe('consulta pública de ficha social de equipo', () => {
  it('filtra por team_key y derechos antes de proyectar como máximo 50 filas', async () => {
    const { cliente, consulta } = crearClienteFiltrado([fila])
    const equipo = await obtenerEquipoLigaPublicoPorSlug(cliente, 'atletico-nacional')

    expect(consulta.eq).toHaveBeenCalledWith('team_key', 'atletico-nacional')
    expect(consulta.eq).toHaveBeenCalledWith('is_public', true)
    expect(consulta.eq).toHaveBeenCalledWith('publication_rights_confirmed', true)
    expect(consulta.limit).toHaveBeenCalledWith(50)
    expect(equipo).toMatchObject({ slug: 'atletico-nacional', nombre: 'Atlético Nacional' })
  })

  it('no convierte un error de la base en un 404 del equipo', async () => {
    const { cliente } = crearClienteFiltrado(null, { message: 'fallo de lectura' })

    await expect(obtenerEquipoLigaPublicoPorSlug(cliente, 'atletico-nacional'))
      .rejects.toMatchObject({ statusCode: 503 })
  })
})
