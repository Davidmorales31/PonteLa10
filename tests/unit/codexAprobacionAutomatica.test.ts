import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import { esquemaPropuestaCodex, esquemaPublicacionAutomaticaCodex } from '~/server/utils/esquemasCodexEditorial'
import { crearPublicacionAutomaticaPrueba } from '../fixtures/propuestaAutomaticaCodex'

const dobles = vi.hoisted(() => ({
  rpc: vi.fn(), verificar: vi.fn(), leer: vi.fn(),
  config: { codexEditorialApiSecret: 'investigacion-prueba', codexEditorialPublicationApiSecret: 'publicacion-prueba' }
}))
vi.mock('~/server/utils/codexEditorialPrivado', () => ({
  verificarFirmaCodex: dobles.verificar,
  leerCuerpoFirmado: dobles.leer,
  decodificarJsonFirmado: (cuerpo: Buffer) => JSON.parse(cuerpo.toString()),
  obtenerClienteCodexPrivado: () => ({ rpc: dobles.rpc })
}))
let handler: (evento: H3Event) => Promise<unknown>
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (fn: typeof handler) => fn)
  vi.stubGlobal('useRuntimeConfig', () => dobles.config)
  vi.stubGlobal('createError', (datos: object) => Object.assign(new Error('error de prueba'), datos))
  vi.stubGlobal('setResponseStatus', vi.fn())
  handler = (await import('~/server/api/internal/codex/auto-proposals.post')).default as typeof handler
})
beforeEach(() => {
  vi.clearAllMocks()
  dobles.config.codexEditorialPublicationApiSecret = 'publicacion-prueba'
  dobles.leer.mockResolvedValue(Buffer.from(JSON.stringify(crearPublicacionAutomaticaPrueba())))
  dobles.verificar.mockResolvedValue(undefined)
  dobles.rpc.mockResolvedValue({ data: { articleId: 'articulo', estado: 'scheduled', autoApproved: true, duplicado: false, programadoPara: '2026-11-05T04:00:00Z', intervaloMinutos: 2 }, error: null })
})
const evento = {} as H3Event

describe('aprobación IA de borradores DeepSeek', () => {
  it('admite una fuente secundaria atribuida sin rebajar el contrato legado', () => {
    const entrada = crearPublicacionAutomaticaPrueba()
    expect(esquemaPublicacionAutomaticaCodex.safeParse(entrada).success).toBe(true)
    expect(esquemaPropuestaCodex.safeParse(entrada.proposal).success).toBe(false)
  })
  it('rechaza decisiones negativas, etiquetas distintas, imagen equivocada y campos extra', () => {
    const entrada = crearPublicacionAutomaticaPrueba()
    for (const cambio of [{ topicsMatch: false }, { imagePresent: false }, { titleFaithful: false }, { categoryId: entrada.proposal.coverMediaId }, { coverMediaId: entrada.proposal.categoryId }, { tagIds: [] }, { approvedBy: 'humano' }]) {
      expect(esquemaPublicacionAutomaticaCodex.safeParse({ ...entrada, review: { ...entrada.review, ...cambio } }).success).toBe(false)
    }
  })
  it('rechaza fuente ausente, documento distinto y cuerpo corto', () => {
    const entrada = crearPublicacionAutomaticaPrueba()
    for (const cambio of [{ sources: [] }, { body: 'texto corto' }, { bodyJson: { type: 'doc', content: [] } }]) {
      expect(esquemaPublicacionAutomaticaCodex.safeParse({ ...entrada, proposal: { ...entrada.proposal, ...cambio } }).success).toBe(false)
    }
  })
  it('usa clave de publicación y un RPC atómico; no invoca proveedores de IA', async () => {
    await handler(evento)
    expect(dobles.leer).toHaveBeenCalledWith(evento, 1_000_000)
    expect(dobles.verificar).toHaveBeenCalledWith(evento, expect.any(Buffer), 'publicacion-prueba')
    expect(dobles.rpc).toHaveBeenCalledExactlyOnceWith('submit_and_schedule_codex_proposal', {
      p_input: crearPublicacionAutomaticaPrueba().proposal, p_brief: crearPublicacionAutomaticaPrueba().briefSeo, p_review: crearPublicacionAutomaticaPrueba().review
    })
  })
  it('falla cerrado cuando falta la clave o se reutiliza la de investigación', async () => {
    for (const secreto of ['', dobles.config.codexEditorialApiSecret]) {
      dobles.config.codexEditorialPublicationApiSecret = secreto
      await expect(handler(evento)).rejects.toMatchObject({ statusCode: 503 })
    }
    expect(dobles.rpc).not.toHaveBeenCalled()
  })
  it('no escribe si falla la firma ni si se falsifica la revisión', async () => {
    dobles.verificar.mockRejectedValueOnce(Object.assign(new Error('firma'), { statusCode: 401 }))
    await expect(handler(evento)).rejects.toMatchObject({ statusCode: 401 })
    const entrada = crearPublicacionAutomaticaPrueba()
    dobles.leer.mockResolvedValueOnce(Buffer.from(JSON.stringify({ ...entrada, review: { ...entrada.review, topicsMatch: false } })))
    await expect(handler(evento)).rejects.toMatchObject({ statusCode: 422 })
    expect(dobles.rpc).not.toHaveBeenCalled()
  })
  it('rechaza un recibo que no confirma aprobación ni duplicado', async () => {
    dobles.rpc.mockResolvedValueOnce({ data: { articleId: 'incompleto' }, error: null })
    await expect(handler(evento)).rejects.toMatchObject({ statusCode: 502 })
  })
  it('devuelve duplicados sin aprobarlos y reporta conflictos sin mensajes SQL internos', async () => {
    const duplicado = { articleId: 'existente', estado: 'review', autoApproved: false, duplicado: true }
    dobles.rpc.mockResolvedValueOnce({ data: duplicado, error: null })
    expect(await handler(evento)).toEqual(duplicado)
    dobles.rpc.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'detalle privado' } })
    await expect(handler(evento)).rejects.toMatchObject({ statusCode: 409, data: { codigo: 'PUBLICACION_AUTOMATICA_EN_CONFLICTO' } })
  })
})
