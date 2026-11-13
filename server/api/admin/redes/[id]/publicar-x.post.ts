import { createHash } from 'node:crypto'
import { z } from 'zod'
import { contextoPublicacionSocial } from '~/server/utils/contextoPublicacionSocial'
import { clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { cifrarOAuthX, crearPublicacionX, descifrarOAuthX, permisosOAuthX, renovarTokenOAuthX, subirImagenX,
  validarConfiguracionOAuthX } from '~/server/utils/oauthX'
import { renderizarDiapositivaSocial } from '~/server/utils/renderizadorPublicacionSocial'
import { leerBorradorSocial, validarMediosSociales } from '~/server/utils/repositorioPublicacionesSociales'
import { analizarTextoX } from '~/server/utils/validacionTextoX'
import { crearDocumentoSocialPredeterminado } from '~/utils/editorial/publicacionesSociales'

const esquemaSolicitud = z.object({ confirmar: z.literal(true) }).strict()
const esquemaToken = z.object({ access_token: z.string().min(1).max(8192), refresh_token: z.string().min(1).max(8192),
  token_type: z.string().refine(valor => valor.toLowerCase() === 'bearer'), expires_in: z.number().int().positive(), scope: z.string().max(1000) })
const esquemaConexion = z.object({ id: z.string().uuid(), username: z.string(), token_cipher: z.string().max(24000),
  scopes: z.array(z.string()), expires_at: z.string() })
const esquemaReserva = z.object({ id: z.string().uuid(), status: z.enum(['reserved', 'uploading', 'sending', 'published', 'failed', 'uncertain']),
  claimed: z.boolean(), post_id: z.string().regex(/^[0-9]{1,30}$/).nullable(),
  post_url: z.string().url().nullable() })

function tokenDescifrado(cipher: string, clave: string) {
  const resultado = esquemaToken.safeParse(descifrarOAuthX(cipher, clave, 'x:tokens:Pont3la10'))
  if (!resultado.success || permisosOAuthX.some(permiso => !resultado.data.scope.split(' ').includes(permiso))) {
    throw createError({ statusCode: 409, statusMessage: 'La autorización guardada no permite publicar. Conecta X de nuevo.' })
  }
  return resultado.data
}

async function obtenerAccesoX(cliente: ReturnType<typeof clienteOAuthSocial>, clave: string, config: ReturnType<typeof validarConfiguracionOAuthX>) {
  const { data, error } = await cliente.from('social_x_connections')
    .select('id,username,token_cipher,scopes,expires_at').eq('provider', 'x').maybeSingle()
  const conexion = esquemaConexion.safeParse(data)
  if (error || !conexion.success || conexion.data.username.toLowerCase() !== 'pont3la10'
    || permisosOAuthX.some(permiso => !conexion.data.scopes.includes(permiso))) {
    throw createError({ statusCode: 409, statusMessage: 'Conecta @Pont3la10 con permisos de publicación antes de enviar.' })
  }
  const token = tokenDescifrado(conexion.data.token_cipher, clave)
  if (Date.parse(conexion.data.expires_at) > Date.now() + 90_000) return token.access_token

  let renovado: Awaited<ReturnType<typeof renovarTokenOAuthX>>
  try { renovado = await renovarTokenOAuthX(config, token.refresh_token) }
  catch {
    const vigente = await cliente.from('social_x_connections').select('token_cipher,expires_at')
      .eq('id', conexion.data.id).maybeSingle()
    if (!vigente.error && vigente.data && vigente.data.token_cipher !== conexion.data.token_cipher
      && Date.parse(vigente.data.expires_at) > Date.now() + 15_000) {
      return tokenDescifrado(vigente.data.token_cipher, clave).access_token
    }
    throw createError({ statusCode: 409, statusMessage: 'X no pudo renovar la autorización. Vuelve a conectar @Pont3la10.' })
  }
  const cipher = cifrarOAuthX(renovado, clave, 'x:tokens:Pont3la10')
  const venceEn = new Date(Date.now() + renovado.expires_in * 1000).toISOString()
  const guardado = await cliente.from('social_x_connections').update({ token_cipher: cipher, expires_at: venceEn })
    .eq('id', conexion.data.id).eq('token_cipher', conexion.data.token_cipher).select('id').maybeSingle()
  if (guardado.error) throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar la renovación segura de X.' })
  if (guardado.data) return renovado.access_token

  // Otra publicación pudo renovar primero; usa únicamente el ciphertext más reciente guardado.
  const actual = await cliente.from('social_x_connections').select('token_cipher,expires_at')
    .eq('id', conexion.data.id).maybeSingle()
  if (actual.error || !actual.data || Date.parse(actual.data.expires_at) <= Date.now() + 15_000) {
    throw createError({ statusCode: 503, statusMessage: 'No se confirmó la renovación de X. Reintenta desde el panel.' })
  }
  return tokenDescifrado(actual.data.token_cipher, clave).access_token
}

async function cambiarEstado(cliente: ReturnType<typeof clienteOAuthSocial>, actorId: string, id: string,
  estado: 'uploading' | 'sending' | 'published' | 'failed' | 'uncertain', extra: {
    postId?: string, url?: string, errorCode?: 'token_invalido' | 'media_rechazada' | 'post_rechazado' | 'proveedor_no_disponible'
  } = {}) {
  const { error } = await cliente.rpc('set_social_x_publication_status', {
    p_actor_id: actorId, p_publication_id: id, p_status: estado,
    p_provider_post_id: extra.postId || null, p_post_url: extra.url || null, p_error_code: extra.errorCode || null
  })
  if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar el estado de la publicación.' })
}

export default defineEventHandler(async (evento) => {
  const { cliente, articulo, urlCanonica, contexto } = await contextoPublicacionSocial(evento, true)
  const entrada = esquemaSolicitud.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 400, statusMessage: 'Confirma la publicación desde la vista rápida de X.' })
  if (articulo.estado !== 'published' || !articulo.tieneVersionPublica) {
    throw createError({ statusCode: 409, statusMessage: 'Solo se puede compartir en redes un artículo aprobado y publicado en Pont3la10.' })
  }

  const guardado = await leerBorradorSocial(cliente, articulo.id)
  const documento = guardado.borrador?.documento || crearDocumentoSocialPredeterminado(articulo.titulo, articulo.portadaId,
    articulo.seo.textoSocial || articulo.resumen, urlCanonica, articulo.id)
  const texto = documento.textos.x.trim()
  const conteo = analizarTextoX(texto)
  if (!texto || !conteo.valido) throw createError({ statusCode: 422,
    statusMessage: `El texto de X tiene ${conteo.longitud} caracteres ponderados; el máximo es ${conteo.limite}. Acórtalo en el editor.` })
  if (documento.diapositivas.length > 4) throw createError({ statusCode: 422,
    statusMessage: 'X admite hasta cuatro imágenes por publicación. Reduce el carrusel en el editor.' })
  await validarMediosSociales(cliente, documento)
  const imagenes = await Promise.all(documento.diapositivas.map(diapositiva =>
    renderizarDiapositivaSocial(cliente, diapositiva, documento.formato, new URL(urlCanonica).host)))
  const huella = createHash('sha256').update(JSON.stringify({ article: articulo.id, text: texto,
    format: documento.formato, images: imagenes.map(imagen => createHash('sha256').update(imagen.bytes).digest('hex')) })).digest('hex')

  const clientePrivado = clienteOAuthSocial(evento)
  const reservaRespuesta = await clientePrivado.rpc('begin_social_x_publication', {
    p_actor_id: contexto.usuario.id,
    p_article_id: articulo.id, p_content_hash: huella
  })
  const reserva = esquemaReserva.safeParse(reservaRespuesta.data)
  if (reservaRespuesta.error || !reserva.success) throw createError({ statusCode: 503,
    statusMessage: 'No se pudo reservar el envío seguro. Comprueba que la migración de publicaciones X esté instalada.' })
  if (reserva.data.status === 'published') return { estado: 'published', postId: reserva.data.post_id,
    url: reserva.data.post_url, yaPublicado: true }
  if (reserva.data.status === 'uncertain') return { estado: 'uncertain', yaPublicado: false }
  if (!reserva.data.claimed) return { estado: reserva.data.status === 'failed' ? 'failed' : 'in_progress', yaPublicado: false }

  const actorId = contexto.usuario.id
  const runtime = useRuntimeConfig(evento)
  let codigoError: 'token_invalido' | 'media_rechazada' | 'post_rechazado' | 'proveedor_no_disponible' = 'token_invalido'
  try {
    const config = validarConfiguracionOAuthX(runtime)
    const accessToken = await obtenerAccesoX(clientePrivado, config.clave, config)
    await cambiarEstado(clientePrivado, actorId, reserva.data.id, 'uploading')
    codigoError = 'media_rechazada'
    const mediaIds = await Promise.all(imagenes.map(imagen => subirImagenX(accessToken, imagen.bytes)))
    await cambiarEstado(clientePrivado, actorId, reserva.data.id, 'sending')
    codigoError = 'post_rechazado'
    const postId = await crearPublicacionX(accessToken, texto, mediaIds)
    const url = `https://x.com/Pont3la10/status/${postId}`
    try {
      await cambiarEstado(clientePrivado, actorId, reserva.data.id, 'published', { postId, url })
    } catch {
      return { estado: 'published', postId, url, yaPublicado: false, registroGuardado: false,
        aviso: 'X confirmó el post, pero no se pudo actualizar el registro local. Conserva este enlace y revísalo antes de volver a publicar.' }
    }
    return { estado: 'published', postId, url, yaPublicado: false }
  } catch (error) {
    const codigo = (error as { data?: { codigo?: string } })?.data?.codigo
    if (codigo === 'X_RESPUESTA_INCIERTA') {
      try { await cambiarEstado(clientePrivado, actorId, reserva.data.id, 'uncertain', { errorCode: 'proveedor_no_disponible' }) }
      catch { /* El envío queda bloqueado por la reserva activa y nunca se reintenta automáticamente. */ }
      return { estado: 'uncertain', yaPublicado: false }
    }
    const mapeo = codigo === 'X_PUBLICACION_RECHAZADA' ? 'post_rechazado'
      : codigo === 'X_MEDIA_RECHAZADA' ? 'media_rechazada' : codigoError
    try { await cambiarEstado(clientePrivado, actorId, reserva.data.id, 'failed', { errorCode: mapeo }) }
    catch { /* Conservar error original; una reserva activa impide dobles envíos inmediatos. */ }
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    throw createError({ statusCode: 502, statusMessage: 'No se pudo completar el envío a X. Revisa el borrador y la conexión.' })
  }
})
