import { describe, expect, it } from 'vitest'
import * as buscador from '../../scripts/video-buscar-fotos.mjs'
import * as generador from '../../scripts/video-generar-proyecto.mjs'

interface Imagen { url: string, texto: string, principal: boolean }
const urlPublica = buscador.urlPublica as unknown as (u: string) => URL | null
const nombreMedio = buscador.nombreMedio as unknown as (u: string, sitio?: string) => string
const clavesNoticia = buscador.clavesNoticia as unknown as (club: string, ...titulos: string[]) => string[]
const llaveArchivo = buscador.llaveArchivo as unknown as (u: string) => string
const imagenesDePagina = buscador.imagenesDePagina as unknown as (html: string, base: string) => { imagenes: Imagen[], sitio: string }
const imagenRelevante = buscador.imagenRelevante as unknown as (i: Imagen, claves: string[]) => boolean
const distancia = buscador.distancia as unknown as (a: number[], b: number[]) => number
const planificar = generador.planificar as unknown as (guion: unknown, opciones?: Record<string, unknown>) => { resumenFotos: Array<{ clave: string, vacios: number, sinFotoPropia: number }> }

describe('buscador automático de fotos', () => {
  it('solo sale a internet público', () => {
    expect(urlPublica('https://www.futbolred.com/nota')).not.toBeNull()
    for (const u of ['http://localhost:4810/x', 'http://127.0.0.1/x', 'http://192.168.1.4/x', 'file:///C:/x.jpg', 'http://10.0.0.2/x', 'no es url']) expect(urlPublica(u)).toBeNull()
  })

  it('pone un crédito legible al medio', () => {
    expect(nombreMedio('https://imagenes2.eltiempo.com/files/x.jpg')).toBe('El Tiempo')
    expect(nombreMedio('https://qhubomedellin.com/nota', 'Q')).toBe('Q’hubo Medellín')
    expect(nombreMedio('https://www.medio-raro.co/nota', 'EL DIARIO RARO')).toBe('El Diario Raro')
    expect(nombreMedio('https://www.medio-raro.co/nota', 'medio-raro.co')).toBe('medio-raro.co')
  })

  it('identifica la noticia por el club y los nombres propios, sin ciudades ambiguas ni «Copa América»', () => {
    expect(clavesNoticia('América de Cali', 'América de Cali empata con Inter')).toEqual(expect.arrayContaining(['america', 'america de cali', 'inter']))
    expect(clavesNoticia('Deportivo Cali')).toEqual(['deportivo cali'])
    expect(clavesNoticia('Independiente Medellín')).toEqual(['independiente medellin'])
    expect(clavesNoticia('Liga BetPlay')).toEqual([])
    const relevante = (texto: string, claves: string[]) => imagenRelevante({ url: 'x', texto, principal: false }, claves)
    expect(relevante('Jugadores del América de Cali celebran', ['america'])).toBe(true)
    expect(relevante('Colombia en la Copa América 2024', ['america'])).toBe(false)
    expect(relevante('millonarios-2', ['junior'])).toBe(false)
    expect(imagenRelevante({ url: 'x', texto: '', principal: true }, [])).toBe(true)
  })

  it('saca la imagen principal y las del cuerpo, con la versión más grande y sin logos', () => {
    const html = `<html><head><meta property="og:image" content="https://cdn.medio.com/fotos/portada.jpg?w=1200&amp;q=80"><meta property="og:site_name" content="Medio"></head>
      <body><header><img src="/logo.png"></header><article>
      <img alt="Once Caldas celebra" srcset="/fotos/once-640.jpg 640w, /fotos/once-1600.jpg 1600w">
      <img data-src="https://cdn.medio.com/fotos/otra.jpg" alt="Millonarios entrena">
      <img src="/iconos/whatsapp.svg"></article></body></html>`
    const { imagenes, sitio } = imagenesDePagina(html, 'https://www.medio.com/nota')
    expect(sitio).toBe('Medio')
    expect(imagenes.map(i => i.url)).toEqual(['https://cdn.medio.com/fotos/portada.jpg?w=1200&q=80', 'https://www.medio.com/fotos/once-1600.jpg', 'https://cdn.medio.com/fotos/otra.jpg'])
    expect(imagenes[0].principal).toBe(true)
    expect(imagenes.filter(i => imagenRelevante(i, ['once caldas', 'caldas'])).map(i => i.url)).toHaveLength(2)
  })

  it('reconoce la misma foto en otro tamaño', () => {
    expect(llaveArchivo('https://imagenes2.eltiempo.com/files/og_thumbnail/files/fp/uploads/2026/11/17/6afd04247fce.jpeg')).toBe(llaveArchivo('https://imagenes2.eltiempo.com/files/image_1200_535/files/fp/uploads/2026/11/17/6afd04247fce.jpeg'))
    expect(distancia([1, 0, 1, 1], [1, 1, 1, 0])).toBe(2)
  })
})

describe('relleno de espacios sin foto', () => {
  const palabras = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`).join(' ')
  const guion = { fecha: '2026-11-18', gancho: { texto: palabras(20) }, bloques: [{ id: 'b1', club: 'Junior', caraBreve: palabras(8), voz: palabras(120), planos: [{ imagen: 'https://x/1.jpg', credito: 'Colprensa' }] }], cierre: { texto: palabras(10) } }

  it('sin repetir deja vacíos; con «repetirFotos» del proyecto no queda ninguno, pero cuenta los que no tienen foto propia', () => {
    const sin = planificar(guion, { ppm: 155 }).resumenFotos.find(r => r.clave === 'b1')!
    expect(sin.vacios).toBeGreaterThan(0)
    expect(sin.sinFotoPropia).toBe(sin.vacios)
    const con = planificar(guion, { ppm: 155, repetirFotos: true }).resumenFotos.find(r => r.clave === 'b1')!
    expect(con.vacios).toBe(0)
    expect(con.sinFotoPropia).toBe(sin.vacios)
  })
})
