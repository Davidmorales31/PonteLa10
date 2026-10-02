import { describe, expect, it } from 'vitest'
import { normalizarUrlInsigniaFutbol } from '~/utils/insigniasFutbol'

describe('URLs de escudos de fútbol', () => {
  it('permite solo HTTPS de los hosts oficiales asociados a cada proveedor', () => {
    expect(normalizarUrlInsigniaFutbol('https://media.api-sports.io/football/teams/33.png', 'api-football'))
      .toBe('https://media.api-sports.io/football/teams/33.png')
    expect(normalizarUrlInsigniaFutbol('https://cdn.goal-api.com/assets/team.svg', 'goal-api'))
      .toBe('https://cdn.goal-api.com/assets/team.svg')
  })

  it('rechaza HTTP, hosts parecidos, proveedor cruzado y credenciales en la URL', () => {
    expect(normalizarUrlInsigniaFutbol('http://media.api-sports.io/teams/1.png', 'api-football')).toBeNull()
    expect(normalizarUrlInsigniaFutbol('https://media.api-sports.io.evil.test/teams/1.png', 'api-football')).toBeNull()
    expect(normalizarUrlInsigniaFutbol('https://media.api-sports.io/teams/1.png', 'goal-api')).toBeNull()
    expect(normalizarUrlInsigniaFutbol('https://user:pass@media.api-sports.io/teams/1.png', 'api-football')).toBeNull()
  })
})
