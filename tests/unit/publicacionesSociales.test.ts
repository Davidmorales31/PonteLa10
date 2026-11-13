import { readFileSync } from 'node:fs'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { parse } from 'opentype.js'
import sharp from 'sharp'
import { crearDocumentoSocial, crearDocumentoSocialPredeterminado, crearDiapositivaSocial, esquemaDocumentoSocial, formatosSociales,
  enlaceSocial, extraerTextoParaRedes, avisosCompatibilidadSocial, componerTextoSocial } from '~/utils/editorial/publicacionesSociales'
import { componerSvgSocial } from '~/utils/editorial/composicionSocial'
import { guardarBorradorSocial } from '~/server/utils/repositorioPublicacionesSociales'
import { validarPublicacionSocialLista } from '~/server/utils/recursosComposicionSocial'
import type { SupabaseClient } from '@supabase/supabase-js'

const articuloId = '11111111-1111-4111-8111-111111111111'
const medioId = '22222222-2222-4222-8222-222222222222'
const bytes = readFileSync(new URL('../../public/fonts/Montserrat-Bold.ttf', import.meta.url))
const fuente = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
const logo = `data:image/png;base64,${readFileSync(new URL('../../server/assets/redes/logo.png', import.meta.url)).toString('base64')}`
const crear = () => crearDocumentoSocial('Cúcuta ganó y **aseguró su permanencia**', medioId, 'El resultado y sus consecuencias.')

afterEach(() => vi.unstubAllGlobals())
describe('contrato social y tráfico propio', () => {
  it('mantiene estable la composición predeterminada de una noticia pendiente entre aprobación y ejecución', () => {
    const crearPendiente = () => crearDocumentoSocialPredeterminado('Noticia pendiente', medioId, 'Contexto', 'https://www.pont3la10.com/articulos/noticia', articuloId)
    expect(crearPendiente()).toEqual(crearPendiente())
    expect(crearPendiente().diapositivas[0]!.id).toBe(articuloId)
  })
  it('reutiliza la fotografía y no convierte una imagen única en carrusel', () => {
    const documento = crear()
    expect(documento.diapositivas).toHaveLength(1)
    expect(documento.diapositivas[0]?.medioId).toBe(medioId)
    expect(documento.tipo).toBe('unica')
    expect(documento.diapositivas[0]?.encuadres.cuadrado).toMatchObject({ tamanoTexto: 60, degradado: 90 })
    expect(esquemaDocumentoSocial.safeParse(documento).success).toBe(true)
  })
  it('rechaza medios ausentes, IDs duplicados, zoom inválido y cambios de formato implícitos', () => {
    const documento = crear()
    documento.diapositivas[0]!.medioId = null
    expect(esquemaDocumentoSocial.safeParse(documento).success).toBe(false)
    documento.diapositivas[0]!.medioId = medioId
    documento.diapositivas[0]!.encuadres.vertical.zoom = 4
    expect(esquemaDocumentoSocial.safeParse(documento).success).toBe(false)
    documento.diapositivas[0]!.encuadres.vertical.zoom = 1
    documento.diapositivas.push(structuredClone(documento.diapositivas[0]!))
    documento.tipo = 'carrusel'
    expect(esquemaDocumentoSocial.safeParse(documento).success).toBe(false)
    documento.diapositivas[1]!.id = crypto.randomUUID()
    expect(esquemaDocumentoSocial.safeParse(documento).success).toBe(true)
    documento.tipo = 'unica'
    expect(esquemaDocumentoSocial.safeParse(documento).success).toBe(false)
  })
  it('mantiene encuadres separados por formato y por diapositiva', () => {
    const documento = crear()
    documento.diapositivas.push(crearDiapositivaSocial('Contexto', medioId))
    documento.diapositivas[0]!.encuadres.vertical.x = 75
    expect(documento.diapositivas[0]!.encuadres.cuadrado.x).toBe(0)
    expect(documento.diapositivas[1]!.encuadres.vertical.x).toBe(0)
  })
  it('añade atribución estable sin perder parámetros o ancla', () => {
    const enlace = new URL(enlaceSocial('https://www.pont3la10.com/articulos/noticia?ref=portada#contexto', 'facebook', articuloId, 'enfoque_2'))
    expect(enlace.searchParams.get('utm_medium')).toBe('organic_social')
    expect(enlace.searchParams.get('utm_content')).toBe('enfoque_2')
    expect(enlace.searchParams.get('ref')).toBe('portada')
    expect(enlace.hash).toBe('#contexto')
  })
  it('no promete enlace en bio ni URL clicable para Instagram sin configuración', () => {
    const propuesta = { objetivo: 'Contexto', titular: 'Noticia', gancho: 'Ganó Cúcuta.', contexto: 'Se definió su permanencia.', razonParaLeer: 'Conoce las consecuencias.', sustento: ['Ganó Cúcuta.'] }
    expect(componerTextoSocial(propuesta, 'instagram', 'https://example.com')).not.toMatch(/biografía|https:/)
    expect(componerTextoSocial(propuesta, 'facebook', 'https://example.com')).toContain('https://example.com')
  })
  it('extrae citas sin el escapado de JSON y excluye enlaces relacionados como hechos', () => {
    expect(extraerTextoParaRedes({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dijo: "ganamos".' }] }] })).toBe('Dijo: "ganamos".')
  })
  it('advierte límites de X, imágenes estáticas y canal de WhatsApp', () => {
    const documento = crear(); documento.red = 'x'
    documento.diapositivas = Array.from({ length: 5 }, () => crearDiapositivaSocial('Contexto', medioId))
    expect(avisosCompatibilidadSocial(documento).join(' ')).toContain('cuatro')
    documento.formato = 'historia'; documento.red = 'whatsapp'
    expect(avisosCompatibilidadSocial(documento).join(' ')).toMatch(/estática/)
    expect(avisosCompatibilidadSocial(documento).join(' ')).toMatch(/manualmente/)
  })
})

describe('composición reproducible y exportación real', () => {
  it.each(Object.keys(formatosSociales) as Array<keyof typeof formatosSociales>)('exporta %s con dimensiones exactas y titular en trazados', async formato => {
    const imagen = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#176c80' } }).png().toBuffer()
    const entrada = { diapositiva: crear().diapositivas[0]!, formato, fuente,
      imagen: { url: `data:image/png;base64,${imagen.toString('base64')}`, ancho: 900, alto: 600 }, logo, dominio: 'www.pont3la10.com' }
    const svg = componerSvgSocial(entrada)
    expect(svg).toBe(componerSvgSocial(entrada))
    expect(svg).not.toContain('<text')
    expect(svg).toContain('#ffd800')
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    const metadata = await sharp(png).metadata()
    expect(metadata.width).toBe(formatosSociales[formato].ancho)
    expect(metadata.height).toBe(formatosSociales[formato].alto)
  })
  it('ofrece tres diseños CTA distintos y sin marcas externas de buscador', () => {
    const diapositiva = crearDiapositivaSocial('La historia completa está en Pont3la10', null, 'cta')
    const composiciones = ['minimalista', 'deportivo', 'editorial'].map(variante => {
      diapositiva.varianteCta = variante as typeof diapositiva.varianteCta
      return componerSvgSocial({ diapositiva, formato: 'vertical', fuente, imagen: null, logo, dominio: 'www.pont3la10.com' })
    })
    expect(new Set(composiciones).size).toBe(3)
    expect(composiciones.join('')).not.toContain('Google')
  })
  it('utiliza la imagen promocional de cierre por defecto y la conserva sin recortar', () => {
    const diapositiva = crearDiapositivaSocial('La historia completa está en Pont3la10', null, 'cta')
    expect(diapositiva.varianteCta).toBe('promocional')
    const svg = componerSvgSocial({ diapositiva, formato: 'historia', fuente, imagen: null, logo,
      dominio: 'www.pont3la10.com', imagenCta: '/brand/cta-pont3la10-generada-v2.png' })
    expect(svg).toContain('/brand/cta-pont3la10-generada-v2.png')
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"')
    expect(svg).toContain('data-pie-dominio="true"')
    expect(svg).toContain('aria-label="www.pont3la10.com"')
  })
  it('rechaza desbordamiento en lugar de eliminar contenido', () => {
    const diapositiva = crearDiapositivaSocial('palabra'.repeat(70), medioId)
    expect(() => componerSvgSocial({ diapositiva, formato: 'cuadrado', fuente, imagen: { url: '/foto.png', ancho: 900, alto: 600 }, logo, dominio: 'sitio' })).toThrow(/cuatro líneas/)
  })
  it('escapa atributos y jamás inserta el titular como HTML', () => {
    const diapositiva = crearDiapositivaSocial('<script>alert(1)</script>', medioId)
    const svg = componerSvgSocial({ diapositiva, formato: 'cuadrado', fuente,
      imagen: { url: '/foto.png" onload="alert(1)', ancho: 900, alto: 600 }, logo, dominio: 'sitio' })
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&quot;')
    expect(svg).not.toContain(' onload="')
  })
})

describe('persistencia y estado listo', () => {
  it('rechaza una revisión obsoleta sin sobrescribir el documento actual', async () => {
    vi.stubGlobal('createError', (opciones: object) => Object.assign(new Error(), opciones))
    const consulta = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(async () => ({ data: null, error: null })) }
    consulta.update.mockReturnValue(consulta); consulta.eq.mockReturnValue(consulta); consulta.select.mockReturnValue(consulta)
    const cliente = { from: () => consulta } as unknown as SupabaseClient
    const documento = crear(); documento.diapositivas = [crearDiapositivaSocial('CTA', null, 'cta')]
    await expect(guardarBorradorSocial(cliente, articuloId, documento, 2, 'draft')).rejects.toMatchObject({ statusCode: 409 })
    expect(consulta.eq).toHaveBeenCalledWith('revision', 2)
  })
  it('no marca listo con descripción vacía', async () => {
    vi.stubGlobal('createError', (opciones: object) => Object.assign(new Error(), opciones))
    const documento = crear(); documento.textos.facebook = '  '
    await expect(validarPublicacionSocialLista(documento, [], 'www.pont3la10.com')).rejects.toMatchObject({ statusCode: 422 })
  })
})
