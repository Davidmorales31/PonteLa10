import { createHash } from 'node:crypto'
import { createError } from 'h3'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { consultarMeta, enlaceReciboMeta, esquemaReciboMeta, esperarContenedorMeta, verificarCuentaMeta } from './publicacionMeta'
import type { ConfiguracionMeta } from './publicacionMeta'
import { resolverConfiguracionMetaSocial } from './configuracionSocialProduccion'
import { huellaImagenesPropias, renderizarImagenesPropias } from './renderizadorPublicacionPropia'
import { leerPublicacionPropia, validarMediosPropios } from './repositorioPublicacionesPropias'
import { formatosPropios } from '~/utils/editorial/publicacionesPropias'
import type { ResultadoPublicacionMeta } from '~/types/publicacionMeta'

const esquemaReserva = z.object({ id: z.string().uuid(), claim_id: z.string().uuid().nullable(), claimed: z.boolean(),
  status: z.enum(['preparing', 'sending', 'published', 'failed', 'uncertain']), post_url: z.string().url().nullable() })

/** Publica una pieza propia en Facebook o Instagram con reserva idempotente y recibo persistente. */
export async function ejecutarPublicacionMetaPropia(datos: { cliente: SupabaseClient, privado: SupabaseClient,
  configuracion: ConfiguracionMeta, actorId: string, postId: string },
entrada: { destino: 'facebook' | 'instagram', revision: number }, huellaAprobada?: string): Promise<ResultadoPublicacionMeta> {
  const { cliente, privado, actorId, postId } = datos
  const publicacion = await leerPublicacionPropia(privado, postId)
  if (publicacion.revision !== entrada.revision) throw createError({ statusCode: 409, statusMessage: 'La publicación cambió. Recarga el editor antes de publicar.' })
  if (publicacion.estado === 'published') throw createError({ statusCode: 409, statusMessage: 'Esta publicación ya fue enviada.' })
  const documento = publicacion.documento
  const destino = entrada.destino
  if (!publicacion.destinos.includes(destino)) throw createError({ statusCode: 422, statusMessage: 'Esta publicación no incluye ese destino.' })
  const texto = documento.textos[destino].trim()
  if (!texto || [...texto].length > (destino === 'instagram' ? 2200 : 63206)) {
    throw createError({ statusCode: 422, statusMessage: `Revisa la descripción de ${destino}: está vacía o excede su límite.` })
  }
  const formato = formatosPropios[documento.formato]
  if (destino === 'instagram' && (formato.ancho / formato.alto < 0.8 || formato.ancho / formato.alto > 1.91)) {
    throw createError({ statusCode: 422, statusMessage: 'Para el feed de Instagram elige formato cuadrado o vertical.' })
  }
  if (destino === 'instagram' && documento.diapositivas.length > 10) throw createError({ statusCode: 422, statusMessage: 'Instagram admite hasta 10 imágenes.' })
  const configuracion = await resolverConfiguracionMetaSocial(privado, datos.configuracion)
  const acceso = await verificarCuentaMeta(configuracion, destino)
  await validarMediosPropios(cliente, documento)
  const imagenes = await renderizarImagenesPropias(cliente, documento)
  if (huellaAprobada && huellaImagenesPropias(imagenes) !== huellaAprobada) {
    throw createError({ statusCode: 409, statusMessage: 'Las imágenes cambiaron después de programar. Revisa y programa de nuevo.' })
  }
  const huella = createHash('sha256').update(JSON.stringify({ cuenta: acceso.id, texto, formato: documento.formato,
    imagenes: imagenes.map(imagen => createHash('sha256').update(imagen).digest('hex')) })).digest('hex')
  const intento = await privado.rpc('begin_social_custom_publication', { p_actor_id: actorId, p_post_id: postId, p_destination: destino, p_content_hash: huella })
  const reserva = esquemaReserva.safeParse(intento.data)
  if (intento.error || !reserva.success) throw createError({ statusCode: 503, statusMessage: 'No se pudo reservar el envío seguro. No se publicó contenido.' })
  if (reserva.data.status === 'published') return { estado: 'published', url: reserva.data.post_url || undefined, yaPublicado: true }
  if (reserva.data.status === 'uncertain') return { estado: 'uncertain' }
  if (!reserva.data.claimed || !reserva.data.claim_id) return { estado: reserva.data.status === 'failed' ? 'failed' : 'in_progress' }
  const datosReserva = reserva.data
  const actualizar = async (estado: string, extra: { p_post_id?: string, p_url?: string, p_paths?: string[], p_container_id?: string, p_media_ids?: string[] } = {}) => {
    const resultado = await privado.rpc('set_social_custom_publication_status', { p_actor_id: actorId, p_id: datosReserva.id,
      p_claim_id: datosReserva.claim_id!, p_status: estado, ...extra })
    if (resultado.error) throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar el estado seguro del envío.' })
  }
  const almacen = privado.storage.from('social-meta-private')
  const rutas: string[] = []
  let enviando = false
  try {
    let respuesta: unknown
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
      respuesta = await consultarMeta(acceso.token, `${acceso.id}/feed`, { metodo: 'POST', parametros: { message: texto, attached_media: JSON.stringify(adjuntos) } })
    } else {
      const urls: string[] = []
      const rutasPrevistas = imagenes.map((_, indice) => `${datosReserva.id}/${datosReserva.claim_id}/${indice}.jpg`)
      await actualizar('preparing', { p_paths: rutasPrevistas })
      for (const [indice, imagen] of imagenes.entries()) {
        const ruta = rutasPrevistas[indice]!
        const subida = await almacen.upload(ruta, imagen, { contentType: 'image/jpeg', upsert: false })
        if (subida.error) throw createError({ statusCode: 503, statusMessage: 'No se pudo preparar la imagen privada para Instagram.' })
        rutas.push(ruta)
        const firma = await almacen.createSignedUrl(ruta, 3600)
        if (firma.error || !firma.data?.signedUrl || new URL(firma.data.signedUrl).protocol !== 'https:') {
          throw createError({ statusCode: 503, statusMessage: 'No se pudo habilitar la lectura temporal de la imagen.' })
        }
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
      respuesta = await consultarMeta(acceso.token, `${acceso.id}/media_publish`, { metodo: 'POST', parametros: { creation_id: contenedorId } })
    }
    const recibo = esquemaReciboMeta.parse(respuesta)
    let url = enlaceReciboMeta(destino, recibo.id)
    if (destino === 'instagram') {
      try {
        const enlace = z.object({ permalink: z.string().regex(/^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/) })
          .safeParse(await consultarMeta(acceso.token, recibo.id, { parametros: { fields: 'permalink' } }))
        if (enlace.success) url = enlace.data.permalink
      } catch { /* El recibo confirma el envío; el enlace opcional no lo invalida. */ }
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
    if (rutas.length) {
      try {
        const limpieza = await almacen.remove(rutas)
        if (!limpieza.error) await privado.from('social_custom_publications').update({ media_paths: [] }).eq('id', datosReserva.id).eq('claim_id', datosReserva.claim_id!)
      } catch { /* Se conservan las rutas para recuperar la limpieza después. */ }
    }
  }
}
