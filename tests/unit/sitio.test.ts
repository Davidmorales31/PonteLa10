import { describe, expect, it } from 'vitest'
import { configuracionDelSitio, configuracionSitios, esIdSitio, idsSitio, normalizarIdSitio, sitioDesdeHost } from '../../utils/sitio'

describe('sitios Colombia y México', () => {
  it('Colombia es el predeterminado y México solo responde a su subdominio', () => {
    expect(sitioDesdeHost('www.pont3la10.com')).toBe('co')
    expect(sitioDesdeHost('pont3la10.com')).toBe('co')
    expect(sitioDesdeHost('mx.pont3la10.com')).toBe('mx')
    expect(sitioDesdeHost('MX.Pont3la10.com:443')).toBe('mx')
    expect(sitioDesdeHost('mx.pont3la10.com.')).toBe('mx')
    expect(sitioDesdeHost('mx.localhost:3001')).toBe('mx')
  })

  it('un host desconocido, vacío o malicioso nunca muestra México', () => {
    for (const host of [undefined, null, '', 12, 'localhost:3001', 'evil.com', 'mx.pont3la10.com.evil.com', 'xmx.pont3la10.com', 'pont3la10.com.mx', 'a'.repeat(300)]) {
      expect(sitioDesdeHost(host)).toBe('co')
    }
  })

  it('con varios hosts reenviados usa el primero', () => {
    expect(sitioDesdeHost('mx.pont3la10.com, www.pont3la10.com')).toBe('mx')
    expect(sitioDesdeHost('www.pont3la10.com, mx.pont3la10.com')).toBe('co')
  })

  it('normaliza identificadores externos con respaldo seguro', () => {
    expect(normalizarIdSitio(' MX ')).toBe('mx')
    expect(normalizarIdSitio('co')).toBe('co')
    expect(normalizarIdSitio('ar')).toBe('co')
    expect(normalizarIdSitio(['mx'])).toBe('co')
    expect(normalizarIdSitio('xx', 'mx')).toBe('mx')
    expect(esIdSitio('mx')).toBe(true)
    expect(esIdSitio('MX')).toBe(false)
  })

  it('cada sitio tiene zona horaria válida, origen propio y hosts únicos', () => {
    const hosts = idsSitio.flatMap(id => configuracionSitios[id].hosts)
    expect(new Set(hosts).size).toBe(hosts.length)
    for (const id of idsSitio) {
      const sitio = configuracionDelSitio(id)
      expect(sitio.id).toBe(id)
      expect(() => new Intl.DateTimeFormat(sitio.locale, { timeZone: sitio.zonaHoraria })).not.toThrow()
      expect(sitio.hosts).toContain(new URL(sitio.origen).hostname)
    }
    expect(configuracionDelSitio('mx').zonaHoraria).toBe('America/Mexico_City')
    expect(configuracionDelSitio('desconocido').id).toBe('co')
  })
})
