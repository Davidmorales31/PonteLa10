import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analizarConsultaArticulosPublicos } from '../../server/utils/filtrosArticulosPublicos'
import { construirFiltrosConsultaArticulos } from '../../utils/articulosLanding'

describe('consulta pública de artículos', () => {
  it('mantiene un listado inicial compatible cuando no se envían filtros', () => {
    expect(analizarConsultaArticulosPublicos({})).toEqual({
      paginado: false,
      limite: 20,
      desplazamiento: 0,
      categoria: null,
      terminosCategoria: [],
      tema: null,
      buscar: null
    })
  })

  it('convierte página a desplazamiento antes de paginar y conserva todos los filtros', () => {
    expect(analizarConsultaArticulosPublicos({
      paginado: 'true',
      pagina: '3',
      limite: '20',
      categoria: 'FUTBOL-COLOMBIANO',
      tema: 'seleccion-colombia',
      buscar: '  Fútbol  '
    })).toEqual({
      paginado: true,
      limite: 20,
      desplazamiento: 40,
      categoria: 'futbol-colombiano',
      terminosCategoria: ['futbol colombiano', 'seleccion colombia'],
      tema: 'seleccion-colombia',
      buscar: 'Fútbol'
    })
  })

  it('conserva filtros de categoría y búsqueda en la paginación legacy por desplazamiento', () => {
    expect(analizarConsultaArticulosPublicos({
      paginado: '1',
      desplazamiento: '20',
      categoria: 'tecnologia',
      buscar: 'datos deportivos'
    })).toMatchObject({
      paginado: true,
      desplazamiento: 20,
      categoria: 'tecnologia',
      terminosCategoria: ['tecnologia', 'tech deportiva'],
      buscar: 'datos deportivos'
    })
  })

  it('interpreta filtros repetidos de URL sin colapsarlos a un valor ambiguo', () => {
    expect(construirFiltrosConsultaArticulos({
      categoria: ['futbol-mundial', 'opinion'],
      tema: '  Seleccion-Colombia  ',
      buscar: '  Fútbol femenino  '
    })).toEqual({
      tema: 'seleccion-colombia',
      buscar: 'Fútbol femenino'
    })
  })

  it.each([
    { categoria: "futbol' OR 1=1 --" },
    { categoria: ['futbol', 'opinion'] },
    { tema: 'tema con espacios' },
    { buscar: 'a'.repeat(121) },
    { limite: '0' },
    { limite: '51' },
    { paginado: 'true', limite: '50' },
    { paginado: 'false', desplazamiento: '10' },
    { pagina: '2', desplazamiento: '20' },
    { pagina: '5002', limite: '20' },
    { desplazamiento: '-1' }
  ])('rechaza parámetros ambiguos o fuera del contrato: %o', (consulta) => {
    expect(analizarConsultaArticulosPublicos(consulta)).toBeNull()
  })
})

describe('RPC pública filtrada', () => {
  const sql = readFileSync(
    new URL('../../supabase/migrations/20260929035000_hu_tr_08_server_side_article_filters.sql', import.meta.url),
    'utf8'
  )

  it('solo devuelve publicaciones vigentes y aplica filtros antes de paginar', () => {
    const soloPublicados = sql.indexOf("where article.status = 'published'")
    const categoria = sql.indexOf('filter_category_slug is null')
    const orden = sql.indexOf('order by publication_date desc nulls last')
    const limite = sql.indexOf('limit least(greatest(coalesce(result_limit, 20), 1), 50)')
    const desplazamiento = sql.indexOf('offset least(greatest(coalesce(result_offset, 0), 0), 100_000)')

    expect(soloPublicados).toBeGreaterThanOrEqual(0)
    expect(categoria).toBeGreaterThan(soloPublicados)
    expect(orden).toBeGreaterThan(categoria)
    expect(limite).toBeGreaterThan(orden)
    expect(desplazamiento).toBeGreaterThan(limite)
    expect(sql).toContain("and article.published_version_id is not null")
    expect(sql).toContain("coalesce(version.snapshot -> 'tagIds', '[]'::jsonb)")
  })

  it('restringe ejecución, fija search_path y evita SQL dinámico', () => {
    expect(sql).toMatch(/security definer[\s\S]*?set search_path = ''/i)
    expect(sql).toMatch(/revoke all on function public\.list_public_editorial_articles_filtered\([\s\S]*?from public, anon, authenticated/i)
    expect(sql).toMatch(/grant execute on function public\.list_public_editorial_articles_filtered\([\s\S]*?to anon, authenticated/i)
    expect(sql).not.toMatch(/\bexecute\s+(?:format|\$)/i)
  })

  it('acota los términos de categoría antes de recorrerlos', () => {
    const limiteTerminos = sql.indexOf('cardinality(coalesce(filter_category_terms')
    const primerRecorrido = sql.indexOf('pg_catalog.unnest(coalesce(filter_category_terms')
    const validacionBusqueda = sql.indexOf('char_length(filter_search) > 120')
    const primerFiltroDeTexto = sql.indexOf('pg_catalog.strpos(')
    const limiteSlugCategoria = sql.indexOf('char_length(filter_category_slug) > 80')
    const regexSlugCategoria = sql.indexOf("filter_category_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'")
    const limiteSlugTema = sql.indexOf('char_length(filter_topic_slug) > 80')
    const regexSlugTema = sql.indexOf("filter_topic_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'")
    const limiteTerminoCategoria = sql.indexOf('char_length(category_term.value) > 120')
    const trimTerminoCategoria = sql.indexOf("pg_catalog.btrim(category_term.value) = ''")

    expect(limiteTerminos).toBeGreaterThanOrEqual(0)
    expect(primerRecorrido).toBeGreaterThan(limiteTerminos)
    expect(validacionBusqueda).toBeGreaterThanOrEqual(0)
    expect(primerFiltroDeTexto).toBeGreaterThan(validacionBusqueda)
    expect(regexSlugCategoria).toBeGreaterThan(limiteSlugCategoria)
    expect(regexSlugTema).toBeGreaterThan(limiteSlugTema)
    expect(limiteTerminoCategoria).toBeGreaterThan(primerRecorrido)
    expect(trimTerminoCategoria).toBeGreaterThan(limiteTerminoCategoria)
    expect(regexSlugCategoria).toBeLessThan(primerFiltroDeTexto)
    expect(sql.indexOf("filter_topic_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'")).toBeLessThan(primerFiltroDeTexto)
    expect(sql).toMatch(/when filter_category_slug is null[\s\S]*?cardinality\(coalesce\(filter_category_terms[\s\S]*?\) > 0[\s\S]*?then false/i)
  })
})
