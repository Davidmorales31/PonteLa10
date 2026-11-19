import { describe, expect, it } from 'vitest'
import { listarClubesMexicoPublicos, relacionarClubesMexico } from '../../server/utils/relacionesClubesMexico'

const clubes = [
  { clave: 'cruz-azul', nombre: 'Cruz Azul' },
  { clave: 'club-america', nombre: 'Club América' },
  { clave: 'guadalajara', nombre: 'Guadalajara' },
  { clave: 'pumas-unam', nombre: 'Pumas UNAM' },
  { clave: 'leon', nombre: 'León' }
]

describe('enlaces a clubes de la Liga MX', () => {
  it('enlaza los clubes nombrados, en orden de aparición y con ruta de clubes', () => {
    const relaciones = relacionarClubesMexico('El América derrotó a Cruz Azul; antes, Club América ya ganaba.', clubes)
    expect(relaciones.map(r => r.slug)).toEqual(['club-america', 'cruz-azul'])
    expect(relaciones[0]).toEqual({ tipo: 'team', slug: 'club-america', nombre: 'Club América', ruta: '/clubes/club-america', relacion: 'mentions' })
  })

  it('reconoce el nombre sin prefijo y sin tildes, pero no palabras que lo contienen', () => {
    expect(relacionarClubesMexico('america gana el clásico', clubes).map(r => r.slug)).toEqual(['club-america'])
    expect(relacionarClubesMexico('Los leones del zoológico y la región leonesa', clubes)).toEqual([])
    expect(relacionarClubesMexico('Sin clubes aquí', clubes)).toEqual([])
  })

  it('limita la cantidad de enlaces', () => {
    const texto = 'Cruz Azul, Club América, Guadalajara, Pumas UNAM y León'
    expect(relacionarClubesMexico(texto, clubes, 3)).toHaveLength(3)
  })

  it('lista los clubes públicos de la tabla y tolera errores de la consulta', async () => {
    const consulta = (resultado: unknown) => {
      const cadena: Record<string, unknown> = {}
      for (const metodo of ['select', 'eq', 'order']) cadena[metodo] = () => cadena
      cadena.limit = () => Promise.resolve(resultado)
      return { from: () => cadena } as never
    }
    const filas = [{ team_key: 'cruz-azul', team_name: 'Cruz Azul' }, { team_key: 'cruz-azul', team_name: 'Cruz Azul' }, { team_key: null, team_name: 'Pumas UNAM' }]
    await expect(listarClubesMexicoPublicos(consulta({ data: filas, error: null }))).resolves.toEqual([
      { clave: 'cruz-azul', nombre: 'Cruz Azul' }, { clave: 'pumas-unam', nombre: 'Pumas UNAM' }
    ])
    await expect(listarClubesMexicoPublicos(consulta({ data: null, error: { message: 'x' } }))).resolves.toEqual([])
  })
})
