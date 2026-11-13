import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { z } from 'zod'
import { consultarMeta, enlaceReciboMeta, esquemaReciboMeta, esperarContenedorMeta, limpiarMediosMetaCaducados, verificarCuentaMeta } from '~/server/utils/publicacionMeta'
import { renderizarDiapositivaSocial } from '~/server/utils/renderizadorPublicacionSocial'
import { leerBorradorSocial, validarMediosSociales } from '~/server/utils/repositorioPublicacionesSociales'
import { crearDocumentoSocialPredeterminado, formatosSociales, type DocumentoSocial } from '~/utils/editorial/publicacionesSociales'
import type { ResultadoPublicacionMeta } from '~/types/publicacionMeta'

import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConfiguracionMeta } from '~/server/utils/publicacionMeta'
import type { ArticuloDetalleEditorial } from '~/types/contenidoEditorial'

const esquemaReservaMeta = z.object({ id: z.string().uuid(), claim_id: z.string().uuid().nullable(), claimed: z.boolean(),
  status: z.enum(['preparing', 'sending', 'published', 'failed', 'uncertain']), post_url: z.string().url().nullable() })

export async function renderizarImagenesMeta(cliente: SupabaseClient, documento: DocumentoSocial, dominio: string) {
  const imagenes: Buffer[] = []
  for (const diapositiva of documento.diapositivas) {
    const imagen = await renderizarDiapositivaSocial(cliente, diapositiva, documento.formato, dominio)
    imagenes.push(await sharp(imagen.bytes).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer())
  }
  if (imagenes.some(imagen => imagen.byteLength > 5 * 1024 * 1024)) throw createError({ statusCode: 422, statusMessage: 'Una imagen supera 5 MB. Reduce el formato en el editor.' })
  return imagenes
}
export function huellaImagenesMeta(imagenes: Buffer[]) {
  return createHash('sha256').update(JSON.stringify(imagenes.map(imagen => createHash('sha256').update(imagen).digest('hex')))).digest('hex')
}

export async function ejecutarPublicacionMeta(datos: { cliente: SupabaseClient, articulo: ArticuloDetalleEditorial,
  urlCanonica: string, contexto: { usuario: { id: string } } },
  entrada: { destino: 'facebook' | 'instagram', revision: number, versionArticulo: number },
  privado: SupabaseClient, configuracion: ConfiguracionMeta, huellaAprobada?: string): Promise<ResultadoPublicacionMeta> {
  const { cliente, articulo, urlCanonica, contexto } = datos
  if (articulo.estado !== 'published' || !articulo.tieneVersionPublica) throw createError({ statusCode: 409, statusMessage: 'Solo se pueden compartir artículos aprobados y publicados.' })
  const guardado = await leerBorradorSocial(cliente, articulo.id)
  if ((guardado.borrador?.revision || 0) !== entrada.revision || articulo.versionBloqueo !== entrada.versionArticulo) {
    throw createError({ statusCode: 409, statusMessage: 'El contenido cambió. Cierra y vuelve a abrir Vista rápida antes de publicar.' })
  }
  const documento = guardado.borrador?.documento || crearDocumentoSocialPredeterminado(articulo.titulo, articulo.portadaId,
    articulo.seo.textoSocial || articulo.resumen, urlCanonica, articulo.id)
  const destino = entrada.destino
  const texto = documento.textos[destino].trim()
  if (!texto || [...texto].length > (destino === 'instagram' ? 2200 : 63206)) throw createError({ statusCode: 422,
    statusMessage: `Revisa la descripción de ${destino}: está vacía o excede su límite.` })
  const formato = formatosSociales[documento.formato]
  if (destino === 'instagram' && (formato.ancho / formato.alto < 0.8 || formato.ancho / formato.alto > 1.91)) {
    throw createError({ statusCode: 422, statusMessage: 'Para el feed de Instagram elige formato cuadrado o vertical en el editor.' })
  }
  const acceso = await verificarCuentaMeta(configuracion, destino)
  await validarMediosSociales(cliente, documento)
  const imagenes = await renderizarImagenesMeta(cliente, documento, new URL(urlCanonica).host)
  if (huellaAprobada && huellaImagenesMeta(imagenes) !== huellaAprobada) throw createError({ statusCode: 409,
    statusMessage: 'La imagen cambió después de aprobar la programación. Revisa la vista previa y programa de nuevo.' })
  const huella = createHash('sha256').update(JSON.stringify({ cuenta: acceso.id, texto, formato: documento.formato,
    imagenes: imagenes.map(imagen => createHash('sha256').update(imagen).digest('hex')) })).digest('hex')
  const intento = await privado.rpc('begin_social_meta_publication', { p_actor_id: contexto.usuario.id,
    p_article_id: articulo.id, p_destination: destino, p_content_hash: huella })
  const reserva = esquemaReservaMeta.safeParse(intento.data)
  if (intento.error || !reserva.success) throw createError({ statusCode: 503, statusMessage: 'No se pudo reservar el envío seguro de Meta. No se publicó contenido.' })
  if (reserva.data.status === 'published') return { estado: 'published', url: reserva.data.post_url || undefined, yaPublicado: true }
  if (reserva.data.status === 'uncertain') return { estado: 'uncertain' }
  if (!reserva.data.claimed || !reserva.data.claim_id) return { estado: reserva.data.status === 'failed' ? 'failed' : 'in_progress' }
  const datosReserva = reserva.data
  const actualizar = async (estado: string, extra: { p_post_id?: string, p_url?: string, p_paths?: string[], p_container_id?: string, p_media_ids?: string[] } = {}) => {
    const resultado = await privado.rpc('set_social_meta_publication_status', { p_actor_id: contexto.usuario.id,
      p_id: datosReserva.id, p_claim_id: datosReserva.claim_id!, p_status: estado, ...extra })
    if (resultado.error) throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar el estado seguro del envío.' })
  }
  const almacen = privado.storage.from('social-meta-private')
  const rutas: string[] = []
  let enviando = false
  try {
    let publicacion: unknown
    if (destino === 'facebook') {
      const adjuntos: { media_fbid: string }[] = []
      for (const imagen of imagenes) {
        const foto = esquemaReciboMeta.parse(await consultarMeta(acceso.token, `${acceso.id}/photos`,
          { metodo: 'POST', parametros: { published: 'false' }, archivo: imagen }))
        adjuntos.push({ media_fbid: foto.id })
        await actualizar('preparing', { p_media_ids: adjuntos.map(adjunto => adjunto.media_fbid) })
      }
      await actualizar('sending')
      enviando = true
      publicacion = await consultarMeta(acceso.token, `${acceso.id}/feed`, {
        metodo: 'POST', parametros: { message: texto, attached_media: JSON.stringify(adjuntos) }
      })
    } else {
      const urls: string[] = []
      const rutasPrevistas = imagenes.map((_, indice) => `${datosReserva.id}/${datosReserva.claim_id}/${indice}.jpg`)
      // Registrar antes de subir permite limpiar incluso tras una interrupción del proceso.
      await actualizar('preparing', { p_paths: rutasPrevistas })
      for (const [indice, imagen] of imagenes.entries()) {
        const ruta = rutasPrevistas[indice]!
        const subida = await almacen.upload(ruta, imagen, { contentType: 'image/jpeg', upsert: false })
        if (subida.error) throw createError({ statusCode: 503, statusMessage: 'No se pudo preparar la imagen privada para Instagram.' })
        rutas.push(ruta)
        const firma = await almacen.createSignedUrl(ruta, 3600)
        if (firma.error || !firma.data?.signedUrl || new URL(firma.data.signedUrl).protocol !== 'https:') throw createError({ statusCode: 503, statusMessage: 'No se pudo habilitar la lectura temporal de la imagen.' })
        urls.push(firma.data.signedUrl)
      }
      const hijos: string[] = []
      for (const url of urls) {
        const contenedor = esquemaReciboMeta.parse(await consultarMeta(acceso.token, `${acceso.id}/media`, { metodo: 'POST', parametros: {
          image_url: url, ...(urls.length > 1 ? { is_carousel_item: 'true' } : { caption: texto })
        } }))
        hijos.push(contenedor.id)
      }
      if (hijos.length > 1) await Promise.all(hijos.map(id => esperarContenedorMeta(acceso.token, id)))
      const contenedorId = hijos.length === 1 ? hijos[0]! : esquemaReciboMeta.parse(await consultarMeta(acceso.token, `${acceso.id}/media`, {
        metodo: 'POST', parametros: { media_type: 'CAROUSEL', children: hijos.join(','), caption: texto }
      })).id
      await actualizar('preparing', { p_container_id: contenedorId })
      await esperarContenedorMeta(acceso.token, contenedorId)
      await actualizar('sending')
      enviando = true
      publicacion = await consultarMeta(acceso.token, `${acceso.id}/media_publish`, { metodo: 'POST', parametros: { creation_id: contenedorId } })
    }
    const recibo = esquemaReciboMeta.parse(publicacion)
    let url = enlaceReciboMeta(destino, recibo.id)
    if (destino === 'instagram') {
      try {
        const enlace = z.object({ permalink: z.string().regex(/^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/) })
          .safeParse(await consultarMeta(acceso.token, recibo.id, { parametros: { fields: 'permalink' } }))
        if (enlace.success) url = enlace.data.permalink
      } catch { /* El recibo confirma el envío; la consulta opcional del enlace no lo invalida. */ }
    }
    try { await actualizar('published', { p_post_id: recibo.id, p_url: url }) }
    catch { return { estado: 'published', url, aviso: 'Meta confirmó el envío pero no se guardó el recibo. Conserva el enlace; no vuelvas a enviar esta versión.' } }
    return { estado: 'published', url }
  } catch (problema) {
    try { await actualizar(enviando ? 'uncertain' : 'failed') } catch { /* La reserva bloquea reenvíos aunque falle la persistencia. */ }
    if (enviando) return { estado: 'uncertain', aviso: 'Meta no confirmó el resultado. Revisa la cuenta antes de cualquier nuevo envío; esta versión queda bloqueada.' }
    if (problema && typeof problema === 'object' && 'statusCode' in problema) throw problema
    throw createError({ statusCode: 502, statusMessage: 'No se pudo preparar la publicación. Revisa la conexión y el formato.' })
  } finally {
    // Los contenedores FINISHED ya importaron la imagen. Las URL firmadas nunca llegan al navegador.
    if (rutas.length) {
      try {
        const limpieza = await almacen.remove(rutas)
        if (!limpieza.error) await privado.from('social_meta_publications').update({ media_paths: [] })
          .eq('id', datosReserva.id).eq('claim_id', datosReserva.claim_id!)
      } catch { /* Conservar media_paths para recuperar la limpieza en un envío posterior. */ }
    }
    try { await limpiarMediosMetaCaducados(privado) } catch { /* La limpieza no altera el resultado del envío. */ }
  }
}
