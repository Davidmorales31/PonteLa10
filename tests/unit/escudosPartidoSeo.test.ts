import { describe, expect, it } from 'vitest'
import { obtenerEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'

describe('escudos de las creatividades SEO de partido', () => {
  it('incluye escudos conocidos en el bundle y no depende de una URL externa', () => {
    expect(obtenerEscudoPartidoSeo('Atlético Nacional')).toMatch(/^data:image\/webp;base64,/)
    expect(obtenerEscudoPartidoSeo('Fortaleza')).toMatch(/^data:image\/webp;base64,/)
    expect(obtenerEscudoPartidoSeo('Deportivo Pasto')).toMatch(/^data:image\/webp;base64,/)
  })

  it('deja iniciales como fallback si el nombre no tiene una imagen local', () => {
    expect(obtenerEscudoPartidoSeo('Club sin escudo disponible')).toBeNull()
  })
})
