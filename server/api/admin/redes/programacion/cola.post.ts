import { createHash } from 'node:crypto'
import { exigirPermisoEditorial, exigirMfaSegunPoliticaEditorial } from '~/server/utils/autorizacionEditorial'
import { validarOrigenOAuthSocial, clienteOAuthSocial } from '~/server/utils/contextoOAuthSocial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { leerBorradorSocial, validarMediosSociales } from '~/server/utils/repositorioPublicacionesSociales'
import { crearDocumentoSocialPredeterminado, formatosSociales } from '~/utils/editorial/publicacionesSociales'
import { esquemaProgramacionSocial } from '~/utils/editorial/programacionSocial'
import { validarPublicacionSocialLista } from '~/server/utils/recursosComposicionSocial'
import { verificarCuentaMeta } from '~/server/utils/publicacionMeta'
import { renderizarImagenesMeta, huellaImagenesMeta } from '~/server/utils/ejecutarPublicacionMeta'

export default defineEventHandler(async evento => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.editarTodos')
  exigirMfaSegunPoliticaEditorial(contexto)
  validarOrigenOAuthSocial(evento)
  setHeader(evento, 'Cache-Control', 'private, no-store')
  const entrada = esquemaProgramacionSocial.safeParse(await readBody(evento))
  if (!entrada.success) throw createError({ statusCode: 400, statusMessage: 'Selecciona noticias, destinos, una hora inicial y un intervalo válido.' })
  const valores = entrada.data
  const inicio = Date.parse(valores.inicio)
  if (inicio < Date.now() + 30_000 || inicio > Date.now() + 90 * 86400_000) throw createError({ statusCode: 422, statusMessage: 'Elige una hora inicial entre un minuto y 90 días en el futuro.' })
  const privado = clienteOAuthSocial(evento)
  const latido = await privado.from('social_scheduler_state').select('last_seen_at').eq('id', true).maybeSingle()
  if (latido.error || !latido.data || Date.parse(latido.data.last_seen_at) < Date.now() - 90_000) throw createError({ statusCode: 503,
    statusMessage: 'El programador no está activo. No se creó el lote. Mantén el servidor Node funcionando para programar.' })
  const runtime = useRuntimeConfig(evento)
  for (const destino of valores.destinos) await verificarCuentaMeta(runtime, destino)
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const sitio = new URL(String(runtime.public.socialSiteUrl || runtime.public.siteUrl))
  const preparados = []
  for (const id of valores.articulos) {
    const articulo = await obtenerArticuloEditorial(cliente, id, contexto.usuario.id, { editarTodos: true, editarPropio: false })
    if (articulo.estado !== 'published' || !articulo.tieneVersionPublica) throw createError({ statusCode: 409, statusMessage: 'El lote solo admite noticias publicadas en el sitio.' })
    const guardado = await leerBorradorSocial(cliente, id)
    const documento = guardado.borrador?.documento || crearDocumentoSocialPredeterminado(articulo.titulo, articulo.portadaId,
      articulo.seo.textoSocial || articulo.resumen, new URL(`/articulos/${articulo.slug}`, sitio).toString(), articulo.id)
    for (const destino of valores.destinos) {
      await validarPublicacionSocialLista({ ...documento, red: destino }, await validarMediosSociales(cliente, documento), sitio.host)
      const formato = formatosSociales[documento.formato]
      if (destino === 'instagram' && (formato.ancho / formato.alto < .8 || formato.ancho / formato.alto > 1.91)) throw createError({ statusCode: 422,
        statusMessage: `La noticia «${articulo.titulo.slice(0, 80)}» necesita formato de feed para Instagram.` })
    }
    preparados.push({ id, revision: guardado.borrador?.revision || 0, articleVersion: articulo.versionBloqueo,
      hash: createHash('sha256').update(JSON.stringify(documento)).digest('hex'),
      imageHash: huellaImagenesMeta(await renderizarImagenesMeta(cliente, documento, sitio.host)) })
  }
  const resultado = await privado.rpc('enqueue_social_schedule', { p_id: valores.operacionId, p_actor_id: contexto.usuario.id,
    p_starts_at: valores.inicio, p_interval_minutes: valores.intervaloMinutos, p_items: preparados, p_destinations: valores.destinos })
  if (resultado.error) throw createError({ statusCode: 409, statusMessage: 'No se pudo crear el lote. Revisa si alguna noticia ya tiene un envío pendiente y actualiza la cola antes de reintentar.' })
  return { loteId: resultado.data, cantidad: preparados.length }
})
