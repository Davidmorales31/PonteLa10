import { exigirEdicionEditorial, exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { hashPromptReescritura, reescribirArticuloConDeepSeek } from '~/server/utils/ai/deepseekRedaccion'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  finalizarReescrituraIaEditorial,
  guardarArticuloEditorial,
  obtenerArticuloEditorial,
  registrarFalloReescrituraIaEditorial,
  reservarReescrituraIaEditorial
} from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial, esquemaReescrituraIaEditorial } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento) => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.revisar')
  const contextoEdicion = await exigirEdicionEditorial(evento)
  const articuloId = validarEntradaEditorial(esquemaIdEditorial, getRouterParam(evento, 'id'))
  const entrada = validarEntradaEditorial(esquemaReescrituraIaEditorial, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const articulo = await obtenerArticuloEditorial(cliente, articuloId, contexto.usuario.id, {
    editarTodos: contextoEdicion.permisos.includes('contenido.editarTodos'),
    editarPropio: contextoEdicion.permisos.includes('contenido.editarPropio')
  })

  if (!articulo.puedeEditar || articulo.estado !== 'changes_requested') {
    throw createError({ statusCode: 409, statusMessage: 'Solicita cambios antes de pedir una reescritura con IA.', data: { codigo: 'REESCRITURA_IA_ESTADO_INVALIDO' } })
  }

  const requestId = crypto.randomUUID()
  const hash = hashPromptReescritura({
    titulo: articulo.titulo,
    slug: articulo.slug,
    resumen: articulo.resumen,
    tipo: articulo.tipo,
    categoriaId: articulo.categoriaId,
    portadaId: articulo.portadaId,
    temaIds: articulo.temaIds,
    etiquetaIds: articulo.etiquetaIds,
    documento: articulo.documento,
    fuente: articulo.fuente,
    seo: articulo.seo
  }, entrada.instruccion)
  const reserva = await reservarReescrituraIaEditorial(
    cliente,
    articuloId,
    requestId,
    entrada.instruccion,
    hash,
    entrada.versionBloqueo
  )
  if (reserva === 'running') {
    throw createError({ statusCode: 409, statusMessage: 'Ya hay una reescritura con IA en curso para esta noticia.', data: { codigo: 'REESCRITURA_IA_EN_CURSO' } })
  }

  const inicio = Date.now()
  try {
    const datosActuales = {
      titulo: articulo.titulo,
      slug: articulo.slug,
      resumen: articulo.resumen,
      tipo: articulo.tipo,
      categoriaId: articulo.categoriaId,
      portadaId: articulo.portadaId,
      temaIds: articulo.temaIds,
      etiquetaIds: articulo.etiquetaIds,
      documento: articulo.documento,
      fuente: articulo.fuente,
      seo: articulo.seo
    }
    const resultadoIa = await reescribirArticuloConDeepSeek(datosActuales, entrada.instruccion)
    const guardado = await guardarArticuloEditorial(cliente, articuloId, {
      ...resultadoIa.datos,
      versionBloqueo: entrada.versionBloqueo,
      notaCambio: 'Cambios solicitados aplicados con IA'
    })
    await finalizarReescrituraIaEditorial(
      cliente,
      articuloId,
      requestId,
      resultadoIa.proveedor,
      resultadoIa.modelo,
      resultadoIa.duracionMs,
      resultadoIa.datos
    )
    return guardado
  } catch (error) {
    const codigo = (error as { data?: { codigo?: string } })?.data?.codigo || 'IA_REESCRITURA_FALLIDA'
    await registrarFalloReescrituraIaEditorial(cliente, articuloId, requestId, codigo, Date.now() - inicio)
    throw error
  }
})
