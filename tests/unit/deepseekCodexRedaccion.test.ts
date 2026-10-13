import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearProveedorDeepSeekCodex } from '../../server/utils/ai/deepseekCodexRedaccion'
import type { EntradaRedaccionIa } from '../../server/utils/ai/contratosRedaccion'

const entrada: EntradaRedaccionIa = {
  ingestaId: 'da4a306a-1239-4774-ad0e-00c933ff6579',
  tituloSugerido: 'Cómo cambia el promedio en la Liga BetPlay',
  instrucciones: 'Usar solo evidencia verificada.',
  urlFuente: 'https://dimayor.com.co/reglamento',
  creditos: 'Reglamento oficial',
  categoriaId: '048f5f11-072a-4b5f-98b4-2e6298433209',
  tipoSugerido: 'analisis',
  segmentos: [{ id: 1, inicioSegundos: 0, finSegundos: 1, texto: 'El promedio divide puntos entre partidos.' }]
}
const solicitar = vi.fn()

beforeEach(() => {
  solicitar.mockReset()
  vi.stubGlobal('useRuntimeConfig', () => ({ editorialAiApiKey: 'clave-ficticia-prueba', editorialAiModel: 'modelo-prueba' }))
  vi.stubGlobal('$fetch', solicitar)
  vi.stubGlobal('createError', (datos: { data?: { codigo?: string } }) => Object.assign(new Error('Error editorial'), datos))
})
afterEach(() => vi.unstubAllGlobals())

describe('redacción estructurada de Codex con DeepSeek', () => {
  it('solicita JSON y procesa texto con comillas y llaves sin perder el documento', async () => {
    const texto = 'El “promedio” cambia según los partidos. La fórmula {P/N} explica el resultado de "ganar".'
    solicitar.mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({
      titulo: entrada.tituloSugerido, resumen: 'Reglas del promedio en Colombia.', tipo: 'analisis',
      documento: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: texto }] }] }
    }) } }], model: 'modelo-prueba' })
    const resultado = await crearProveedorDeepSeekCodex().redactarBorrador(entrada)
    expect(solicitar).toHaveBeenCalledOnce()
    expect(solicitar.mock.calls[0][1].body.response_format).toEqual({ type: 'json_object' })
    expect(resultado.propuesta.documento.content[0]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: texto }] })
  })

  it.each([
    ['JSON mal formado', 'stop', '{"titulo":"incompleto"', 'IA_REDACCION_INVALIDA'],
    ['salida truncada', 'length', '{}', 'IA_REDACCION_TRUNCADA'],
    ['salida vacía', 'stop', '', 'IA_REDACCION_SIN_CONTENIDO']
  ])('rechaza %s sin inventar una propuesta ni repetir el cobro', async (_caso, finishReason, contenido, codigo) => {
    solicitar.mockResolvedValue({ choices: [{ finish_reason: finishReason, message: { content: contenido } }] })
    await expect(crearProveedorDeepSeekCodex().redactarBorrador(entrada)).rejects.toMatchObject({ data: { codigo } })
    expect(solicitar).toHaveBeenCalledOnce()
  })
})
