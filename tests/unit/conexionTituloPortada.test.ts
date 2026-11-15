import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizarPropuestaProveedor } from '~/server/utils/ai/deepseekRedaccion'
import { instruccionesRedaccionCodex } from '~/server/utils/ai/instrucciones/redaccion-codex.mjs'
import { esquemaPropuestaBorradorIa } from '~/utils/editorial/redaccionIa'

const entrada = {
  ingestaId: 'f0098a0f-33b8-4509-921d-f68f132f165e',
  tituloSugerido: 'Nacional abre los cuadrangulares en Manizales',
  instrucciones: '',
  urlFuente: 'https://dimayor.com.co/2026/11/14/clasificados',
  creditos: 'DIMAYOR',
  categoriaId: '127758f0-f1ec-4bd4-a4d1-683ca6c4d6e2',
  tipoSugerido: 'noticia' as const,
  segmentos: [{ id: 0, inicioSegundos: 0, finSegundos: 4, texto: 'Dato verificable.' }]
}

function proponer(extra: Record<string, unknown>) {
  return normalizarPropuestaProveedor({
    titulo: 'Nacional visita a Once Caldas en la fecha 1 de cuadrangulares',
    resumen: 'Nacional cerró primero con 40 puntos y debuta en Manizales.',
    tipo: 'noticia',
    documento: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nacional terminó líder de la fase regular con 40 puntos y abre los cuadrangulares como visitante de Once Caldas.' }] }] },
    seo: {},
    fuente: {},
    segmentosFundamento: [{ id: 0 }],
    afirmacionesPorCorroborar: [],
    advertencias: [],
    ...extra
  }, entrada) as Record<string, unknown>
}

describe('conexión del titular de portada con el redactor de la corrida', () => {
  it('conserva un titular de portada válido y la propuesta cumple el contrato', () => {
    const propuesta = proponer({ tituloPortada: '  Nacional llega líder, pero arranca en Manizales  ' })

    expect(propuesta.tituloPortada).toBe('Nacional llega líder, pero arranca en Manizales')
    expect(esquemaPropuestaBorradorIa.safeParse(propuesta).success).toBe(true)
  })

  it('omite el campo si falta, es muy corto, es muy largo o trae caracteres de control', () => {
    for (const invalido of [undefined, '', 'Corto', 123, 'Titular con\u0007control de caracteres']) {
      const propuesta = proponer({ tituloPortada: invalido })
      expect('tituloPortada' in propuesta).toBe(false)
      expect(esquemaPropuestaBorradorIa.safeParse(propuesta).success).toBe(true)
    }
    // Un titular largo se recorta a 120 caracteres en vez de invalidar el borrador.
    const largo = proponer({ tituloPortada: 'x'.repeat(300) })
    expect((largo.tituloPortada as string).length).toBe(120)
    expect(esquemaPropuestaBorradorIa.safeParse(largo).success).toBe(true)
  })

  it('la ruta de ingestas no cambia: sin titular de portada no aparece la clave', () => {
    expect('tituloPortada' in proponer({})).toBe(false)
  })

  it('el esquema rechaza un titular de portada fuera de rango', () => {
    const base = proponer({})
    expect(esquemaPropuestaBorradorIa.safeParse({ ...base, tituloPortada: 'Corto' }).success).toBe(false)
    expect(esquemaPropuestaBorradorIa.safeParse({ ...base, tituloPortada: 'x'.repeat(121) }).success).toBe(false)
  })

  it('las instrucciones piden tituloPortada y separan título SEO de titular de clic', () => {
    expect(instruccionesRedaccionCodex).toContain('versionContrato, titulo, tituloPortada, resumen, tipo,')
    expect(instruccionesRedaccionCodex).toContain('titulo es el título del artículo, pensado para buscadores')
    expect(instruccionesRedaccionCodex).toContain('tituloPortada es el titular de la imagen del centro de noticias')
    expect(instruccionesRedaccionCodex).toContain('sus dos primeros párrafos')
    expect(instruccionesRedaccionCodex).toContain('ni prometer una revelación que el texto no entrega')
    // No se debilita la regla de no inventar.
    expect(instruccionesRedaccionCodex).toContain('No inventes citas, datos, marcadores')
  })

  it('la política documenta cómo pasar tituloPortada como coverHeadline', () => {
    const politica = readFileSync(new URL('../../docs/AUTOMATIZACION_EDITORIAL_IA.md', import.meta.url), 'utf8')
    expect(politica).toContain('## Titular de portada')
    expect(politica).toContain('propuesta.tituloPortada')
    expect(politica).toContain('coverHeadline')
  })
})
