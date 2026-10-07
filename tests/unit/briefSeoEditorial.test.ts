import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { esquemaBriefSeoArticulo } from '~/utils/editorial/briefSeo'
import { esquemaDecisionesRelacionesSeo } from '~/utils/editorial/grafoEntidades'

describe('brief SEO editorial', () => {
  it('permite confirmar una pieza original sin consulta objetivo', () => {
    const resultado = esquemaBriefSeoArticulo.safeParse({
      consultaObjetivo: '',
      intencionBusqueda: 'actualidad',
      clusterPrincipal: 'Fútbol colombiano',
      ventanaFrescuraDias: null,
      origenOportunidad: '',
      diferenciadorEditorial: 'Aporta contexto propio con fuentes verificadas.',
      estadoBrief: 'confirmado'
    })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.consultaObjetivo).toBeNull()
      expect(resultado.data.estadoBrief).toBe('confirmado')
    }
  })

  it('valida la taxonomía de intención y los límites de campos', () => {
    const base = {
      consultaObjetivo: 'tabla Liga BetPlay',
      intencionBusqueda: 'resultado',
      clusterPrincipal: 'Liga BetPlay',
      ventanaFrescuraDias: 30,
      origenOportunidad: 'Search Console',
      diferenciadorEditorial: 'Tabla actualizada con análisis de cambios.',
      estadoBrief: 'propuesto'
    }

    expect(esquemaBriefSeoArticulo.safeParse(base).success).toBe(true)
    expect(esquemaBriefSeoArticulo.safeParse({ ...base, intencionBusqueda: 'compra' }).success).toBe(false)
    expect(esquemaBriefSeoArticulo.safeParse({ ...base, ventanaFrescuraDias: 4000 }).success).toBe(false)
  })

  it('permite varias entidades secundarias, pero solo una principal por decisión', () => {
    const secundaria = {
      tipo: 'team',
      slug: 'atletico-nacional',
      relacion: 'mentions',
      estado: 'confirmed'
    }
    const principal = {
      tipo: 'competition',
      slug: 'liga-betplay',
      relacion: 'about',
      estado: 'confirmed'
    }

    expect(esquemaDecisionesRelacionesSeo.safeParse({
      decisiones: [principal, secundaria, { ...secundaria, slug: 'millonarios' }]
    }).success).toBe(true)
    expect(esquemaDecisionesRelacionesSeo.safeParse({
      decisiones: [principal, { ...principal, slug: 'copa-colombia' }]
    }).success).toBe(false)
  })

  it('mantiene el brief privado y la confirmación separada del flujo del artículo', () => {
    const migracion = readFileSync(new URL(
      '../../supabase/migrations/20261007054958_hu_ed20_brief_intencion.sql',
      import.meta.url
    ), 'utf8')
    const rutaPropuesta = readFileSync(new URL(
      '../../server/api/internal/codex/proposals.post.ts',
      import.meta.url
    ), 'utf8')
    const rutaGuardado = readFileSync(new URL(
      '../../server/api/admin/contenidos/[id]/brief-seo.put.ts',
      import.meta.url
    ), 'utf8')
    const rpcPropuesta = migracion.slice(
      migracion.indexOf('create or replace function public.propose_editorial_article_search_brief('),
      migracion.indexOf('revoke all on function public.propose_editorial_article_search_brief(')
    )
    const rutaBorrador = readFileSync(new URL(
      '../../server/api/internal/codex/draft.post.ts',
      import.meta.url
    ), 'utf8')

    expect(migracion).toContain('enable row level security')
    expect(migracion).toContain("status = 'confirmed' and confirmed_by is not null and confirmed_at is not null")
    expect(migracion).toContain('propose_editorial_article_search_brief')
    expect(migracion).toContain('editorial_article_entity_relations_one_primary_idx')
    expect(migracion).toContain("article.status::text = 'review'")
    expect(migracion).toContain("has_editorial_permission('contenido.aprobar')")
    expect(migracion).toContain('contenido.brief_seo_confirmado')
    expect(migracion).toContain('contenido.relaciones_seo_actualizadas')
    expect(migracion).toContain('security definer')
    expect(rpcPropuesta).toContain('for update;')
    expect(migracion).not.toMatch(/grant\s+select,\s*insert,\s*update\s+on\s+table\s+public\.editorial_article_search_briefs\s+to\s+authenticated\s*,\s*service_role/i)
    expect(migracion).toMatch(/revoke all on function public\.propose_editorial_article_search_brief\(uuid, uuid, jsonb\)[\s\S]*?from public, anon, authenticated, service_role/i)
    expect(migracion).toMatch(/grant execute on function public\.propose_editorial_article_search_brief\(uuid, uuid, jsonb\)[\s\S]*?to service_role/i)
    expect(rutaGuardado).toContain("contexto.permisos.includes('contenido.aprobar')")
    expect(rutaBorrador).toContain('briefSeo,')
    expect(rutaPropuesta).toContain("cliente.rpc('propose_editorial_article_search_brief'")
    expect(rutaPropuesta).toContain(".eq('idempotency_key', resultado.data.idempotencyKey)")
  })
})
