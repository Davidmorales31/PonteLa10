import { describe, expect, it } from 'vitest'
import {
  detectarMimeEditorial,
  prepararPayloadPortada
} from '../../scripts/preparar-portada-codex.mjs'

const metadatos = {
  titulo: 'Una historia deportiva en contexto',
  alt: 'Selección Colombia durante un partido de fútbol',
  pie: 'Fotografía de archivo de la selección durante un encuentro internacional.',
  autorFoto: 'Carlos Pérez',
  licenciaFoto: 'CC BY 4.0',
  urlFuente: 'https://commons.wikimedia.org/wiki/File:Colombia_football_team.jpg'
}
const pngPrueba = () => Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  Buffer.alloc(100, 1)
])

describe('preparación segura de portada Codex', () => {
  it('identifica el formato real por la firma del archivo y prepara el payload', () => {
    const png = pngPrueba()

    expect(detectarMimeEditorial(png)).toBe('image/png')
    expect(prepararPayloadPortada(png, 'cubierta.png', metadatos)).toEqual({
      nombreOriginal: 'cubierta.png',
      tipoMime: 'image/png',
      imagenBase64: png.toString('base64'),
      titulo: metadatos.titulo,
      alt: metadatos.alt,
      pie: metadatos.pie,
      credito: 'Carlos Pérez · CC BY 4.0 · Wikimedia Commons',
      urlFuente: metadatos.urlFuente,
      autorFoto: 'Carlos Pérez',
      licenciaFoto: 'CC BY 4.0'
    })
  })

  it('rechaza archivos con mime no permitido, payload excesivo o metadatos incompletos', () => {
    expect(detectarMimeEditorial(Buffer.from('imagen'))).toBeNull()
    expect(() => prepararPayloadPortada(Buffer.alloc(80), 'x.bin', metadatos))
      .toThrow('La imagen debe ser JPEG, PNG o WebP válido.')
    expect(() => prepararPayloadPortada(Buffer.alloc(2_400_001), 'x.png', metadatos))
      .toThrow('La imagen debe pesar entre 75 bytes y 2400000 bytes.')
    expect(() => prepararPayloadPortada(pngPrueba(), 'x.png', { ...metadatos, extra: 'no' }))
      .toThrow('Los metadatos deben identificar una foto de Commons, autor y licencia permitida.')
    expect(() => prepararPayloadPortada(pngPrueba(), 'x.png', {
      ...metadatos,
      licenciaFoto: 'CC BY-NC 4.0'
    })).toThrow('Los metadatos deben identificar una foto de Commons, autor y licencia permitida.')
  })
})
