import { describe, expect, it } from 'vitest'
import { resolverDestinoPromocionalReproductor } from '~/utils/publicidad/destinoPromocionalReproductor'

describe('cadencia de destinos del reproductor promocional', () => {
  it('abre en el primer clic y después cada cuatro clics, rotando destinos configurados', () => {
    const destinos = ['https://anuncio-a.example/', 'https://anuncio-b.example/']
    expect(resolverDestinoPromocionalReproductor(1, destinos)).toBe(destinos[0])
    expect(resolverDestinoPromocionalReproductor(2, destinos)).toBeNull()
    expect(resolverDestinoPromocionalReproductor(4, destinos)).toBeNull()
    expect(resolverDestinoPromocionalReproductor(5, destinos)).toBe(destinos[1])
    expect(resolverDestinoPromocionalReproductor(9, destinos)).toBe(destinos[0])
  })

  it('no abre en clics inválidos ni cuando no hay enlaces disponibles', () => {
    expect(resolverDestinoPromocionalReproductor(0, ['https://anuncio.example/'])).toBeNull()
    expect(resolverDestinoPromocionalReproductor(Number.NaN, ['https://anuncio.example/'])).toBeNull()
    expect(resolverDestinoPromocionalReproductor(1, [])).toBeNull()
  })
})
