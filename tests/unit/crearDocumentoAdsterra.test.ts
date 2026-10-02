import { describe, expect, it } from 'vitest'
import { crearDocumentoAdsterra } from '../../utils/publicidad/crearDocumentoAdsterra'

describe('documentos aislados de Adsterra', () => {
  it('inicializa cookie sin leer ni persistir cookies antes de ejecutar el anuncio nativo', () => {
    const documento = crearDocumentoAdsterra('nativo')

    expect(documento).toContain("Object.defineProperty(document, 'cookie'")
    expect(documento).toContain("get: () => ''")
    expect(documento).toContain('set: () => true')
    expect(documento.indexOf('Object.defineProperty')).toBeLessThan(documento.indexOf('https://czernik.org/21/'))
    expect(documento).toContain('id="container-30c3ea809a63209ce30a1e8d211f79c5"')
  })

  it('mantiene el formato leaderboard y carga el script después de definir atOptions', () => {
    const documento = crearDocumentoAdsterra('leaderboard')

    expect(documento).toContain("key:'14896f35681798666057f1b5f17aded7'")
    expect(documento.indexOf('window.atOptions')).toBeLessThan(documento.indexOf('https://czernik.org/22/'))
    expect(documento).toContain('height:90,width:728')
  })
})
