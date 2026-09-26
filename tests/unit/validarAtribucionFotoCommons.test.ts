import { afterEach, describe, expect, it, vi } from 'vitest'
import { verificarAtribucionFotoCommons } from '~/server/utils/validarAtribucionFotoCommons'

const urlFuente = 'https://commons.wikimedia.org/wiki/File:Colombia_team.jpg'

function respuestaCommons(opciones?: {
  autor?: string
  licencia?: string
  licenciaUrl?: string
  copyrighted?: string
}) {
  return new Response(JSON.stringify({
    query: {
      pages: {
        '123': {
          title: 'File:Colombia team.jpg',
          imageinfo: [{
            extmetadata: {
              Artist: { value: `<a href="https://commons.wikimedia.org/wiki/User:Autor">${opciones?.autor || 'Juan Pérez'}</a>` },
              LicenseShortName: { value: opciones?.licencia || 'CC BY 4.0' },
              LicenseUrl: { value: opciones?.licenciaUrl || 'https://creativecommons.org/licenses/by/4.0/' },
              Copyrighted: { value: opciones?.copyrighted || 'True' }
            }
          }]
        }
      }
    }
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('atribución de fotos de Wikimedia Commons', () => {
  it('consulta Commons y solo confirma autoría/licencia compatibles', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaCommons())
    vi.stubGlobal('fetch', fetchMock)

    await expect(verificarAtribucionFotoCommons({
      urlFuente,
      autorFoto: 'Juan Pérez',
      licenciaFoto: 'CC BY 4.0'
    })).resolves.toBe('Juan Pérez · CC BY 4.0 · Wikimedia Commons')

    const urlConsultada = new URL(fetchMock.mock.calls[0][0] as URL)
    expect(urlConsultada.origin).toBe('https://commons.wikimedia.org')
    expect(urlConsultada.searchParams.get('titles')).toBe('File:Colombia team.jpg')
  })

  it('falla cerrado ante dominio ajeno, autor distinto o licencia no permitida', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaCommons())
    vi.stubGlobal('fetch', fetchMock)

    await expect(verificarAtribucionFotoCommons({
      urlFuente: 'https://example.org/file.jpg',
      autorFoto: 'Juan Pérez',
      licenciaFoto: 'CC BY 4.0'
    })).rejects.toMatchObject({ data: { codigo: 'ATRIBUCION_FOTO_CODEX_INVALIDA' } })
    expect(fetchMock).not.toHaveBeenCalled()

    await expect(verificarAtribucionFotoCommons({
      urlFuente,
      autorFoto: 'Otra persona',
      licenciaFoto: 'CC BY 4.0'
    })).rejects.toMatchObject({ data: { codigo: 'AUTOR_FOTO_COMMONS_NO_COINCIDE' } })

    fetchMock.mockResolvedValue(respuestaCommons({ licencia: 'CC BY-NC 4.0' }))
    await expect(verificarAtribucionFotoCommons({
      urlFuente,
      autorFoto: 'Juan Pérez',
      licenciaFoto: 'CC0 1.0'
    })).rejects.toMatchObject({ data: { codigo: 'LICENCIA_FOTO_COMMONS_NO_PERMITIDA' } })
  })
})
