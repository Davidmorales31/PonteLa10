import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listarProgramacionesTransmisionPublicas, listarSlugsConTransmisionVerificada } from '../../server/utils/partidosSeoPublicos'
import { esquemaProgramacionTransmision } from '../../utils/partidos/programacion'

const entradaValida = {
  matchSlug: 'atletico-nacional-vs-millonarios',
  countryCode: 'CO',
  channel: 'Canal Fútbol',
  platform: 'TV por suscripción',
  distributionType: 'paid_tv',
  sourceUrl: 'https://emisor.example.com/programacion/partidos',
  status: 'confirmed',
  notes: 'Disponible en Colombia'
}

function crearClienteConsulta(respuesta: { data: unknown[] | null, error: { code?: string } | null }) {
  const llamadas: Array<[string, unknown, unknown?]> = []
  const consulta = {
    select: vi.fn(() => consulta),
    eq: vi.fn((campo: string, valor: unknown) => { llamadas.push(['eq', campo, valor]); return consulta }),
    not: vi.fn((campo: string, operador: string, valor: unknown) => { llamadas.push(['not', campo, `${operador}:${valor}`]); return consulta }),
    order: vi.fn(() => consulta),
    limit: vi.fn(async () => respuesta)
  }
  const cliente = { from: vi.fn(() => consulta) } as unknown as SupabaseClient
  return { cliente, llamadas, consulta }
}

describe('programación verificable de transmisiones', () => {
  it('acepta fuente HTTPS y normaliza el texto de la entrada', () => {
    expect(esquemaProgramacionTransmision.parse(entradaValida)).toMatchObject({
      matchSlug: entradaValida.matchSlug,
      sourceUrl: entradaValida.sourceUrl,
      notes: entradaValida.notes
    })
  })

  it.each([
    ['fuente HTTP', { sourceUrl: 'http://emisor.example.com/partidos' }],
    ['país inválido', { countryCode: 'col' }],
    ['slug inválido', { matchSlug: '../partido' }],
    ['estado no permitido', { status: 'confirmed-by-provider' }]
  ])('rechaza %s', (_descripcion, cambio) => {
    expect(esquemaProgramacionTransmision.safeParse({ ...entradaValida, ...cambio }).success).toBe(false)
  })

  it('solo devuelve filas confirmadas con sello de verificación y fuente', async () => {
    const { cliente, llamadas, consulta } = crearClienteConsulta({
      data: [
        {
          id: 'registro-1', match_slug: entradaValida.matchSlug, country_code: 'CO',
          channel: 'Canal Fútbol', platform: 'TV', distribution_type: 'paid_tv',
          source_url: entradaValida.sourceUrl, status: 'confirmed',
          verified_at: '2026-10-06T12:00:00Z', notes: null
        },
        {
          id: 'registro-2', match_slug: entradaValida.matchSlug, country_code: 'CO',
          channel: 'Pendiente', platform: 'Web', distribution_type: 'free_streaming',
          source_url: entradaValida.sourceUrl, status: 'unconfirmed',
          verified_at: null, notes: null
        }
      ],
      error: null
    })

    const resultado = await listarProgramacionesTransmisionPublicas(cliente, entradaValida.matchSlug)

    expect(resultado).toEqual([{
      id: 'registro-1', matchSlug: entradaValida.matchSlug, countryCode: 'CO',
      channel: 'Canal Fútbol', platform: 'TV', distributionType: 'paid_tv',
      sourceUrl: entradaValida.sourceUrl, status: 'confirmed',
      verifiedAt: '2026-10-06T12:00:00Z', notes: null
    }])
    expect(consulta.select).toHaveBeenCalledWith('id,match_slug,country_code,channel,platform,distribution_type,source_url,status,verified_at,notes')
    expect(llamadas).toContainEqual(['eq', 'status', 'confirmed'])
  })

  it('degrada a lista vacía antes de aplicar la migración y lista slugs públicos indexables', async () => {
    const sinMigracion = crearClienteConsulta({ data: null, error: { code: 'PGRST205' } })
    await expect(listarProgramacionesTransmisionPublicas(sinMigracion.cliente, entradaValida.matchSlug)).resolves.toEqual([])

    const clienteConSlugs = crearClienteConsulta({
      data: [{ match_slug: 'partido-confirmado' }], error: null
    })
    await expect(listarSlugsConTransmisionVerificada(clienteConSlugs.cliente)).resolves.toEqual(new Set(['partido-confirmado']))
  })
})
