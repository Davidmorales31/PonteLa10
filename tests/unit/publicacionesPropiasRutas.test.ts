import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dobles = vi.hoisted(() => ({ ejecutar: vi.fn() }))
vi.mock('~/server/utils/ejecutarPublicacionMetaPropia', () => ({ ejecutarPublicacionMetaPropia: dobles.ejecutar }))
const { procesarPublicacionesPropiasProgramadas } = await import('~/server/utils/procesarPublicacionesPropias')

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const trabajo = { id: '11111111-1111-4111-8111-111111111111', revision: 3, destinations: ['facebook', 'instagram'],
  actor_id: '22222222-2222-4222-8222-222222222222', created_by: '33333333-3333-4333-8333-333333333333' }

function crearCliente(opciones: { trabajo?: unknown, roles?: Array<{ role: string }>, permisos?: Array<{ permission: string }> }) {
  const rpc = vi.fn(async (nombre: string) => ({ data: nombre === 'claim_due_social_custom_post' ? opciones.trabajo ?? null : null, error: null }))
  const consulta = (datos: unknown) => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: datos, error: null }) }), in: async () => ({ data: datos, error: null }) }) })
  const from = vi.fn((tabla: string) => consulta(tabla === 'user_roles' ? opciones.roles : opciones.permisos))
  return { rpc, from } as never
}
const permisosCompletos = [{ permission: 'panel.acceder' }, { permission: 'contenido.editarTodos' }]
const cierre = (cliente: { rpc: ReturnType<typeof vi.fn> }) => cliente.rpc.mock.calls.find(llamada => llamada[0] === 'finish_social_custom_post')?.[1]

describe('programador de publicaciones propias', () => {
  beforeEach(() => dobles.ejecutar.mockReset())

  it('no hace nada si no hay publicación vencida', async () => {
    const cliente = crearCliente({})
    await procesarPublicacionesPropiasProgramadas(cliente, {})
    expect(dobles.ejecutar).not.toHaveBeenCalled()
    expect(cierre(cliente as never)).toBeUndefined()
  })

  it('no publica una reserva ilegible', async () => {
    const cliente = crearCliente({ trabajo: { id: 'no-es-uuid' } })
    await procesarPublicacionesPropiasProgramadas(cliente, {})
    expect(dobles.ejecutar).not.toHaveBeenCalled()
    expect(cierre(cliente as never)).toBeUndefined()
  })

  it('publica en cada destino con el actor que programó y cierra como publicada', async () => {
    dobles.ejecutar.mockResolvedValue({ estado: 'published' })
    const cliente = crearCliente({ trabajo, roles: [{ role: 'editor' }], permisos: permisosCompletos })
    await procesarPublicacionesPropiasProgramadas(cliente, { metaAccessToken: 'x' })
    expect(dobles.ejecutar).toHaveBeenCalledTimes(2)
    expect(dobles.ejecutar.mock.calls.map(llamada => llamada[1])).toEqual([{ destino: 'facebook', revision: 3 }, { destino: 'instagram', revision: 3 }])
    expect(dobles.ejecutar.mock.calls[0]![0].actorId).toBe(trabajo.actor_id)
    expect(cierre(cliente as never)).toEqual({ p_id: trabajo.id, p_status: 'published' })
  })

  it('una red caída o incierta no marca la pieza como publicada', async () => {
    dobles.ejecutar.mockResolvedValueOnce({ estado: 'published' }).mockRejectedValueOnce(new Error('Meta rechazó'))
    const cliente = crearCliente({ trabajo, roles: [{ role: 'editor' }], permisos: permisosCompletos })
    await procesarPublicacionesPropiasProgramadas(cliente, {})
    expect(dobles.ejecutar).toHaveBeenCalledTimes(2)
    expect(cierre(cliente as never)).toEqual({ p_id: trabajo.id, p_status: 'failed' })
    dobles.ejecutar.mockReset().mockResolvedValue({ estado: 'uncertain' })
    const otro = crearCliente({ trabajo, roles: [{ role: 'editor' }], permisos: permisosCompletos })
    await procesarPublicacionesPropiasProgramadas(otro, {})
    expect(cierre(otro as never)).toEqual({ p_id: trabajo.id, p_status: 'failed' })
  })

  it('si el responsable perdió el permiso, no publica nada', async () => {
    const sinRol = crearCliente({ trabajo, roles: [], permisos: permisosCompletos })
    await procesarPublicacionesPropiasProgramadas(sinRol, {})
    const sinPermiso = crearCliente({ trabajo, roles: [{ role: 'lector' }], permisos: [{ permission: 'panel.acceder' }] })
    await procesarPublicacionesPropiasProgramadas(sinPermiso, {})
    expect(dobles.ejecutar).not.toHaveBeenCalled()
    expect(cierre(sinRol as never)).toEqual({ p_id: trabajo.id, p_status: 'failed' })
    expect(cierre(sinPermiso as never)).toEqual({ p_id: trabajo.id, p_status: 'failed' })
  })

  it('usa al creador si la publicación no tiene actor', async () => {
    dobles.ejecutar.mockResolvedValue({ estado: 'published' })
    const cliente = crearCliente({ trabajo: { ...trabajo, actor_id: null }, roles: [{ role: 'editor' }], permisos: permisosCompletos })
    await procesarPublicacionesPropiasProgramadas(cliente, {})
    expect(dobles.ejecutar.mock.calls[0]![0].actorId).toBe(trabajo.created_by)
  })
})

describe('rutas de publicaciones propias', () => {
  it('toda ruta que cambia datos exige permiso de edición, MFA y JSON del mismo origen', () => {
    const contexto = leer('../../server/utils/contextoPublicacionPropia.ts')
    expect(contexto).toContain("'contenido.editarTodos'")
    expect(contexto).toContain('exigirMfaSegunPoliticaEditorial(contexto)')
    expect(contexto).toContain("'application/json'")
    expect(contexto).toContain('getRequestURL(evento).origin')
    for (const ruta of ['index.post.ts', '[id].put.ts', '[id]/publicar.post.ts', '[id]/programar.post.ts', '[id]/cancelar.post.ts']) {
      expect(leer(`../../server/api/admin/redes/propias/${ruta}`), ruta).toContain('contextoPublicacionPropia(evento, true)')
    }
    for (const ruta of ['index.get.ts', '[id].get.ts']) {
      expect(leer(`../../server/api/admin/redes/propias/${ruta}`), ruta).toContain('contextoPublicacionPropia(evento)')
    }
  })

  it('programar valida la hora, el programador activo, los avisos y renderiza antes de aceptar', () => {
    const ruta = leer('../../server/api/admin/redes/propias/[id]/programar.post.ts')
    for (const fragmento of ['Date.now() + 60_000', '90 * 86400_000', 'estadoProgramadorSocial', 'avisosPublicacionPropia', 'renderizarImagenesPropias', 'programarPublicacionPropia']) {
      expect(ruta).toContain(fragmento)
    }
  })

  it('editar una pieza programada la devuelve a borrador y no permite editar lo publicado', () => {
    const repositorio = leer('../../server/utils/repositorioPublicacionesPropias.ts')
    expect(repositorio).toContain("rpc('save_social_custom_post'")
    expect(repositorio).toContain("rpc('schedule_social_custom_post'")
    expect(repositorio).toContain("rpc('cancel_social_custom_schedule'")
    const migracion = leer('../../supabase/migrations/20261116150000_publicaciones_sociales_propias.sql')
    expect(migracion).toContain("status in ('draft','scheduled','failed')")
    expect(migracion).toContain('revision = p_revision')
  })

  it('el disparador del programador procesa también las publicaciones propias', () => {
    const procesar = leer('../../server/api/internal/redes/procesar.post.ts')
    expect(procesar).toContain('procesarPublicacionesPropiasProgramadas(cliente, meta)')
  })

  it('la publicación usa reserva idempotente, recibo persistente y no expone URLs firmadas', () => {
    const ejecucion = leer('../../server/utils/ejecutarPublicacionMetaPropia.ts')
    for (const fragmento of ['begin_social_custom_publication', 'set_social_custom_publication_status', "'social-meta-private'", 'createSignedUrl', "enviando ? 'uncertain' : 'failed'", 'huellaAprobada']) {
      expect(ejecucion).toContain(fragmento)
    }
    expect(ejecucion).not.toContain('signedUrl,') // la URL firmada solo se usa dentro del servidor
  })
})
