import { describe, expect, it } from 'vitest'
import * as sitio from '../../scripts/video-sitio.mjs'

const origenApi = sitio.origenApi as (valor: unknown, respaldo?: string) => string

describe('origen del sitio para el flujo de video', () => {
  it('sin variable, o con un valor inválido, usa el sitio público', () => {
    expect(origenApi(undefined)).toBe('https://www.pont3la10.com')
    expect(origenApi('')).toBe('https://www.pont3la10.com')
    expect(origenApi('no es una url')).toBe('https://www.pont3la10.com')
    expect(origenApi('file:///c:/secreto')).toBe('https://www.pont3la10.com')
    expect(origenApi('javascript:alert(1)')).toBe('https://www.pont3la10.com')
  })

  it('acepta el servidor local y quita la barra final', () => {
    expect(origenApi('http://127.0.0.1:3002/')).toBe('http://127.0.0.1:3002')
    expect(origenApi(' http://localhost:3002 ')).toBe('http://localhost:3002')
  })

  it('los enlaces públicos siguen apuntando al dominio de siempre', () => {
    expect(sitio.SITIO_PUBLICO).toBe('https://www.pont3la10.com')
  })
})
