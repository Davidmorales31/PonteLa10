import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  crearSlugEditorial,
  esquemaCrearBorrador,
  esquemaCrearTaxonomia,
  esquemaFiltrosBandeja,
  etiquetasEstadoContenido,
  etiquetasTipoContenido,
  estadosContenidoEditorial,
  tiposContenidoEditorial
} from '~/utils/editorial/contenido'

describe('dominio de contenido editorial', () => {
  it('genera slugs estables sin tildes ni caracteres inseguros', () => {
    expect(crearSlugEditorial('¡Selección Colombia: próxima fecha!'))
      .toBe('seleccion-colombia-proxima-fecha')
    expect(crearSlugEditorial('  Pont3la10   Mundial  ')).toBe('pont3la10-mundial')
    expect(crearSlugEditorial('---')).toBe('contenido')
  })

  it('valida el contrato minimo de un borrador', () => {
    const resultado = esquemaCrearBorrador.safeParse({
      titulo: 'Colombia prepara su proximo partido',
      resumen: 'Las claves de la jornada.',
      tipo: 'analisis',
      categoriaId: null
    })

    expect(resultado.success).toBe(true)
  })

  it('rechaza borradores cortos, tipos desconocidos y categorias invalidas', () => {
    expect(esquemaCrearBorrador.safeParse({
      titulo: 'Corto',
      tipo: 'video',
      categoriaId: 'no-es-un-uuid'
    }).success).toBe(false)
  })

  it('normaliza paginacion y limita valores abusivos', () => {
    const resultado = esquemaFiltrosBandeja.safeParse({
      pagina: '2',
      limite: '50',
      estado: 'draft',
      orden: 'tituloAsc'
    })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.pagina).toBe(2)
      expect(resultado.data.limite).toBe(50)
    }

    expect(esquemaFiltrosBandeja.safeParse({ limite: '500' }).success).toBe(false)
  })

  it('valida colores y tipos de taxonomia', () => {
    expect(esquemaCrearTaxonomia.safeParse({
      tipo: 'etiqueta',
      nombre: 'Revisar derechos',
      color: '#174EA6'
    }).success).toBe(true)

    expect(esquemaCrearTaxonomia.safeParse({
      tipo: 'interna',
      nombre: 'Revisar derechos',
      color: 'azul'
    }).success).toBe(false)
  })

  it('mantiene etiquetas para todos los estados y tipos soportados', () => {
    estadosContenidoEditorial.forEach((estado) => {
      expect(etiquetasEstadoContenido[estado]).toBeTruthy()
    })

    tiposContenidoEditorial.forEach((tipo) => {
      expect(etiquetasTipoContenido[tipo]).toBeTruthy()
    })
  })

  it('protege taxonomias, autoguardados y relaciones desde la migracion', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/0004_editorial_content_model.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain('published_version_id')
    expect(migracion).toContain('create table if not exists public.editorial_tags')
    expect(migracion).toContain('create table if not exists public.editorial_labels')
    expect(migracion).toContain('create table if not exists public.article_autosaves')
    expect(migracion).toContain('public.can_edit_article(article_id)')
    expect(migracion).toContain('enable row level security')
    expect(migracion).not.toContain('service_role')
  })
})
