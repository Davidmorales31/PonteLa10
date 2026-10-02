import { describe, expect, it } from 'vitest'
import {
  esRutaPublicaMedible,
  ID_MEDICION_GA4,
  normalizarCategoriaMedible,
  resolverDecisionAnalitica,
  resolverDecisionPublicidad
} from '../../utils/analiticaPublica'

describe('analítica pública', () => {
  it('usa el ID GA4 fijado para Pont3la10', () => {
    expect(ID_MEDICION_GA4).toBe('G-PHNWBM2D7X')
  })

  it('activa medición por defecto y respeta un opt-out guardado', () => {
    expect(resolverDecisionAnalitica(null)).toBe('aceptada')
    expect(resolverDecisionAnalitica(undefined)).toBe('aceptada')
    expect(resolverDecisionAnalitica('rechazada')).toBe('rechazada')
  })

  it('no habilita anuncios externos sin una decisión explícita guardada', () => {
    expect(resolverDecisionPublicidad(null)).toBeNull()
    expect(resolverDecisionPublicidad(undefined)).toBeNull()
    expect(resolverDecisionPublicidad('aceptada')).toBe('aceptada')
    expect(resolverDecisionPublicidad('rechazada')).toBe('rechazada')
    expect(resolverDecisionPublicidad('cualquier-valor')).toBeNull()
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
