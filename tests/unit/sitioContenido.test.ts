import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import {
  listarArticulosPublicosEditoriales,
  listarArticulosPublicosPorEntidad,
  obtenerArticuloPublicoEditorial,
  obtenerUltimaNoticiaPublicaConPortada
} from '../../server/utils/repositorioContenidoEditorial'
import { sitioDeSolicitud } from '../../server/utils/sitioDeSolicitud'
import { sitioDelPanel } from '../../server/utils/sitioDelPanel'

function clienteFalso() {
  const llamadas: Array<{ nombre: string, parametros: Record<string, unknown> }> = []
  const cliente = {
    rpc: (nombre: string, parametros: Record<string, unknown> = {}) => {
      llamadas.push({ nombre, parametros })
      return Promise.resolve({ data: nombre === 'get_public_editorial_article' ? null : [], error: null })
    }
  }
  return { cliente: cliente as never, llamadas }
}

function evento(host: string, cookie = '', url = '/api/articulos'): H3Event {
  return { node: { req: { url, headers: { host, cookie } }, res: {} }, path: url, context: {} } as unknown as H3Event
}

describe('lecturas públicas por sitio', () => {
  it('pasan el sitio a cada RPC y usan Colombia por defecto', async () => {
    const { cliente, llamadas } = clienteFalso()
    await listarArticulosPublicosEditoriales(cliente, 5, 0)
    await listarArticulosPublicosEditoriales(cliente, 5, 0, undefined, 'mx')
    await listarArticulosPublicosEditoriales(cliente, 5, 0, { categoria: null, terminosCategoria: [], tema: 'liga-mx', buscar: null }, 'mx')
    await listarArticulosPublicosPorEntidad(cliente, 'team', 'club-x', 4, 'mx')
    await obtenerArticuloPublicoEditorial(cliente, 'un-articulo', 'mx')
    await obtenerUltimaNoticiaPublicaConPortada(cliente, 'mx')
    expect(llamadas.map(l => [l.nombre, l.parametros.requested_site])).toEqual([
      ['list_public_editorial_articles', 'co'],
      ['list_public_editorial_articles', 'mx'],
      ['list_public_editorial_articles_filtered', 'mx'],
      ['list_public_editorial_articles_for_entity', 'mx'],
      ['get_public_editorial_article', 'mx'],
      ['get_public_editorial_latest_article_with_cover', 'mx']
    ])
  })
})

describe('sitio de la petición y del panel', () => {
  it('la petición pública sale del host y acepta ?sitio= válido por encima', () => {
    expect(sitioDeSolicitud(evento('mx.pont3la10.com'))).toBe('mx')
    expect(sitioDeSolicitud(evento('www.pont3la10.com'))).toBe('co')
    expect(sitioDeSolicitud(evento('www.pont3la10.com', '', '/api/articulos?sitio=mx'))).toBe('mx')
    expect(sitioDeSolicitud(evento('mx.pont3la10.com', '', '/api/articulos?sitio=co'))).toBe('co')
    expect(sitioDeSolicitud(evento('mx.pont3la10.com', '', '/api/articulos?sitio=xx'))).toBe('mx')
    expect(sitioDeSolicitud(evento('evil.com'))).toBe('co')
  })

  it('el panel usa la cookie del selector y cae en Colombia si no es válida', () => {
    expect(sitioDelPanel(evento('www.pont3la10.com', 'pont3la10_sitio_panel=mx'))).toBe('mx')
    expect(sitioDelPanel(evento('www.pont3la10.com', 'pont3la10_sitio_panel=co'))).toBe('co')
    expect(sitioDelPanel(evento('www.pont3la10.com', 'pont3la10_sitio_panel=zz'))).toBe('co')
    expect(sitioDelPanel(evento('www.pont3la10.com', 'otra=mx'))).toBe('co')
    // Sin cookie válida, el panel abierto en el dominio de México administra México.
    expect(sitioDelPanel(evento('mx.pont3la10.com', ''))).toBe('mx')
    expect(sitioDelPanel(evento('mx.pont3la10.com', 'pont3la10_sitio_panel=co'))).toBe('co')
  })
})
