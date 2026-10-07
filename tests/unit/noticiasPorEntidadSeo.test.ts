import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { listarArticulosPublicosPorEntidad } from '../../server/utils/repositorioContenidoEditorial'

describe('noticias de hubs por relación editorial', () => {
  it('no agrega coincidencias textuales sin relación editorial confirmada', () => {
    const archivosHubs = [
      new URL('../../server/utils/equiposLigaPublicos.ts', import.meta.url),
      new URL('../../server/utils/competicionesPublicas.ts', import.meta.url)
    ]
    const fuentesHubs = archivosHubs.map(archivo => readFileSync(fileURLToPath(archivo), 'utf8'))

    for (const fuente of fuentesHubs) {
      expect(fuente).toContain('listarArticulosPublicosPorEntidad')
      expect(fuente).not.toMatch(/listarArticulosPublicosEditoriales|combinarNoticiasPorEntidad/)
    }
  })

  it('consulta la RPC pública por tipo y slug y mapea el resumen y su portada', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        id: 'article-id', slug: 'noticia-liga', titulo: 'Liga', resumen: 'Resumen',
        tipo: 'noticia', publicadoEn: '2026-10-07T12:00:00.000Z',
        autorNombre: 'Equipo Pont3la10', categoria: 'Deportes',
        imagenBucket: 'editorial-public', imagenPath: 'liga.webp', lecturaMinutos: 4
      }],
      error: null
    }))
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://media.example/liga.webp' } }))
    const cliente = {
      rpc,
      storage: { from: vi.fn(() => ({ getPublicUrl })) }
    } as unknown as SupabaseClient

    await expect(listarArticulosPublicosPorEntidad(cliente, 'competition', 'liga-betplay', 6))
      .resolves.toMatchObject([{ id: 'article-id', slug: 'noticia-liga', imagen: 'https://media.example/liga.webp' }])
    expect(rpc).toHaveBeenCalledWith('list_public_editorial_articles_for_entity', {
      requested_entity_type: 'competition',
      requested_entity_slug: 'liga-betplay',
      result_limit: 6,
      result_offset: 0
    })
  })

  it('solo devuelve artículos publicados con relación confirmada y la RPC no revela el grafo privado', () => {
    const directorioMigraciones = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url))
    const nombreMigracion = readdirSync(directorioMigraciones)
      .find(nombre => nombre.endsWith('_hu_ed24_noticias_entidad.sql'))
    expect(nombreMigracion).toBeDefined()
    const sql = readFileSync(join(directorioMigraciones, nombreMigracion!), 'utf8')

    expect(sql).toMatch(/security definer[\s\S]*?set search_path = ''/i)
    expect(sql).toMatch(/relacion\.status = 'confirmed'/i)
    expect(sql).toMatch(/articulo\.status = 'published'/i)
    expect(sql).toMatch(/articulo\.published_version_id is not null/i)
    expect(sql).toMatch(/revoke all on function public\.list_public_editorial_articles_for_entity[\s\S]*?from public, anon, authenticated, service_role;/i)
    expect(sql).toMatch(/grant execute on function public\.list_public_editorial_articles_for_entity[\s\S]*?to anon, authenticated;/i)
  })
})
