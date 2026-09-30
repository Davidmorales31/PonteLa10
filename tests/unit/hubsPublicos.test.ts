import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  evaluarHubIndexable,
  esquemaCrearHubPublico,
  tiposHubPublicoEditorial
} from '~/utils/editorial/hubs'

const hubValido = {
  slug: 'colombianos-en-europa',
  tipo: 'player_collection',
  titulo: 'Colombianos en Europa',
  descripcion: 'Una guía para seguir las temporadas, clubes y noticias de futbolistas colombianos en las principales ligas europeas.',
  cuerpo: 'Historias, perfiles y análisis de los jugadores colombianos que compiten en Europa. Este espacio reúne información para dar contexto a cada jornada.\n\nLas notas relacionadas permiten seguir su actualidad a lo largo de la temporada.',
  tituloSeo: '',
  descripcionSeo: '',
  modulos: [
    {
      id: 'actualidad',
      tipo: 'articulos',
      titulo: 'Últimas publicaciones',
      filtro: { tipo: 'tema', slug: 'colombianos-en-europa' },
      limite: 6
    }
  ]
}

describe('hubs públicos editoriales', () => {
  it('admite los cinco tipos de hub y valida módulos acotados', () => {
    expect(tiposHubPublicoEditorial).toEqual([
      'topic', 'competition', 'player_collection', 'technology', 'gaming'
    ])
    expect(esquemaCrearHubPublico.safeParse(hubValido).success).toBe(true)
  })

  it('no permite que un módulo de enlaces navegue fuera del sitio', () => {
    const resultado = esquemaCrearHubPublico.safeParse({
      ...hubValido,
      modulos: [{
        id: 'enlaces',
        tipo: 'enlaces',
        titulo: 'Enlaces relacionados',
        enlaces: [{ etiqueta: 'Sitio externo', ruta: '//ejemplo.test' }]
      }]
    })
    expect(resultado.success).toBe(false)
  })

  it('solo habilita indexación con contenido suficiente y un feed no vacío', () => {
    const datos = esquemaCrearHubPublico.parse(hubValido)
    expect(evaluarHubIndexable(datos, 3).indexable).toBe(true)
    expect(evaluarHubIndexable(datos, 0)).toMatchObject({
      indexable: false,
      motivos: ['article_feed_empty']
    })
    expect(evaluarHubIndexable({ ...datos, descripcion: 'Corta', cuerpo: '' }, 3).indexable).toBe(false)
  })

  it('separa hubs de taxonomías y protege lectura, publicación y auditoría con RLS', () => {
    const rutaMigracion = new URL(
      '../../supabase/migrations/20260930060344_hu_tr_10_hubs_publicos.sql',
      import.meta.url
    )
    const migracion = readFileSync(rutaMigracion, 'utf8')

    expect(migracion).toContain('create table if not exists public.public_hubs')
    expect(migracion).toContain('alter table public.public_hubs enable row level security')
    expect(migracion).toContain('security invoker')
    expect(migracion).toContain("status = 'published'")
    expect(migracion).toContain("public.has_editorial_permission('contenido.publicar') or not public.has_aal2()")
    expect(migracion).toContain("status = 'archived'")
    expect(migracion).toContain("public.has_editorial_permission('contenido.archivar')")
    expect(migracion).toContain('and public.has_aal2()')
    expect(migracion).toContain('grant insert (slug, hub_type, title, description, body, modules, seo_title, seo_description)')
    expect(migracion).toContain('revoke all on public.public_hubs from anon, authenticated')
    expect(migracion).not.toMatch(/grant select on public\.public_hubs to anon, authenticated/)
    expect(migracion).not.toMatch(/grant (?:insert|update) \([^)]*(?:created_by|updated_by|published_at|created_at|updated_at)/)
    expect(migracion).not.toMatch(/grant insert \([^)]*status/)
    expect(migracion).not.toContain('grant insert, update, delete on public.public_hubs')
    expect(migracion).toContain('public.audit_editorial_change()')
    expect(migracion).not.toContain('service_role')
  })
})
