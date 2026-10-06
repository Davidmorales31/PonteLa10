import { describe, expect, it } from 'vitest'
import {
  esRutaPublicaMedible,
  construirDimensionesVistaPagina,
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

  it('clasifica vistas públicas por tipo y no agrega el texto de búsqueda al evento', () => {
    expect(construirDimensionesVistaPagina('/')).toEqual({ page_type: 'home' })
    expect(construirDimensionesVistaPagina('/articulos/analisis-liga')).toEqual({
      content_id: 'analisis-liga',
      page_type: 'article'
    })
    expect(construirDimensionesVistaPagina('/articulos/analisis-liga', {}, {
      ruta: '/articulos/analisis-liga',
      category: 'futbol-colombiano',
      primary_entity: 'liga-betplay'
    })).toEqual({
      content_id: 'analisis-liga',
      category: 'futbol-colombiano',
      primary_entity: 'liga-betplay',
      page_type: 'article'
    })
    expect(construirDimensionesVistaPagina('/articulos', { buscar: 'correo@ejemplo.com' })).toEqual({
      page_type: 'search'
    })
    expect(construirDimensionesVistaPagina('/articulos', { categoria: 'futbol-colombiano' })).toEqual({
      category: 'futbol-colombiano',
      page_type: 'hub'
    })
    expect(construirDimensionesVistaPagina('/partidos/nacional-vs-millonarios')).toEqual({
      match_id: 'nacional-vs-millonarios',
      page_type: 'match'
    })
    expect(construirDimensionesVistaPagina('/resultados/123')).toEqual({ page_type: 'results' })
    expect(construirDimensionesVistaPagina('/seleccion-colombia')).toEqual({
      hub_type: 'seleccion_colombia',
      page_type: 'hub'
    })
  })

  it('admite solo contexto de entidad con forma segura y estado conocido', () => {
    expect(construirDimensionesVistaPagina('/partidos/nacional-vs-millonarios', {}, {
      ruta: '/partidos/nacional-vs-millonarios',
      competition: 'liga-betplay',
      match_status: 'EN VIVO'
    })).toEqual({
      match_id: 'nacional-vs-millonarios',
      competition: 'liga-betplay',
      match_status: 'live',
      page_type: 'match'
    })
    expect(construirDimensionesVistaPagina('/partidos/nacional-vs-millonarios', {}, {
      ruta: '/partidos/nacional-vs-millonarios',
      competition: 'liga-betplay?correo=privado',
      match_status: 'dato no validado'
    })).toEqual({
      match_id: 'nacional-vs-millonarios',
      page_type: 'match'
    })
  })
})
