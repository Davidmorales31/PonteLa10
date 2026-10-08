import { describe, expect, it } from 'vitest'
import {
  normalizarRutaPublica404,
  obtenerRefererPublico404
} from '~/server/utils/monitor404Seo'

describe('monitor SEO de 404 públicos', () => {
  it('conserva la ruta pública y elimina query, fragmento e identificadores sensibles', () => {
    expect(normalizarRutaPublica404('/partidos/Deportivo%20Pereira?token=secreto#alineacion'))
      .toBe('/partidos/Deportivo%20Pereira')
    expect(normalizarRutaPublica404('/articulos/550e8400-e29b-41d4-a716-446655440000'))
      .toBe('/articulos/:id')
    expect(normalizarRutaPublica404('/autores/juana%40ejemplo.com'))
      .toBe('/autores/:redacted')
  })

  it('omite rutas administrativas, API y recursos estáticos', () => {
    expect(normalizarRutaPublica404('/admin/editorial')).toBeNull()
    expect(normalizarRutaPublica404('/api/articulos/no-existe')).toBeNull()
    expect(normalizarRutaPublica404('/_nuxt/app.js')).toBeNull()
    expect(normalizarRutaPublica404('/sitemap-falso.xml')).toBeNull()
  })

  it('omite rutas malformadas y anonimiza segmentos excesivamente largos', () => {
    expect(normalizarRutaPublica404('/%E0%A4%A')).toBeNull()
    expect(normalizarRutaPublica404(`/${'a'.repeat(600)}`)).toBe('/:redacted')
    expect(normalizarRutaPublica404('')).toBeNull()
  })

  it('anonimiza direcciones IP incluidas en rutas públicas', () => {
    expect(normalizarRutaPublica404('/consulta/192.168.1.15')).toBe('/consulta/:redacted')
    expect(normalizarRutaPublica404('/consulta/2001:db8::1')).toBe('/consulta/:redacted')
    expect(normalizarRutaPublica404('/consulta/::ffff:192.0.2.1')).toBe('/consulta/:redacted')
    expect(normalizarRutaPublica404('/consulta/[fe80::1%25eth0]')).toBe('/consulta/:redacted')
    expect(normalizarRutaPublica404('/articulos/liga-betplay-fecha-32-analisis')).toBe('/articulos/liga-betplay-fecha-32-analisis')
  })

  it('guarda solo rutas de referers HTTPS del origen canónico', () => {
    expect(obtenerRefererPublico404(
      'https://www.pont3la10.com/liga-colombiana?correo=privado%40ejemplo.com',
      'https://www.pont3la10.com'
    )).toBe('/liga-colombiana')
    expect(obtenerRefererPublico404('https://otro.example/liga-colombiana', 'https://www.pont3la10.com')).toBeNull()
    expect(obtenerRefererPublico404('https://www.pont3la10.com/admin', 'https://www.pont3la10.com')).toBeNull()
    expect(obtenerRefererPublico404('http://www.pont3la10.com/liga-colombiana', 'https://www.pont3la10.com')).toBeNull()
  })
})
