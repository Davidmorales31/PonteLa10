import type { ZodType } from 'zod/v4'
import { alcancesAgente, auditarAgente, descripcionAlcances } from './llaves'
import type { AlcanceAgente, ContextoAgente } from './llaves'
import { errores } from './errores'
import * as esquemas from './esquemas'
import { composicionDesdeDocumento, documentoDesdeEntrada } from './mapeo'
import { descargarImagenPublica } from './urlSegura'
import { estadoProgramadorSocial } from '../configuracionSocialProduccion'
import { configuracionMediosTemporales, confirmarTemporalSocial, iniciarTemporalSocial, registrarTemporalDesdeBuffer, vincularTemporalesSociales, buscarTemporalesSociales, urlFirmadaVideoTemporal } from '../mediosTemporalesSociales'
import { renderizarDiapositivaPropia, renderizarImagenesPropias } from '../renderizadorPublicacionPropia'
import { listarMediosEditoriales } from '../repositorioMediaEditorial'
import { guardarPublicacionPropia, leerPublicacionPropia, leerRecibosPublicacionPropia, listarPublicacionesPropiasFiltradas, validarMediosPropios } from '../repositorioPublicacionesPropias'
import type { PublicacionPropia } from '../repositorioPublicacionesPropias'
import { formatosPropios, plantillasPropias, coloresTextoPropio, avisosPublicacionPropia, esDocumentoVideoPropio } from '~/utils/editorial/publicacionesPropias'

export class RespuestaBinaria { constructor(public tipo: string, public datos: Buffer) {} }

export interface DefinicionOperacion {
  id: string, herramienta: string, resumen: string, descripcion: string, alcance: AlcanceAgente | null
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', ruta: string, entrada: ZodType, estadoHttp?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ejecutar: (contexto: ContextoAgente, entrada: any) => Promise<unknown>
}

const minimoMinutosProgramar = 10, maximoDiasProgramar = 30

async function leerSuya(contexto: ContextoAgente, id: string, soloPropia: boolean): Promise<PublicacionPropia> {
  const publicacion = await leerPublicacionPropia(contexto.privado, id)
  if (soloPropia && publicacion.agenteId !== contexto.llave.id) throw errores.noEsTuya()
  return publicacion
}

async function vista(contexto: ContextoAgente, publicacion: PublicacionPropia) {
  let archivos: unknown[] = []
  try {
    const encontrados = await validarMediosPropios(contexto.privado, contexto.privado, publicacion.documento)
    archivos = [
      ...encontrados.temporales.map(archivo => ({ id: archivo.id, tipo: archivo.tipo, ancho: archivo.ancho, alto: archivo.alto, nombre: archivo.nombre, url: archivo.url, temporal: true })),
      ...encontrados.medios.map(medio => ({ id: medio.id, tipo: 'imagen', ancho: medio.ancho, alto: medio.alto, nombre: medio.titulo || medio.nombreOriginal, url: medio.urlPublica, temporal: false }))
    ]
  } catch { /* Los archivos temporales pueden haberse borrado tras publicar. */ }
  return {
    id: publicacion.id, titulo: publicacion.titulo, estado: publicacion.estado, destinos: publicacion.destinos, programadaPara: publicacion.programadaPara,
    revision: publicacion.revision, actualizadaEn: publicacion.actualizadaEn,
    origen: { creadaPorAgente: !!publicacion.agenteId, creadaPorEstaLlave: publicacion.agenteId === contexto.llave.id },
    solicitudAprobacion: publicacion.solicitudAprobacion,
    composicion: composicionDesdeDocumento(publicacion.documento),
    archivos,
    avisos: avisosPublicacionPropia(publicacion.documento, publicacion.destinos),
    recibos: await leerRecibosPublicacionPropia(contexto.privado, publicacion.id).catch(() => ({}))
  }
}

function exigirEditable(publicacion: PublicacionPropia) {
  if (!['draft', 'failed', 'scheduled'].includes(publicacion.estado)) throw errores.conflicto(`La publicación está «${publicacion.estado}» y ya no se puede modificar.`, 'estado_no_editable')
}

async function dryRun(contexto: ContextoAgente, publicacion: PublicacionPropia) {
  await validarMediosPropios(contexto.privado, contexto.privado, publicacion.documento)
  if (!esDocumentoVideoPropio(publicacion.documento)) await renderizarImagenesPropias(contexto.privado, contexto.privado, publicacion.documento)
}

const flujo = [
  '1. Sube o importa los archivos (`iniciarSubida`+`confirmarSubida`, o `importarImagenDesdeUrl`) o busca imágenes de la biblioteca (`buscarBiblioteca`).',
  '2. Crea la publicación con `crearPublicacion` (usa `claveIdempotencia` para poder reintentar sin duplicar).',
  '3. Revisa el resultado con `previsualizar` (devuelve la imagen real) y `validar`; corrige con `actualizarPublicacion`.',
  '4. Pide la aprobación humana con `solicitarAprobacion` (nota + hora sugerida). La persona la verá en su panel y la programa o publica con su MFA.',
  '5. Solo si la llave tiene el alcance `programar`, puedes usar `programar`/`cancelarProgramacion` sin aprobación previa.'
]

export const operaciones: DefinicionOperacion[] = [
  { id: 'capacidades', herramienta: 'redes_capacidades', alcance: null, metodo: 'GET', ruta: '/', entrada: esquemas.esquemaVacio,
    resumen: 'Descubre qué puede hacer esta llave', descripcion: 'Devuelve el alcance de la llave, los límites, las plantillas, los formatos y el flujo recomendado. Llámala primero.',
    async ejecutar(contexto) {
      const config = configuracionMediosTemporales()
      return {
        version: '1', modulo: 'Contenido para redes · publicaciones propias', llave: { nombre: contexto.llave.nombre, alcances: [...contexto.llave.alcances],
          limitePorMinuto: contexto.llave.limitePorMinuto, maxProgramacionesPorDia: contexto.llave.maxProgramacionesDia },
        alcancesDisponibles: Object.fromEntries(alcancesAgente.map(alcance => [alcance, descripcionAlcances[alcance]])),
        politica: { publicacionInmediata: 'No disponible para agentes.', aprobacionHumana: 'La publicación se aprueba con `solicitarAprobacion` o con el alcance `programar` (delegación explícita).',
          minutosMinimosParaProgramar: minimoMinutosProgramar, diasMaximosParaProgramar: maximoDiasProgramar },
        limites: { diapositivas: 10, imagenesPorDiapositiva: 4, textosPorDiapositiva: 6, imagenMb: Math.round(config.maxImagenBytes / 1048576), videoMb: Math.round(config.maxVideoBytes / 1048576),
          descripcionFacebook: 5000, descripcionInstagram: 2200 },
        formatos: Object.entries(formatosPropios).map(([id, formato]) => ({ id, nombre: formato.nombre, ancho: formato.ancho, alto: formato.alto })),
        plantillas: Object.entries(plantillasPropias).map(([id, plantilla]) => ({ id, nombre: plantilla.nombre, imagenes: plantilla.celdas.length })),
        coloresTexto: Object.keys(coloresTextoPropio), destinos: ['facebook', 'instagram'], flujoRecomendado: flujo
      }
    } },

  { id: 'listarPublicaciones', herramienta: 'redes_listar_publicaciones', alcance: 'leer', metodo: 'GET', ruta: '/publicaciones', entrada: esquemas.esquemaListar,
    resumen: 'Lista publicaciones', descripcion: 'Lista las publicaciones propias más recientes. Por defecto solo las creadas con esta llave.',
    async ejecutar(contexto, entrada: { estado?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed', ambito: 'mias' | 'todas', limite: number }) {
      const publicaciones = await listarPublicacionesPropiasFiltradas(contexto.privado, { agenteId: entrada.ambito === 'mias' ? contexto.llave.id : undefined, estado: entrada.estado, limite: entrada.limite })
      return { publicaciones }
    } },

  { id: 'leerPublicacion', herramienta: 'redes_leer_publicacion', alcance: 'leer', metodo: 'GET', ruta: '/publicaciones/:id', entrada: esquemas.esquemaId,
    resumen: 'Lee una publicación', descripcion: 'Devuelve la composición completa (editable y reenviable), los archivos, los avisos pendientes y los recibos de publicación.',
    async ejecutar(contexto, entrada: { id: string }) { return vista(contexto, await leerSuya(contexto, entrada.id, false)) } },

  { id: 'crearPublicacion', herramienta: 'redes_crear_publicacion', alcance: 'borradores', metodo: 'POST', ruta: '/publicaciones', entrada: esquemas.esquemaCrearPublicacion, estadoHttp: 201,
    resumen: 'Crea un borrador', descripcion: 'Crea una publicación en borrador (imágenes con plantilla, logo y texto, o un vídeo). Nunca se publica sola: queda para aprobación.',
    async ejecutar(contexto, entrada: esquemas.EntradaCrearPublicacion) {
      const documento = documentoDesdeEntrada(entrada)
      await validarMediosPropios(contexto.privado, contexto.privado, documento)
      const clave = entrada.claveIdempotencia ?? contexto.cabeceraIdempotencia
      if (clave && !/^[A-Za-z0-9_.:-]{8,100}$/.test(clave)) throw errores.validacion('La clave de idempotencia debe tener 8–100 caracteres: letras, números y _ . : -')
      const resultado = await contexto.privado.rpc('agent_create_social_custom_post', { p_key: contexto.llave.id, p_actor: contexto.llave.propietarioId,
        p_title: entrada.titulo, p_document: documento, p_destinations: entrada.destinos, p_idem: clave ?? null })
      const datos = resultado.data as { id: string, replayed: boolean } | null
      if (resultado.error || !datos) throw errores.interno('No se pudo crear la publicación.')
      if (!datos.replayed) await vincularTemporalesSociales(contexto.privado, datos.id, documento)
      return { ...(await vista(contexto, await leerPublicacionPropia(contexto.privado, datos.id))), repetida: datos.replayed }
    } },

  { id: 'actualizarPublicacion', herramienta: 'redes_actualizar_publicacion', alcance: 'borradores', metodo: 'PUT', ruta: '/publicaciones/:id', entrada: esquemas.esquemaActualizarPublicacion,
    resumen: 'Actualiza un borrador propio', descripcion: 'Reemplaza la composición de una publicación creada con esta llave. Exige la `revision` leída; editar cancela cualquier programación o solicitud de aprobación previa.',
    async ejecutar(contexto, entrada: esquemas.EntradaActualizarPublicacion) {
      const actual = await leerSuya(contexto, entrada.id, true)
      exigirEditable(actual)
      const documento = documentoDesdeEntrada(entrada)
      await validarMediosPropios(contexto.privado, contexto.privado, documento)
      const guardada = await guardarPublicacionPropia(contexto.privado, entrada.id, contexto.llave.propietarioId, { titulo: entrada.titulo, documento, destinos: entrada.destinos, revision: entrada.revision })
      await vincularTemporalesSociales(contexto.privado, entrada.id, documento)
      await auditarAgente(contexto.privado, contexto.llave, 'social.agent.saved', entrada.id, { revision: guardada.revision })
      return vista(contexto, guardada)
    } },

  { id: 'eliminarPublicacion', herramienta: 'redes_eliminar_publicacion', alcance: 'borradores', metodo: 'DELETE', ruta: '/publicaciones/:id', entrada: esquemas.esquemaId,
    resumen: 'Elimina un borrador propio', descripcion: 'Elimina una publicación en borrador o con error creada con esta llave y sin envíos. Los archivos temporales se limpian solos.',
    async ejecutar(contexto, entrada: { id: string }) {
      await leerSuya(contexto, entrada.id, true)
      const borrada = await contexto.privado.rpc('agent_delete_social_custom_post', { p_key: contexto.llave.id, p_actor: contexto.llave.propietarioId, p_id: entrada.id })
      if (borrada.error) throw errores.interno()
      if (borrada.data !== true) throw errores.conflicto('Solo se pueden eliminar borradores o piezas con error que no tengan envíos.', 'no_eliminable')
      return { eliminada: true, id: entrada.id }
    } },

  { id: 'previsualizar', herramienta: 'redes_previsualizar', alcance: 'leer', metodo: 'GET', ruta: '/publicaciones/:id/previsualizacion', entrada: esquemas.esquemaPrevisualizar,
    resumen: 'Previsualiza la imagen final', descripcion: 'Renderiza la diapositiva tal como se publicaría (JPEG). Úsala para revisar la composición con tus propios ojos antes de pedir aprobación.',
    async ejecutar(contexto, entrada: { id: string, diapositiva: number, formato: 'json' | 'jpg' }) {
      const publicacion = await leerSuya(contexto, entrada.id, false)
      const documento = publicacion.documento
      if (esDocumentoVideoPropio(documento)) {
        const [video] = await buscarTemporalesSociales(contexto.privado, documento.video.medioId ? [documento.video.medioId] : [])
        if (!video) throw errores.noEncontrado('El vídeo')
        return { tipo: 'video', url: await urlFirmadaVideoTemporal(contexto.privado, video), nota: 'Enlace temporal de lectura; ábrelo para ver el vídeo.' }
      }
      const posicion = entrada.diapositiva - 1
      const diapositiva = documento.diapositivas[posicion]
      if (!diapositiva) throw errores.validacion(`La publicación tiene ${documento.diapositivas.length} diapositiva(s).`)
      const jpeg = await renderizarDiapositivaPropia(contexto.privado, contexto.privado, diapositiva, documento.formato)
      if (entrada.formato === 'jpg') return new RespuestaBinaria('image/jpeg', jpeg)
      const { ancho, alto } = formatosPropios[documento.formato]
      return { tipo: 'imagen', mime: 'image/jpeg', ancho, alto, diapositiva: entrada.diapositiva, totalDiapositivas: documento.diapositivas.length, base64: jpeg.toString('base64') }
    } },

  { id: 'validar', herramienta: 'redes_validar', alcance: 'leer', metodo: 'POST', ruta: '/publicaciones/:id/validar', entrada: esquemas.esquemaId,
    resumen: 'Revisa si está lista', descripcion: 'Comprueba descripciones, destinos, archivos y renderizado, y dice si se puede pedir aprobación o programar.',
    async ejecutar(contexto, entrada: { id: string }) {
      const publicacion = await leerSuya(contexto, entrada.id, false)
      const motivos = [...avisosPublicacionPropia(publicacion.documento, publicacion.destinos)]
      try { await dryRun(contexto, publicacion) } catch (problema) { motivos.push((problema as { statusMessage?: string, message?: string }).statusMessage || (problema as Error).message || 'No se pudo renderizar la pieza.') }
      const latido = await contexto.privado.from('social_scheduler_state').select('last_seen_at').eq('id', true).maybeSingle()
      const programadorActivo = !latido.error && estadoProgramadorSocial(latido.data?.last_seen_at)
      return { listo: motivos.length === 0, motivos, programadorActivo,
        puedeProgramar: motivos.length === 0 && programadorActivo && contexto.llave.alcances.has('programar'), estado: publicacion.estado, revision: publicacion.revision }
    } },

  { id: 'solicitarAprobacion', herramienta: 'redes_solicitar_aprobacion', alcance: 'borradores', metodo: 'POST', ruta: '/publicaciones/:id/solicitar-aprobacion', entrada: esquemas.esquemaSolicitarAprobacion,
    resumen: 'Pide la aprobación de una persona', descripcion: 'Marca la pieza como pendiente de aprobación humana, con una nota y una hora sugerida. La persona la ve en su panel y decide. Editar la pieza invalida la solicitud.',
    async ejecutar(contexto, entrada: { id: string, revision: number, nota?: string, horaSugerida?: string }) {
      const actual = await leerSuya(contexto, entrada.id, true)
      if (!['draft', 'failed'].includes(actual.estado)) throw errores.conflicto('Solo se puede pedir aprobación de un borrador.', 'estado_no_editable')
      if (actual.revision !== entrada.revision) throw errores.conflicto('La publicación cambió desde que la leíste. Léela de nuevo.')
      const avisos = avisosPublicacionPropia(actual.documento, actual.destinos)
      if (avisos.length) throw errores.validacion('La pieza todavía tiene pendientes.', avisos)
      if (entrada.horaSugerida && Date.parse(entrada.horaSugerida) < Date.now()) throw errores.validacion('La hora sugerida ya pasó.')
      await dryRun(contexto, actual).catch((problema) => { throw errores.validacion((problema as { statusMessage?: string }).statusMessage || 'La pieza no se puede renderizar.') })
      const resultado = await contexto.privado.rpc('agent_request_social_approval', { p_key: contexto.llave.id, p_actor: contexto.llave.propietarioId, p_id: entrada.id,
        p_revision: entrada.revision, p_note: entrada.nota ?? null, p_suggested: entrada.horaSugerida ?? null })
      if (resultado.error) throw errores.interno()
      if (!(Array.isArray(resultado.data) ? resultado.data[0] : resultado.data)) throw errores.conflicto('La publicación cambió. Léela de nuevo.')
      return vista(contexto, await leerPublicacionPropia(contexto.privado, entrada.id))
    } },

  { id: 'programar', herramienta: 'redes_programar', alcance: 'programar', metodo: 'POST', ruta: '/publicaciones/:id/programar', entrada: esquemas.esquemaProgramar,
    resumen: 'Programa sin aprobación previa (alcance delegado)', descripcion: `Programa una pieza propia entre ${minimoMinutosProgramar} minutos y ${maximoDiasProgramar} días. Requiere el alcance \`programar\`, respeta la cuota diaria de la llave y queda auditado. La persona puede cancelar desde su panel.`,
    async ejecutar(contexto, entrada: { id: string, revision: number, fecha: string }) {
      const actual = await leerSuya(contexto, entrada.id, true)
      if (!['draft', 'failed'].includes(actual.estado)) throw errores.conflicto('Solo se puede programar un borrador.', 'estado_no_editable')
      if (actual.revision !== entrada.revision) throw errores.conflicto('La publicación cambió desde que la leíste. Léela de nuevo.')
      const inicio = Date.parse(entrada.fecha), ahora = Date.now()
      if (inicio < ahora + minimoMinutosProgramar * 60_000 || inicio > ahora + maximoDiasProgramar * 86_400_000) {
        throw errores.validacion(`Elige una hora entre ${minimoMinutosProgramar} minutos y ${maximoDiasProgramar} días desde ahora.`)
      }
      const avisos = avisosPublicacionPropia(actual.documento, actual.destinos)
      if (avisos.length) throw errores.validacion('La pieza todavía tiene pendientes.', avisos)
      const latido = await contexto.privado.from('social_scheduler_state').select('last_seen_at').eq('id', true).maybeSingle()
      if (latido.error || !estadoProgramadorSocial(latido.data?.last_seen_at)) throw errores.conflicto('El programador no está activo. No se programó la publicación.', 'programador_inactivo')
      await dryRun(contexto, actual).catch((problema) => { throw errores.validacion((problema as { statusMessage?: string }).statusMessage || 'La pieza no se puede renderizar.') })
      const resultado = await contexto.privado.rpc('agent_schedule_social_custom_post', { p_key: contexto.llave.id, p_actor: contexto.llave.propietarioId, p_id: entrada.id,
        p_revision: entrada.revision, p_at: new Date(inicio).toISOString(), p_max: contexto.llave.maxProgramacionesDia })
      if (resultado.error) {
        if (/Cuota/.test(resultado.error.message)) throw errores.limite(`Esta llave ya programó ${contexto.llave.maxProgramacionesDia} publicación(es) en las últimas 24 horas.`)
        throw errores.interno()
      }
      if (!(Array.isArray(resultado.data) ? resultado.data[0] : resultado.data)) throw errores.conflicto('La publicación cambió. Léela de nuevo.')
      return vista(contexto, await leerPublicacionPropia(contexto.privado, entrada.id))
    } },

  { id: 'cancelarProgramacion', herramienta: 'redes_cancelar_programacion', alcance: 'programar', metodo: 'POST', ruta: '/publicaciones/:id/cancelar-programacion', entrada: esquemas.esquemaId,
    resumen: 'Cancela la programación', descripcion: 'Devuelve a borrador una pieza propia programada.',
    async ejecutar(contexto, entrada: { id: string }) {
      await leerSuya(contexto, entrada.id, true)
      const resultado = await contexto.privado.rpc('agent_cancel_social_custom_schedule', { p_key: contexto.llave.id, p_actor: contexto.llave.propietarioId, p_id: entrada.id })
      if (resultado.error) throw errores.interno()
      if (!(Array.isArray(resultado.data) ? resultado.data[0] : resultado.data)) throw errores.conflicto('La publicación no está programada.', 'no_programada')
      return vista(contexto, await leerPublicacionPropia(contexto.privado, entrada.id))
    } },

  { id: 'iniciarSubida', herramienta: 'redes_iniciar_subida', alcance: 'medios', metodo: 'POST', ruta: '/medios/subidas', entrada: esquemas.esquemaIniciarSubida, estadoHttp: 201,
    resumen: 'Inicia la subida de un archivo local', descripcion: 'Devuelve una URL firmada de un solo uso para subir directo a almacenamiento privado temporal (imágenes JPG/PNG/WebP y vídeos MP4/MOV). Luego llama a `confirmarSubida`.',
    async ejecutar(contexto, entrada: { nombre: string, tipoMime: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/quicktime', tamano: number, publicacionId?: string }) {
      const inicio = await iniciarTemporalSocial(contexto.privado, contexto.llave.propietarioId, entrada)
      return { id: inicio.id, tipo: inicio.tipo, subida: { metodo: 'PUT', url: inicio.urlSubida, encabezados: { 'content-type': entrada.tipoMime, 'x-upsert': 'false' }, cuerpo: 'Bytes del archivo, sin codificar (--data-binary).', vigencia: '2 horas' },
        siguientePaso: `Sube el archivo y llama a confirmarSubida con id=${inicio.id}.` }
    } },

  { id: 'confirmarSubida', herramienta: 'redes_confirmar_subida', alcance: 'medios', metodo: 'POST', ruta: '/medios/subidas/:id/confirmar', entrada: esquemas.esquemaConfirmarSubida,
    resumen: 'Confirma una subida', descripcion: 'Verifica el tamaño y el contenido del archivo subido y lo deja listo para usarse en una publicación con su `id`.',
    async ejecutar(contexto, entrada: { id: string }) { return confirmarTemporalSocial(contexto.privado, contexto.llave.propietarioId, entrada.id) } },

  { id: 'importarImagenDesdeUrl', herramienta: 'redes_importar_imagen_url', alcance: 'medios', metodo: 'POST', ruta: '/medios/desde-url', entrada: esquemas.esquemaImportarUrl, estadoHttp: 201,
    resumen: 'Importa una imagen desde una URL pública', descripcion: 'Descarga una imagen JPG/PNG/WebP de un enlace HTTPS público (nunca de redes privadas) y la deja lista para usarse. Respeta los derechos: acredita la fuente en la descripción.',
    async ejecutar(contexto, entrada: { url: string, publicacionId?: string }) {
      const config = configuracionMediosTemporales()
      const descarga = await descargarImagenPublica(entrada.url, { maxBytes: config.maxImagenBytes })
      return registrarTemporalDesdeBuffer(contexto.privado, contexto.llave.propietarioId, { nombre: descarga.nombre, tipoMime: descarga.tipoMime, buffer: descarga.buffer, publicacionId: entrada.publicacionId }, config)
    } },

  { id: 'buscarBiblioteca', herramienta: 'redes_buscar_biblioteca', alcance: 'leer', metodo: 'GET', ruta: '/biblioteca', entrada: esquemas.esquemaBiblioteca,
    resumen: 'Busca imágenes de la biblioteca editorial', descripcion: 'Busca imágenes ya cargadas en el CMS. Su `id` sirve directamente como `medioId` en las composiciones.',
    async ejecutar(contexto, entrada: { busqueda?: string, limite: number }) {
      const respuesta = await listarMediosEditoriales(contexto.privado, { pagina: 1, limite: entrada.limite, busqueda: entrada.busqueda ?? '' })
      return { medios: respuesta.medios.map(medio => ({ id: medio.id, titulo: medio.titulo, textoAlternativo: medio.textoAlternativo, credito: medio.credito, ancho: medio.ancho, alto: medio.alto, url: medio.urlPublica })), total: respuesta.paginacion.total }
    } }
]

