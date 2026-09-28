import { describe, expect, it } from 'vitest'
import {
  esRutaPublicaMedible,
  normalizarCategoriaMedible,
  normalizarIdMedicionGa4
} from '../../utils/analiticaPublica'

describe('configuración segura de analítica pública', () => {
  it('acepta solo IDs de medición GA4 con el formato G-XXXXXXXXXX', () => {
    expect(normalizarIdMedicionGa4('G-ABC1234567')).toBe('G-ABC1234567')
    expect(normalizarIdMedicionGa4(' G-ABC1234567 ')).toBe('G-ABC1234567')
    expect(normalizarIdMedicionGa4('UA-123456-1')).toBeNull()
    expect(normalizarIdMedicionGa4('G-ABC123')).toBeNull()
    expect(normalizarIdMedicionGa4(undefined)).toBeNull()
  })

  it('excluye rutas privadas y no acepta rutas que no sean relativas al sitio', () => {
    expect(esRutaPublicaMedible('/articulos')).toBe(true)
    expect(esRutaPublicaMedible('/articulos/noticia')).toBe(true)
    expect(esRutaPublicaMedible('/admin')).toBe(false)
    expect(esRutaPublicaMedible('/admin/contenidos')).toBe(false)
    expect(esRutaPublicaMedible('/login')).toBe(false)
    expect(esRutaPublicaMedible('/api/articulos')).toBe(false)
    expect(esRutaPublicaMedible('//otro-dominio.test')).toBe(false)
  })

  it('solo permite dimensiones de categoría conocidas, nunca valores arbitrarios', () => {
    expect(normalizarCategoriaMedible(' Futbol-Colombiano ')).toBe('futbol-colombiano')
    expect(normalizarCategoriaMedible('opinion')).toBe('opinion')
    expect(normalizarCategoriaMedible('buscar=correo@ejemplo.com')).toBeNull()
    expect(normalizarCategoriaMedible(['gaming'])).toBeNull()
  })
})
