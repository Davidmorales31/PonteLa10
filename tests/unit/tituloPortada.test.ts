import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { esquemaAutoguardadoArticulo, esquemaDatosEditorArticulo, esquemaGuardarArticulo } from '../../utils/editorial/contenido'
import { obtenerTituloPortada } from '../../utils/editorial/tituloPortada'
import { esquemaPropuestaCodex, esquemaPublicacionAutomaticaCodex } from '../../server/utils/esquemasCodexEditorial'
import { crearPublicacionAutomaticaPrueba } from '../fixtures/propuestaAutomaticaCodex'

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const migracion = leer('../../supabase/migrations/20261115150000_titular_portada_articulos.sql')

describe('titular de portada', () => {
  it('usa el titular de portada y cae al título cuando falta o está vacío', () => {
    expect(obtenerTituloPortada({ titulo: 'Nacional 1-1 Once Caldas', tituloPortada: 'Nacional llega líder y arranca en Manizales' }))
      .toBe('Nacional llega líder y arranca en Manizales')
    expect(obtenerTituloPortada({ titulo: 'Nacional 1-1 Once Caldas', tituloPortada: '   ' })).toBe('Nacional 1-1 Once Caldas')
    expect(obtenerTituloPortada({ titulo: 'Nacional 1-1 Once Caldas' })).toBe('Nacional 1-1 Once Caldas')
    expect(obtenerTituloPortada({ titulo: 'Nacional 1-1 Once Caldas', tituloPortada: null })).toBe('Nacional 1-1 Once Caldas')
  })

  it('el editor acepta vacío o entre 8 y 120 caracteres', () => {
    const campo = esquemaDatosEditorArticulo.shape.tituloPortada
    expect(campo.parse(undefined)).toBe('')
    expect(campo.parse('')).toBe('')
    expect(campo.parse('  Nacional llega líder  ')).toBe('Nacional llega líder')
    expect(campo.safeParse('Corto').success).toBe(false)
    expect(campo.safeParse('x'.repeat(121)).success).toBe(false)
  })

  it('al guardar, omitir el campo lo conserva y la cadena vacía lo quita', () => {
    const campo = esquemaGuardarArticulo.shape.tituloPortada
    expect(campo.parse(undefined)).toBeUndefined()
    expect(campo.parse('')).toBe('')
    expect(campo.safeParse('Corto').success).toBe(false)
  })

  it('un autoguardado anterior sin el campo sigue siendo válido', () => {
    const forma = esquemaAutoguardadoArticulo.shape.datos.shape.tituloPortada
    expect(forma.parse(undefined)).toBe('')
    expect(forma.parse('Nac')).toBe('Nac')
  })

  it('la publicación automática acepta coverHeadline opcional y lo valida', () => {
    const entrada = crearPublicacionAutomaticaPrueba()
    const conTitular = (coverHeadline: unknown) => ({ ...entrada, proposal: { ...entrada.proposal, coverHeadline } })

    expect(esquemaPublicacionAutomaticaCodex.safeParse(entrada).success).toBe(true)
    const valida = esquemaPublicacionAutomaticaCodex.safeParse(conTitular('  ¡Nacional llega líder y arranca en Manizales!  '))
    expect(valida.success).toBe(true)
    expect(valida.success && valida.data.proposal.coverHeadline).toBe('¡Nacional llega líder y arranca en Manizales!')
    expect(esquemaPublicacionAutomaticaCodex.safeParse(conTitular('Corto')).success).toBe(false)
    expect(esquemaPublicacionAutomaticaCodex.safeParse(conTitular('x'.repeat(121))).success).toBe(false)
    expect(esquemaPublicacionAutomaticaCodex.safeParse(conTitular('Titular con\u0007control')).success).toBe(false)
    // La ruta de revisión manual no lo persiste: lo rechaza en vez de descartarlo.
    expect(esquemaPropuestaCodex.safeParse({ ...entrada.proposal, coverHeadline: 'Nacional llega líder' }).success).toBe(false)
  })

  it('la migración añade la columna con su regla de formato y sin permiso de PATCH directo', () => {
    expect(migracion).toContain('add column if not exists cover_headline text')
    expect(migracion).toContain('char_length(cover_headline) between 8 and 120')
    expect(migracion).toContain('cover_headline = pg_catalog.btrim(cover_headline)')
    expect(migracion).toContain('revoke update (cover_headline) on table public.articles from public, anon, authenticated')
    expect(migracion).not.toContain('grant update (cover_headline)')
    expect(migracion).toContain('create or replace function editorial_private.set_article_cover_headline(')
    expect(migracion).toContain('security definer')
    expect(migracion).toContain('not public.can_edit_article(target_article_id)')
    expect(migracion).toContain("article.status::text in ('draft', 'changes_requested')")
  })

  it('el guardado nuevo valida, respeta el bloqueo y delega en el guardado vigente', () => {
    expect(migracion).toContain('create or replace function public.save_editorial_article_with_cover_headline(')
    expect(migracion).toContain('security invoker')
    expect(migracion).toContain('and article.lock_version = expected_lock_version')
    expect(migracion).toContain('if next_cover_headline is not null then')
    expect(migracion).toContain('return public.save_editorial_article_with_correction(')
    expect(migracion).toMatch(/revoke all on function public\.save_editorial_article_with_cover_headline\([\s\S]*?\) from public, anon, authenticated, service_role;/)
    expect(migracion).toMatch(/grant execute on function public\.save_editorial_article_with_cover_headline\([\s\S]*?\) to authenticated;/)
  })

  it('las funciones públicas exponen tituloPortada con guardas sobre el contrato vigente', () => {
    for (const funcion of [
      'public.get_public_editorial_article(text)',
      'public.list_public_editorial_articles(integer,integer)',
      'public.list_public_editorial_articles_filtered(integer,integer,text,text[],text,text)',
      'public.list_public_editorial_articles_for_entity(text,text,integer,integer)',
      'public.get_public_editorial_latest_article_with_cover()',
      'public.get_public_editorial_home_feature()'
    ]) {
      expect(migracion).toContain(`'${funcion}'`)
    }
    expect(migracion).toContain("raise exception 'Revisar contrato público vigente de %.'")
    expect(migracion).toContain("coalesce(version.snapshot ->> ''cover_headline'', '''')")
  })

  it('la aprobación automática fija el titular antes de aprobar y programar', () => {
    expect(migracion).toContain("public.submit_and_schedule_codex_proposal(jsonb,jsonb,jsonb)")
    expect(migracion).toContain("p_input ->> ''coverHeadline''")
    expect(migracion).toContain("raise exception 'Revisar aprobación automática vigente.'")
  })

  it('el repositorio guarda con la RPC nueva y mapea el campo en lectura y listados', () => {
    const repositorio = leer('../../server/utils/repositorioContenidoEditorial.ts')
    expect(repositorio).toContain("rpc('save_editorial_article_with_cover_headline'")
    expect(repositorio).toContain('next_cover_headline: entrada.tituloPortada ?? null')
    expect(repositorio).toContain("tituloPortada: fila.cover_headline || ''")
    expect(repositorio.match(/tituloPortada: fila\.tituloPortada \|\| ''/g)).toHaveLength(3)
  })

  it('la reescritura con IA conserva siempre el titular vigente', () => {
    const ruta = leer('../../server/api/admin/contenidos/[id]/reescritura-ia.post.ts')
    expect(ruta).toContain('tituloPortada: articulo.tituloPortada,')
    const proveedor = leer('../../server/utils/ai/deepseekRedaccion.ts')
    expect(proveedor).toContain('(propuesta as { tituloPortada?: string }).tituloPortada = datos.tituloPortada')
  })

  it('las tarjetas con imagen y el carrusel muestran el titular de portada', () => {
    for (const componente of [
      '../../components/TarjetaNoticiaPrincipal.vue',
      '../../components/TarjetaNoticiaSecundaria.vue',
      '../../components/TarjetaArticulo.vue',
      '../../components/publico/CarruselNoticiasLiga.vue'
    ]) {
      expect(leer(componente)).toContain('obtenerTituloPortada(')
    }
    // El H1 del artículo sigue siendo el título SEO.
    expect(leer('../../pages/articulos/[slug].vue')).not.toContain('obtenerTituloPortada')
  })
})
