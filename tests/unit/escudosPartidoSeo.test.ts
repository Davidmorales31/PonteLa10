import { describe, expect, it } from 'vitest'
import { obtenerEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'

describe('escudos de las creatividades SEO de partido', () => {
  it('lee logos permitidos del almacenamiento de assets sin consultar URLs externas', async () => {
    const almacenamiento = {
      getItemRaw: async (ruta: string) => ruta.endsWith('/atletico-nacional.webp')
        ? Buffer.from('webp-atletico-nacional')
        : ruta.endsWith('/fortaleza-ceif.webp')
          ? Buffer.from('webp-fortaleza')
          : ruta.endsWith('/deportivo-pasto.webp')
            ? Buffer.from('webp-pasto')
            : null
    }

    await expect(obtenerEscudoPartidoSeo('Atlético Nacional', almacenamiento))
      .resolves.toBe(`data:image/webp;base64,${Buffer.from('webp-atletico-nacional').toString('base64')}`)
    await expect(obtenerEscudoPartidoSeo('Fortaleza', almacenamiento))
      .resolves.toBe(`data:image/webp;base64,${Buffer.from('webp-fortaleza').toString('base64')}`)
    await expect(obtenerEscudoPartidoSeo('Deportivo Pasto', almacenamiento))
      .resolves.toBe(`data:image/webp;base64,${Buffer.from('webp-pasto').toString('base64')}`)
  })

  it('deja iniciales como fallback si el nombre no tiene una imagen local', async () => {
    const almacenamiento = { getItemRaw: async () => null }
    await expect(obtenerEscudoPartidoSeo('Club sin escudo disponible', almacenamiento)).resolves.toBeNull()
  })
})
