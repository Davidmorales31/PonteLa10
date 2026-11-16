<script setup lang="ts">
import { parse } from 'opentype.js'
import type { Font } from 'opentype.js'
import { ArrowLeft, Undo2, Redo2, LayoutGrid, Stamp, Type, Layers, Plus, Trash2, Copy, Replace, Crosshair, ZoomIn, ZoomOut, Send, CalendarClock, X, Clock3, ImagePlus, Palette, Droplets } from '@lucide/vue'
import type { MedioEditorial } from '~/types/mediaEditorial'
import type { TemporalSocialVista } from '~/utils/editorial/mediosTemporales'
import { aceptarImagenesTemporales, aceptarVideosTemporales } from '~/utils/editorial/mediosTemporales'
import { cajaElementoPropio, celdaEnPuntoPropio, componerSvgPropio, geometriaCeldaPropia, limitarPosicionPropia } from '~/utils/editorial/composicionPropia'
import type { DocumentoPropio, DocumentoPublicacionPropia, ElementoPropio, FormatoPropio, PlantillaPropia } from '~/utils/editorial/publicacionesPropias'
import { avisosPublicacionPropia, cambiarPlantillaPropia, coloresTextoPropio, crearDiapositivaPropia, crearDocumentoPropio, crearElementoLogo, crearElementoTexto,
  esDocumentoVideoPropio, formatosPropios, maximoDiapositivasPropias, plantillasPropias } from '~/utils/editorial/publicacionesPropias'

definePageMeta({ layout: false, middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ title: 'Editor de redes | Pont3la10', robots: 'noindex, nofollow' })
useHead({ link: [{ rel: 'manifest', href: '/manifest-redes.webmanifest' }, { rel: 'apple-touch-icon', href: '/brand/app-redes-180.png' }],
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' }, { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'mobile-web-app-capable', content: 'yes' }, { name: 'apple-mobile-web-app-title', content: 'Redes' }, { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#0b1220' }] })

interface RespuestaEditor {
  publicacion: { id: string, titulo: string, estado: string, destinos: Array<'facebook' | 'instagram'>, revision: number, programadaPara: string | null, documento: DocumentoPublicacionPropia }
  medios: MedioEditorial[], temporales: TemporalSocialVista[], recibos: Record<string, { estado: string, url?: string }>
}
type Seleccion = { tipo: 'celda', indice: number } | { tipo: 'elemento', id: string } | null
type Hoja = 'imagen' | 'elemento' | 'diseno' | 'publicar' | 'recientes' | null

const route = useRoute()
const { tienePermiso } = useContextoEditorial()
const { subir, progreso, subiendo } = useSubidaTemporalSocial()
const idActual = ref(String(route.params.id) === 'nuevo' ? '' : String(route.params.id))
const inicial = idActual.value ? (await useFetch<RespuestaEditor>(`/api/admin/redes/propias/${idActual.value}`)).data.value : null

const documento = ref<DocumentoPropio>({ ...crearDocumentoPropio(), formato: 'vertical' })
const tipo = ref<'imagenes' | 'video'>('imagenes')
const videoId = ref<string | null>(null)
const titulo = ref(''), destinos = ref<Array<'facebook' | 'instagram'>>(['facebook', 'instagram'])
const estado = ref('draft'), revision = ref(1), programadaPara = ref<string | null>(null)
const temporales = ref<TemporalSocialVista[]>([]), medios = ref<MedioEditorial[]>([])
const recibos = ref<Record<string, { estado: string, url?: string }>>({})
const igDistinto = ref(false)
if (inicial) {
  const guardado = inicial.publicacion.documento
  if (esDocumentoVideoPropio(guardado)) { tipo.value = 'video'; videoId.value = guardado.video.medioId; documento.value.textos = { ...guardado.textos } }
  else documento.value = structuredClone(toRaw(guardado)) as DocumentoPropio
  titulo.value = inicial.publicacion.titulo; destinos.value = [...inicial.publicacion.destinos]; estado.value = inicial.publicacion.estado
  revision.value = inicial.publicacion.revision; programadaPara.value = inicial.publicacion.programadaPara
  temporales.value = inicial.temporales; medios.value = inicial.medios; recibos.value = inicial.recibos
  igDistinto.value = guardado.textos.instagram !== '' && guardado.textos.instagram !== guardado.textos.facebook.slice(0, 2200)
}

const indice = ref(0), seleccion = ref<Seleccion>(null), hoja = ref<Hoja>(null)
const fuente = shallowRef<Font | null>(null)
const mensaje = ref(''), problema = ref(''), ocupado = ref(false), guardando = ref(false), sinGuardar = ref(false)
const fechaProgramada = ref(''), mostrarProgramar = ref(false)
const guias = ref({ v: false, h: false })
const lienzoRef = ref<HTMLElement | null>(null), entradaArchivo = ref<HTMLInputElement | null>(null)
let celdaDestino = 0
const logoPublico = '/brand/pont3la10_logo_login_blanco.png'
const etiquetas: Record<string, string> = { draft: 'Borrador', scheduled: 'Programada', publishing: 'Publicando…', published: 'Publicada', failed: 'Con error' }
const aceptar = `${aceptarImagenesTemporales},${aceptarVideosTemporales}`

const editable = computed(() => tienePermiso('contenido.editarTodos') && ['draft', 'failed', 'scheduled'].includes(estado.value))
const esVideo = computed(() => tipo.value === 'video')
const diapositiva = computed(() => documento.value.diapositivas[indice.value]!)
const formato = computed<FormatoPropio>(() => documento.value.formato)
const dimensiones = computed(() => formatosPropios[formato.value])
const razon = computed(() => dimensiones.value.ancho / dimensiones.value.alto)
const videoActual = computed(() => temporales.value.find(item => item.id === videoId.value && item.tipo === 'video') || null)
const documentoGuardable = computed<DocumentoPublicacionPropia>(() => esVideo.value
  ? { version: 1, tipo: 'video', video: { medioId: videoId.value }, textos: documento.value.textos } : documento.value)
const avisos = computed(() => avisosPublicacionPropia(documentoGuardable.value, destinos.value))
const elementoSeleccionado = computed(() => seleccion.value?.tipo === 'elemento' ? diapositiva.value.elementos.find(item => item.id === (seleccion.value as { id: string }).id) || null : null)
const celdaSeleccionada = computed(() => seleccion.value?.tipo === 'celda' ? seleccion.value.indice : -1)

function datosImagen(medioId: string | null): { url: string, ancho: number, alto: number } | null {
  if (!medioId) return null
  const temporal = temporales.value.find(item => item.id === medioId && item.tipo === 'imagen' && item.ancho && item.alto)
  if (temporal) return { url: temporal.url, ancho: temporal.ancho!, alto: temporal.alto! }
  const medio = medios.value.find(item => item.id === medioId)
  return medio ? { url: medio.urlPublica, ancho: medio.ancho, alto: medio.alto } : null
}
const imagenesDiapositiva = computed(() => diapositiva.value.medios.map(medio => datosImagen(medio.medioId)))
const svg = computed(() => {
  if (!fuente.value || esVideo.value) return ''
  try { return componerSvgPropio({ diapositiva: diapositiva.value, formato: formato.value, fuente: fuente.value, logo: logoPublico, imagenes: imagenesDiapositiva.value, permitirVacias: true }) }
  catch (falla) { return falla instanceof Error ? falla.message : '' }
})
const celdasVacias = computed(() => plantillasPropias[diapositiva.value.plantilla].celdas.flatMap((celda, posicion) => imagenesDiapositiva.value[posicion] ? [] : [{ posicion, celda }]))
const cajas = computed(() => diapositiva.value.elementos.map(elemento => ({ elemento, caja: cajaElementoPropio(elemento, formato.value, fuente.value) })))

onMounted(async () => {
  try {
    const respuesta = await fetch('/fonts/Montserrat-Bold.ttf')
    if (!respuesta.ok) throw new Error()
    fuente.value = parse(await respuesta.arrayBuffer())
  } catch { problema.value = 'No se pudo cargar la tipografía.' }
})

// ── Historial (deshacer / rehacer) ────────────────────────────────────────────
const instantanea = () => JSON.stringify({ d: documento.value, t: tipo.value, v: videoId.value })
let base = instantanea()
const pasado = ref<string[]>([]), futuro = ref<string[]>([])
function confirmarCambio() {
  const actual = instantanea()
  if (actual === base) return
  pasado.value.push(base); if (pasado.value.length > 50) pasado.value.shift()
  futuro.value = []; base = actual
}
function restaurar(foto: string) {
  const dato = JSON.parse(foto) as { d: DocumentoPropio, t: 'imagenes' | 'video', v: string | null }
  documento.value = dato.d; tipo.value = dato.t; videoId.value = dato.v; base = foto
  indice.value = Math.min(indice.value, documento.value.diapositivas.length - 1); seleccion.value = null
}
function deshacer() { const foto = pasado.value.pop(); if (!foto) return; futuro.value.push(base); restaurar(foto) }
function rehacer() { const foto = futuro.value.pop(); if (!foto) return; pasado.value.push(base); restaurar(foto) }

// ── Guardado automático ───────────────────────────────────────────────────────
let temporizador: ReturnType<typeof setTimeout> | undefined
let guardandoAhora: Promise<boolean> | null = null
watch([documento, tipo, videoId, destinos, titulo], () => {
  if (!idActual.value || !editable.value) return
  sinGuardar.value = true
  clearTimeout(temporizador); temporizador = setTimeout(() => { void guardar() }, 1200)
}, { deep: true })
async function guardar(): Promise<boolean> {
  clearTimeout(temporizador)
  if (guardandoAhora) { await guardandoAhora }
  if (!idActual.value || !destinos.value.length) return false
  const trabajo = (async () => {
    guardando.value = true
    const habiaProgramada = estado.value === 'scheduled'
    try {
      const respuesta = await $fetch<{ publicacion: { revision: number, estado: string, programadaPara: string | null }, temporales: TemporalSocialVista[], medios: MedioEditorial[] }>(`/api/admin/redes/propias/${idActual.value}`,
        { method: 'PUT', body: { titulo: titulo.value || nombreAutomatico(), documento: documentoGuardable.value, destinos: destinos.value, revision: revision.value } })
      revision.value = respuesta.publicacion.revision; estado.value = respuesta.publicacion.estado; programadaPara.value = respuesta.publicacion.programadaPara
      temporales.value = respuesta.temporales; medios.value = respuesta.medios; sinGuardar.value = false; problema.value = ''
      if (habiaProgramada) mensaje.value = 'Al editar, la programación se canceló. Vuelve a programarla.'
      return true
    } catch (falla) { problema.value = textoError(falla, 'No se pudo guardar. Tus cambios siguen aquí.'); return false } finally { guardando.value = false }
  })()
  guardandoAhora = trabajo
  try { return await trabajo } finally { guardandoAhora = null }
}
onBeforeUnmount(() => { clearTimeout(temporizador); if (sinGuardar.value) void guardar() })
const textoError = (falla: unknown, porDefecto: string) => (falla as { statusMessage?: string, message?: string }).statusMessage || (falla as Error)?.message || porDefecto
const nombreAutomatico = () => `Pieza ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })}`

// ── Archivos: subir desde el dispositivo ──────────────────────────────────────
function pedirArchivo(posicion: number) { celdaDestino = posicion; entradaArchivo.value?.click() }
async function asegurarPublicacion() {
  if (idActual.value) return
  const creada = await $fetch<{ id: string, revision: number }>('/api/admin/redes/propias', { method: 'POST', body: { titulo: nombreAutomatico() } })
  idActual.value = creada.id; revision.value = creada.revision; titulo.value = nombreAutomatico()
  window.history.replaceState(window.history.state, '', `/admin/redes/propias/${creada.id}`)
}
async function alElegirArchivos(evento: Event) {
  const entrada = evento.target as HTMLInputElement
  let archivos = [...(entrada.files || [])]
  entrada.value = ''
  if (!archivos.length || !editable.value) return
  problema.value = ''; mensaje.value = ''
  const video = archivos.find(archivo => archivo.type.startsWith('video/'))
  const hayImagenes = documento.value.diapositivas.some(item => item.medios.some(medio => medio.medioId))
  if (video && hayImagenes) { problema.value = 'Un video se publica solo. Quita las imágenes primero.'; return }
  if (video) archivos = [video]
  ocupado.value = true
  try {
    await asegurarPublicacion()
    const subidos: TemporalSocialVista[] = []
    for (const [posicion, archivo] of archivos.entries()) { mensaje.value = `Subiendo ${posicion + 1} de ${archivos.length}…`; subidos.push(await subir(archivo, idActual.value)) }
    temporales.value.push(...subidos); mensaje.value = ''
    if (video) { tipo.value = 'video'; videoId.value = subidos[0]!.id; seleccion.value = null }
    else colocarImagenes(subidos.map(item => item.id))
    confirmarCambio()
    await guardar()
  } catch (falla) { problema.value = textoError(falla, 'No se pudo subir. Inténtalo con mejor señal.'); mensaje.value = '' } finally { ocupado.value = false }
}
function colocarImagenes(ids: string[]) {
  const pendientes = [...ids]
  const destinos_ = [celdaDestino, ...diapositiva.value.medios.map((_, posicion) => posicion).filter(posicion => posicion !== celdaDestino && !diapositiva.value.medios[posicion]!.medioId)]
  for (const posicion of destinos_) { const id = pendientes.shift(); if (!id) break; diapositiva.value.medios[posicion]!.medioId = id }
  while (pendientes.length && documento.value.diapositivas.length < maximoDiapositivasPropias) {
    documento.value.diapositivas.push(crearDiapositivaPropia('una', [pendientes.shift()!]))
  }
  seleccion.value = { tipo: 'celda', indice: celdaDestino }
}

// ── Gestos táctiles: arrastrar, pellizcar, doble toque ───────────────────────
const punteros = new Map<number, { x: number, y: number }>()
type Gesto = { tipo: 'elemento', id: string, x0: number, y0: number, px: number, py: number, medida0: number }
  | { tipo: 'celda', indice: number, enc0: { x: number, y: number, zoom: number }, px: number, py: number, holgura: { x: number, y: number } } | null
let gesto: Gesto = null
let pellizco: { distancia: number } | null = null
let movido = false, inicioToque = 0, ultimoToque: { t: number, clave: string } = { t: 0, clave: '' }

function aLienzo(evento: { clientX: number, clientY: number }) {
  const rect = lienzoRef.value!.getBoundingClientRect()
  return { x: (evento.clientX - rect.left) / rect.width * dimensiones.value.ancho, y: (evento.clientY - rect.top) / rect.height * dimensiones.value.alto, escala: dimensiones.value.ancho / rect.width }
}
function medidaElemento(elemento: ElementoPropio) { return elemento.tipo === 'logo' ? elemento.ancho : elemento.tamano }
function iniciarGesto(punto: { x: number, y: number }) {
  const margen = 28
  for (const { elemento, caja } of [...cajas.value].reverse()) {
    if (punto.x >= caja.x - margen && punto.x <= caja.x + caja.ancho + margen && punto.y >= caja.y - margen && punto.y <= caja.y + caja.alto + margen) {
      return { tipo: 'elemento', id: elemento.id, x0: elemento.x, y0: elemento.y, px: punto.x, py: punto.y, medida0: medidaElemento(elemento) } satisfies Gesto
    }
  }
  const posicion = celdaEnPuntoPropio(diapositiva.value, formato.value, punto.x, punto.y)
  const imagen = posicion >= 0 ? imagenesDiapositiva.value[posicion] : null
  if (posicion < 0 || !imagen) return null
  const g = geometriaCeldaPropia(diapositiva.value, formato.value, posicion, imagen)
  return { tipo: 'celda', indice: posicion, enc0: { ...diapositiva.value.medios[posicion]!.encuadre }, px: punto.x, py: punto.y,
    holgura: { x: Math.max(0, (g.iw - g.w) / 2), y: Math.max(0, (g.ih - g.h) / 2) } } satisfies Gesto
}
function alPulsar(evento: PointerEvent) {
  if (!editable.value || esVideo.value || (evento.target as HTMLElement).closest('button')) return
  ;(evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId)
  punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY })
  if (punteros.size === 1) { gesto = iniciarGesto(aLienzo(evento)); movido = false; inicioToque = Date.now() }
  else if (punteros.size === 2) {
    const [a, b] = [...punteros.values()]
    pellizco = { distancia: Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1 }
    if (!gesto) {
      const medio = aLienzo({ clientX: (a!.x + b!.x) / 2, clientY: (a!.y + b!.y) / 2 })
      gesto = iniciarGesto(medio)
    }
    if (gesto) gesto = { ...gesto, ...(gesto.tipo === 'elemento' ? { medida0: medidaElemento(diapositiva.value.elementos.find(item => item.id === (gesto as { id: string }).id)!) } : { enc0: { ...diapositiva.value.medios[(gesto as { indice: number }).indice]!.encuadre } }) } as Gesto
    movido = true
  }
}
function alMover(evento: PointerEvent) {
  const anterior = punteros.get(evento.pointerId)
  if (!anterior || !gesto) return
  punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY })
  if (Math.hypot(evento.clientX - anterior.x, evento.clientY - anterior.y) > 0 && punteros.size === 1) {
    const punto = aLienzo(evento)
    if (!movido && Math.hypot(punto.x - gesto.px, punto.y - gesto.py) / punto.escala < 6) return
    movido = true
    const dx = punto.x - gesto.px, dy = punto.y - gesto.py
    if (gesto.tipo === 'elemento') {
      const elemento = diapositiva.value.elementos.find(item => item.id === (gesto as { id: string }).id)
      if (!elemento) return
      seleccion.value = { tipo: 'elemento', id: elemento.id }
      moverElemento(elemento, gesto.x0 + dx / dimensiones.value.ancho * 100, gesto.y0 + dy / dimensiones.value.alto * 100)
    } else {
      const encuadre = diapositiva.value.medios[gesto.indice]!.encuadre
      const limitar = (valor: number) => Math.max(-100, Math.min(100, valor))
      if (gesto.holgura.x > 1) encuadre.x = Math.round(limitar(gesto.enc0.x + dx / gesto.holgura.x * 100) * 10) / 10
      if (gesto.holgura.y > 1) encuadre.y = Math.round(limitar(gesto.enc0.y + dy / gesto.holgura.y * 100) * 10) / 10
      seleccion.value = { tipo: 'celda', indice: gesto.indice }
    }
  } else if (punteros.size === 2 && pellizco) {
    const [a, b] = [...punteros.values()]
    const razonPellizco = (Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1) / pellizco.distancia
    if (gesto.tipo === 'elemento') {
      const elemento = diapositiva.value.elementos.find(item => item.id === (gesto as { id: string }).id)
      if (!elemento) return
      if (elemento.tipo === 'logo') elemento.ancho = Math.round(Math.max(8, Math.min(80, gesto.medida0 * razonPellizco)) * 10) / 10
      else elemento.tamano = Math.round(Math.max(24, Math.min(140, gesto.medida0 * razonPellizco)))
      moverElemento(elemento, elemento.x, elemento.y)
    } else diapositiva.value.medios[gesto.indice]!.encuadre.zoom = Math.round(Math.max(1, Math.min(3, gesto.enc0.zoom * razonPellizco)) * 100) / 100
  }
}
function alSoltar(evento: PointerEvent) {
  punteros.delete(evento.pointerId)
  if (punteros.size === 1) { pellizco = null; const [restante] = [...punteros.values()]; if (gesto && restante) { const punto = aLienzo({ clientX: restante.x, clientY: restante.y }); gesto = { ...gesto, px: punto.x, py: punto.y, ...(gesto.tipo === 'elemento' ? { x0: diapositiva.value.elementos.find(item => item.id === (gesto as { id: string }).id)?.x ?? 50, y0: diapositiva.value.elementos.find(item => item.id === (gesto as { id: string }).id)?.y ?? 50 } : { enc0: { ...diapositiva.value.medios[(gesto as { indice: number }).indice]!.encuadre } }) } as Gesto }; return }
  if (punteros.size > 0) return
  guias.value = { v: false, h: false }
  const toque = !movido && Date.now() - inicioToque < 450
  const clave = gesto ? (gesto.tipo === 'elemento' ? `e${gesto.id}` : `c${gesto.indice}`) : 'vacio'
  if (toque) {
    const ahora = Date.now()
    if (clave === 'vacio') seleccion.value = null
    else seleccion.value = gesto!.tipo === 'elemento' ? { tipo: 'elemento', id: gesto!.id } : { tipo: 'celda', indice: gesto!.indice }
    if (ahora - ultimoToque.t < 320 && ultimoToque.clave === clave && clave !== 'vacio') hoja.value = gesto!.tipo === 'elemento' ? 'elemento' : 'imagen'
    ultimoToque = { t: ahora, clave }
  } else confirmarCambio()
  gesto = null; pellizco = null
}
function moverElemento(elemento: ElementoPropio, x: number, y: number) {
  const imantado = { x: Math.abs(x - 50) < 2.2 ? 50 : x, y: Math.abs(y - 50) < 2.2 ? 50 : y }
  guias.value = { v: imantado.x === 50, h: imantado.y === 50 }
  const posicion = limitarPosicionPropia(elemento, formato.value, fuente.value, imantado.x, imantado.y)
  elemento.x = posicion.x; elemento.y = posicion.y
}
function alRodar(evento: WheelEvent) {
  if (!editable.value || esVideo.value) return
  const factor = evento.deltaY < 0 ? 1.06 : 1 / 1.06
  const elemento = elementoSeleccionado.value
  if (elemento) { if (elemento.tipo === 'logo') elemento.ancho = Math.max(8, Math.min(80, elemento.ancho * factor)); else elemento.tamano = Math.round(Math.max(24, Math.min(140, elemento.tamano * factor))) }
  else if (celdaSeleccionada.value >= 0) { const e = diapositiva.value.medios[celdaSeleccionada.value]!.encuadre; e.zoom = Math.round(Math.max(1, Math.min(3, e.zoom * factor)) * 100) / 100 }
  else return
  clearTimeout(rueda); rueda = setTimeout(confirmarCambio, 400)
}
let rueda: ReturnType<typeof setTimeout> | undefined

// ── Acciones rápidas ──────────────────────────────────────────────────────────
function agregarLogo() { const elemento = crearElementoLogo(); diapositiva.value.elementos.push(elemento); seleccion.value = { tipo: 'elemento', id: elemento.id }; confirmarCambio() }
function agregarTexto() {
  const elemento = crearElementoTexto('Escribe tu titular'); diapositiva.value.elementos.push(elemento)
  seleccion.value = { tipo: 'elemento', id: elemento.id }; hoja.value = 'elemento'
}
function quitarElemento() {
  const elemento = elementoSeleccionado.value
  if (!elemento) return
  diapositiva.value.elementos = diapositiva.value.elementos.filter(item => item.id !== elemento.id); seleccion.value = null; hoja.value = null; confirmarCambio()
}
function duplicarElemento() {
  const elemento = elementoSeleccionado.value
  if (!elemento || diapositiva.value.elementos.length >= 8) return
  const copia = { ...structuredClone(toRaw(elemento)), id: crypto.randomUUID(), x: Math.min(95, elemento.x + 6), y: Math.min(95, elemento.y + 6) } as ElementoPropio
  diapositiva.value.elementos.push(copia); seleccion.value = { tipo: 'elemento', id: copia.id }; confirmarCambio()
}
const ciclo = <T,>(lista: readonly T[], actual: T) => lista[(lista.indexOf(actual) + 1) % lista.length]!
function cambiarColor() { const e = elementoSeleccionado.value; if (e?.tipo === 'texto') { e.color = ciclo(Object.keys(coloresTextoPropio) as Array<keyof typeof coloresTextoPropio>, e.color); confirmarCambio() } }
function cambiarFondo() {
  const e = elementoSeleccionado.value
  if (e?.tipo !== 'texto') return
  const actual = e.degradado ? 'degradado' : e.banda ? 'banda' : 'ninguno'
  const siguiente = ciclo(['degradado', 'banda', 'ninguno'] as const, actual)
  e.degradado = siguiente === 'degradado'; e.banda = siguiente === 'banda'; confirmarCambio()
}
function zoomCelda(delta: number) { if (celdaSeleccionada.value < 0) return; const e = diapositiva.value.medios[celdaSeleccionada.value]!.encuadre; e.zoom = Math.round(Math.max(1, Math.min(3, e.zoom + delta)) * 100) / 100; confirmarCambio() }
function centrarCelda() { if (celdaSeleccionada.value < 0) return; Object.assign(diapositiva.value.medios[celdaSeleccionada.value]!.encuadre, { x: 0, y: 0, zoom: 1 }); confirmarCambio() }
function quitarImagen() { if (celdaSeleccionada.value < 0) return; diapositiva.value.medios[celdaSeleccionada.value]!.medioId = null; seleccion.value = null; hoja.value = null; confirmarCambio() }
function ponerPlantilla(plantilla: PlantillaPropia) { documento.value.diapositivas[indice.value] = cambiarPlantillaPropia(diapositiva.value, plantilla); seleccion.value = null; confirmarCambio() }
function ponerFormato(nuevo: FormatoPropio) { documento.value.formato = nuevo; confirmarCambio() }
function agregarDiapositiva() { if (documento.value.diapositivas.length >= maximoDiapositivasPropias) return; documento.value.diapositivas.push(crearDiapositivaPropia('una')); indice.value = documento.value.diapositivas.length - 1; seleccion.value = null; confirmarCambio() }
function quitarDiapositiva() { if (documento.value.diapositivas.length < 2) return; documento.value.diapositivas.splice(indice.value, 1); indice.value = Math.max(0, indice.value - 1); seleccion.value = null; confirmarCambio() }
function quitarVideo() { videoId.value = null; tipo.value = 'imagenes'; confirmarCambio() }
function alEditarTexto() { clearTimeout(rueda); rueda = setTimeout(confirmarCambio, 600) }
function alEditarDescripcion() { if (!igDistinto.value) documento.value.textos.instagram = documento.value.textos.facebook.slice(0, 2200) }
function alternarDestino(destino: 'facebook' | 'instagram') { destinos.value = destinos.value.includes(destino) ? destinos.value.filter(item => item !== destino) : [...destinos.value, destino] }
function abrirDiseno() { hoja.value = 'diseno' }
function cerrarHoja() { hoja.value = null; confirmarCambio() }

// ── Publicar ──────────────────────────────────────────────────────────────────
async function publicarAhora() {
  if (!destinos.value.length) { problema.value = 'Elige al menos una red.'; return }
  if (!window.confirm(`¿Publicar ahora en ${destinos.value.map(item => item === 'facebook' ? 'Facebook' : 'Instagram').join(' e ')}? No se puede deshacer.`)) return
  ocupado.value = true; problema.value = ''; mensaje.value = ''
  try {
    if (!(await guardar())) return
    for (const destino of destinos.value) {
      if (recibos.value[destino]?.estado === 'published') continue
      mensaje.value = `Publicando en ${destino === 'facebook' ? 'Facebook' : 'Instagram'}…${esVideo.value ? ' (un video puede tardar un par de minutos)' : ''}`
      const resultado = await $fetch<{ estado: string, url?: string, aviso?: string }>(`/api/admin/redes/propias/${idActual.value}/publicar`, { method: 'POST', body: { destino, revision: revision.value, confirmar: true } })
      recibos.value = { ...recibos.value, [destino]: { estado: resultado.estado, url: resultado.url } }
      if (resultado.aviso) mensaje.value = resultado.aviso
    }
    const actual = await $fetch<RespuestaEditor>(`/api/admin/redes/propias/${idActual.value}`)
    estado.value = actual.publicacion.estado; recibos.value = actual.recibos
    if (estado.value === 'published') mensaje.value = '¡Publicada! Los archivos temporales ya se borraron.'
  } catch (falla) { problema.value = textoError(falla, 'No se pudo publicar.') } finally { ocupado.value = false }
}
async function programar() {
  if (!fechaProgramada.value) { problema.value = 'Elige fecha y hora.'; return }
  ocupado.value = true; problema.value = ''; mensaje.value = ''
  try {
    if (!(await guardar())) return
    const respuesta = await $fetch<{ estado: string, programadaPara: string | null }>(`/api/admin/redes/propias/${idActual.value}/programar`,
      { method: 'POST', body: { fecha: new Date(`${fechaProgramada.value}:00-05:00`).toISOString(), revision: revision.value, confirmar: true } })
    estado.value = respuesta.estado; programadaPara.value = respuesta.programadaPara; mostrarProgramar.value = false
    mensaje.value = 'Programada. Se publicará sola a esa hora (hora de Colombia).'
  } catch (falla) { problema.value = textoError(falla, 'No se pudo programar.') } finally { ocupado.value = false }
}
async function cancelarProgramacion() {
  ocupado.value = true
  try { await $fetch(`/api/admin/redes/propias/${idActual.value}/cancelar`, { method: 'POST', body: {} }); estado.value = 'draft'; programadaPara.value = null; mensaje.value = 'Programación cancelada.' }
  catch (falla) { problema.value = textoError(falla, 'No se pudo cancelar.') } finally { ocupado.value = false }
}
const recientes = ref<Array<{ id: string, titulo: string, estado: string }>>([])
async function abrirRecientes() {
  hoja.value = 'recientes'
  try { recientes.value = (await $fetch<{ publicaciones: typeof recientes.value }>('/api/admin/redes/propias')).publicaciones } catch { recientes.value = [] }
}
async function abrirPublicacion(id: string) { await guardar(); window.location.assign(`/admin/redes/propias/${id}`) }
</script>

<template>
  <main class="editor" :class="{ bloqueado: ocupado }">
    <header class="barra-superior">
      <NuxtLink to="/admin/redes" external aria-label="Salir al panel"><ArrowLeft :size="22" /></NuxtLink>
      <button type="button" class="titulo" aria-label="Publicaciones recientes" @click="abrirRecientes">{{ estado === 'draft' && !idActual ? 'Nueva pieza' : etiquetas[estado] }}<small v-if="guardando"> · guardando…</small><small v-else-if="sinGuardar"> · sin guardar</small></button>
      <button type="button" aria-label="Deshacer" :disabled="!pasado.length || !editable" @click="deshacer"><Undo2 :size="20" /></button>
      <button type="button" aria-label="Rehacer" :disabled="!futuro.length || !editable" @click="rehacer"><Redo2 :size="20" /></button>
      <button type="button" class="listo" :disabled="!idActual" @click="hoja = 'publicar'">Listo</button>
    </header>

    <p v-if="problema" class="aviso error" role="alert" @click="problema = ''">{{ problema }}</p>
    <p v-else-if="mensaje || subiendo" class="aviso" role="status">{{ subiendo ? `Subiendo… ${progreso} %` : mensaje }}</p>

    <section class="area" aria-label="Lienzo">
      <video v-if="esVideo && videoActual" :src="videoActual.url" class="video-lienzo" controls playsinline preload="metadata" />
      <button v-else-if="esVideo" type="button" class="vacio-grande" @click="pedirArchivo(0)"><ImagePlus :size="40" />Toca para elegir el video</button>
      <div v-else ref="lienzoRef" class="lienzo" :style="{ '--razon': razon }" @pointerdown="alPulsar" @pointermove="alMover" @pointerup="alSoltar" @pointercancel="alSoltar" @wheel.prevent="alRodar">
        <!-- SVG propio: texto convertido a trazados y atributos escapados por el compositor. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="svg.startsWith('<svg')" class="svg" v-html="svg" />
        <div v-else class="svg cargando">Cargando editor…</div>
        <button
v-for="vacia in celdasVacias" :key="vacia.posicion" type="button" class="celda-vacia" :disabled="!editable"
          :style="{ left: `${vacia.celda[0] * 100}%`, top: `${vacia.celda[1] * 100}%`, width: `${vacia.celda[2] * 100}%`, height: `${vacia.celda[3] * 100}%` }"
          :aria-label="`Agregar imagen ${vacia.posicion + 1}`" @pointerdown.stop @click="pedirArchivo(vacia.posicion)"><span><Plus :size="30" /><small>{{ idActual || diapositiva.medios.some(m => m.medioId) ? 'Agregar' : 'Toca para elegir imagen o video' }}</small></span></button>
        <div class="seleccion" aria-hidden="true">
          <i
v-for="{ elemento, caja } in cajas" v-show="seleccion?.tipo === 'elemento' && seleccion.id === elemento.id" :key="elemento.id"
            :style="{ left: `${caja.x / dimensiones.ancho * 100}%`, top: `${caja.y / dimensiones.alto * 100}%`, width: `${caja.ancho / dimensiones.ancho * 100}%`, height: `${caja.alto / dimensiones.alto * 100}%` }" />
          <b v-if="guias.v" class="guia-v" /><b v-if="guias.h" class="guia-h" />
          <u v-if="celdaSeleccionada >= 0" :style="{ left: `${plantillasPropias[diapositiva.plantilla].celdas[celdaSeleccionada]![0] * 100}%`, top: `${plantillasPropias[diapositiva.plantilla].celdas[celdaSeleccionada]![1] * 100}%`, width: `${plantillasPropias[diapositiva.plantilla].celdas[celdaSeleccionada]![2] * 100}%`, height: `${plantillasPropias[diapositiva.plantilla].celdas[celdaSeleccionada]![3] * 100}%` }" />
        </div>
      </div>
    </section>

    <input ref="entradaArchivo" type="file" class="oculto" :accept="aceptar" multiple @change="alElegirArchivos">

    <nav v-if="!esVideo" class="paginas" aria-label="Páginas del carrusel">
      <button v-for="(item, posicion) in documento.diapositivas" :key="item.id" type="button" :class="{ activa: posicion === indice }" @click="indice = posicion; seleccion = null">{{ posicion + 1 }}</button>
      <button v-if="editable && documento.diapositivas.length < maximoDiapositivasPropias" type="button" aria-label="Agregar página" @click="agregarDiapositiva"><Plus :size="16" /></button>
      <button v-if="editable && documento.diapositivas.length > 1" type="button" aria-label="Quitar página" @click="quitarDiapositiva"><Trash2 :size="16" /></button>
    </nav>

    <div v-if="editable && (seleccion || esVideo)" class="contextual" role="toolbar" aria-label="Acciones rápidas">
      <template v-if="esVideo"><button type="button" @click="pedirArchivo(0)"><Replace :size="18" />Cambiar video</button><button type="button" @click="quitarVideo"><Trash2 :size="18" />Quitar</button></template>
      <template v-else-if="elementoSeleccionado?.tipo === 'texto'">
        <button type="button" @click="hoja = 'elemento'"><Type :size="18" />Editar</button><button type="button" @click="cambiarColor"><Palette :size="18" />Color</button>
        <button type="button" @click="cambiarFondo"><Droplets :size="18" />Fondo</button><button type="button" @click="duplicarElemento"><Copy :size="18" /></button><button type="button" aria-label="Quitar texto" @click="quitarElemento"><Trash2 :size="18" /></button>
      </template>
      <template v-else-if="elementoSeleccionado"><button type="button" @click="duplicarElemento"><Copy :size="18" />Duplicar</button><button type="button" @click="quitarElemento"><Trash2 :size="18" />Quitar</button></template>
      <template v-else-if="celdaSeleccionada >= 0">
        <button type="button" @click="pedirArchivo(celdaSeleccionada)"><Replace :size="18" />Cambiar</button><button type="button" aria-label="Alejar" @click="zoomCelda(-.15)"><ZoomOut :size="18" /></button>
        <button type="button" aria-label="Acercar" @click="zoomCelda(.15)"><ZoomIn :size="18" /></button><button type="button" @click="centrarCelda"><Crosshair :size="18" />Centrar</button><button type="button" aria-label="Quitar imagen" @click="quitarImagen"><Trash2 :size="18" /></button>
      </template>
    </div>

    <nav v-if="!esVideo" class="dock" aria-label="Herramientas">
      <button type="button" :disabled="!editable" @click="abrirDiseno"><LayoutGrid :size="22" />Diseño</button>
      <button type="button" :disabled="!editable" @click="agregarLogo"><Stamp :size="22" />Logo</button>
      <button type="button" :disabled="!editable" @click="agregarTexto"><Type :size="22" />Texto</button>
      <button type="button" :disabled="!editable" @click="abrirDiseno"><Layers :size="22" />Formato</button>
    </nav>

    <div v-if="hoja" class="fondo-hoja" @click.self="cerrarHoja">
      <section class="hoja" role="dialog" aria-modal="true">
        <button type="button" class="cerrar" aria-label="Cerrar" @click="cerrarHoja"><X :size="20" /></button>

        <template v-if="hoja === 'diseno'">
          <h2>Diseño</h2>
          <div class="chips"><button v-for="(valor, id) in formatosPropios" :key="id" type="button" :class="{ activa: formato === id }" @click="ponerFormato(id)">{{ valor.nombre }}</button></div>
          <div class="plantillas"><button v-for="(valor, id) in plantillasPropias" :key="id" type="button" :class="{ activa: diapositiva.plantilla === id }" :aria-label="valor.nombre" @click="ponerPlantilla(id)">
            <span class="mini" aria-hidden="true"><i v-for="(celda, k) in valor.celdas" :key="k" :style="{ left: `${celda[0] * 100}%`, top: `${celda[1] * 100}%`, width: `${celda[2] * 100}%`, height: `${celda[3] * 100}%` }" /></span><small>{{ valor.nombre }}</small></button></div>
          <small class="ayuda">La primera imagen se queda donde está; toca el + de cada recuadro para agregar las demás.</small>
        </template>

        <template v-else-if="hoja === 'imagen' && celdaSeleccionada >= 0">
          <h2>Imagen</h2>
          <label>Zoom<input v-model.number="diapositiva.medios[celdaSeleccionada]!.encuadre.zoom" type="range" min="1" max="3" step="0.01" @change="confirmarCambio"></label>
          <div class="chips"><button type="button" @click="pedirArchivo(celdaSeleccionada); cerrarHoja()">Cambiar imagen</button><button type="button" @click="centrarCelda">Centrar</button><button type="button" @click="quitarImagen">Quitar</button></div>
        </template>

        <template v-else-if="hoja === 'elemento' && elementoSeleccionado">
          <template v-if="elementoSeleccionado.tipo === 'texto'">
            <h2>Texto</h2>
            <textarea v-model="elementoSeleccionado.texto" rows="3" maxlength="220" aria-label="Texto" @input="alEditarTexto" />
            <small class="ayuda">Pon **dos asteriscos** alrededor de las palabras que quieras en amarillo, como en las noticias.</small>
            <label>Tamaño<input v-model.number="elementoSeleccionado.tamano" type="range" min="24" max="140" @change="confirmarCambio"></label>
            <div class="chips"><button v-for="(_, nombre) in coloresTextoPropio" :key="nombre" type="button" :class="{ activa: elementoSeleccionado.color === nombre }" @click="elementoSeleccionado.color = nombre; confirmarCambio()">{{ nombre }}</button></div>
            <div class="chips"><button type="button" @click="cambiarFondo">Fondo: {{ elementoSeleccionado.degradado ? 'degradado' : elementoSeleccionado.banda ? 'banda' : 'ninguno' }}</button><button type="button" @click="quitarElemento">Quitar texto</button></div>
          </template>
          <template v-else>
            <h2>Logo</h2>
            <label>Tamaño<input v-model.number="elementoSeleccionado.ancho" type="range" min="8" max="80" @change="confirmarCambio"></label>
            <div class="chips"><button type="button" @click="quitarElemento">Quitar logo</button></div>
          </template>
        </template>

        <template v-else-if="hoja === 'publicar'">
          <h2>Publicar</h2>
          <textarea v-model="documento.textos.facebook" rows="4" maxlength="5000" placeholder="Descripción de la publicación" aria-label="Descripción" :disabled="!editable" @input="alEditarDescripcion" />
          <label class="casilla"><input v-model="igDistinto" type="checkbox" :disabled="!editable">Descripción distinta en Instagram</label>
          <textarea v-if="igDistinto" v-model="documento.textos.instagram" rows="3" maxlength="2200" aria-label="Descripción de Instagram" :disabled="!editable" />
          <div class="chips"><button type="button" :class="{ activa: destinos.includes('facebook') }" :disabled="!editable" @click="alternarDestino('facebook')">Facebook</button><button type="button" :class="{ activa: destinos.includes('instagram') }" :disabled="!editable" @click="alternarDestino('instagram')">Instagram</button></div>
          <ul v-if="avisos.length && editable" class="avisos"><li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li></ul>
          <p v-for="(recibo, red) in recibos" :key="red" class="recibo">{{ red === 'facebook' ? 'Facebook' : 'Instagram' }}: {{ recibo.estado === 'published' ? 'publicada' : recibo.estado }} <a v-if="recibo.url" :href="recibo.url" target="_blank" rel="noopener noreferrer">ver</a></p>
          <p v-if="estado === 'scheduled'" class="recibo">Programada: {{ programadaPara ? new Date(programadaPara).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '' }}</p>
          <div v-if="editable" class="acciones">
            <button v-if="estado !== 'scheduled'" type="button" class="primario" :disabled="ocupado || avisos.length > 0" @click="publicarAhora"><Send :size="18" />Publicar ahora</button>
            <button v-if="estado === 'scheduled'" type="button" class="primario" :disabled="ocupado" @click="cancelarProgramacion">Cancelar programación</button>
            <button v-else type="button" :disabled="ocupado" @click="mostrarProgramar = !mostrarProgramar"><CalendarClock :size="18" />Programar</button>
          </div>
          <div v-if="mostrarProgramar && estado !== 'scheduled'" class="fila"><input v-model="fechaProgramada" type="datetime-local" aria-label="Fecha y hora (Colombia)"><button type="button" class="primario" :disabled="ocupado || avisos.length > 0" @click="programar">OK</button></div>
        </template>

        <template v-else-if="hoja === 'recientes'">
          <h2>Recientes</h2>
          <NuxtLink to="/admin/redes/propias/nuevo" external class="nuevo"><Plus :size="18" />Nueva pieza</NuxtLink>
          <ul class="recientes"><li v-for="item in recientes" :key="item.id"><button type="button" @click="abrirPublicacion(item.id)"><strong>{{ item.titulo }}</strong><span><Clock3 :size="12" /> {{ etiquetas[item.estado] }}</span></button></li></ul>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
.editor{display:flex;flex-direction:column;height:100dvh;box-sizing:border-box;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);background:#0b1220;color:#fff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;overflow:hidden;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.editor.bloqueado{cursor:progress}
.barra-superior{display:flex;align-items:center;gap:4px;padding:6px 8px;min-height:48px}.barra-superior a,.barra-superior button{display:grid;place-items:center;min-width:44px;min-height:44px;border:0;background:none;color:#fff;border-radius:10px}.barra-superior button:disabled{opacity:.35}
.barra-superior .titulo{flex:1;display:block;text-align:left;font-weight:700;font-size:15px}.titulo small{font-weight:400;opacity:.7}.barra-superior .listo{padding:0 18px;background:#ffd800;color:#08204a;font-weight:800}
.aviso{margin:0 10px 6px;padding:8px 10px;border-radius:8px;background:#3a3410;font-size:13px}.aviso.error{background:#5a1a1a}
.area{flex:1;min-height:0;container-type:size;display:grid;place-items:center;padding:6px}
.lienzo{position:relative;width:min(100cqw, 100cqh * var(--razon));aspect-ratio:var(--razon);touch-action:none;background:#102d5c;border-radius:6px;overflow:hidden;box-shadow:0 10px 40px #0008}
.svg{line-height:0}.svg :deep(svg){display:block;width:100%;height:auto;pointer-events:none}.cargando{display:grid;place-items:center;aspect-ratio:var(--razon);line-height:1.2}
.celda-vacia{position:absolute;display:grid;place-items:center;padding:0;border:2px dashed #ffffff90;background:#0b122055;color:#fff;cursor:pointer}.celda-vacia span{display:grid;justify-items:center;gap:4px;padding:8px;text-align:center}.celda-vacia small{font-size:12px;opacity:.9}.celda-vacia:disabled{opacity:.4}
.seleccion{position:absolute;inset:0;pointer-events:none}.seleccion i{position:absolute;box-sizing:border-box;border:2px solid #ffd800;border-radius:4px}.seleccion u{position:absolute;box-sizing:border-box;border:2px solid #ffd800;text-decoration:none}
.guia-v{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#ffd800}.guia-h{position:absolute;top:50%;left:0;right:0;height:1px;background:#ffd800}
.video-lienzo{max-width:100%;max-height:100%;border-radius:6px;background:#000}.vacio-grande{display:grid;place-items:center;gap:8px;width:100%;height:100%;border:2px dashed #ffffff60;border-radius:12px;background:none;color:#fff;font-size:16px}
.oculto{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.paginas{display:flex;gap:6px;justify-content:center;padding:4px 8px}.paginas button{min-width:36px;min-height:36px;border:1px solid #ffffff40;border-radius:999px;background:none;color:#fff;font-weight:700}.paginas .activa{background:#fff;color:#08204a}
.contextual{display:flex;gap:6px;overflow-x:auto;padding:6px 8px;border-top:1px solid #ffffff18}.contextual button{display:flex;align-items:center;gap:6px;flex:none;min-height:42px;padding:0 14px;border:0;border-radius:999px;background:#1c2a44;color:#fff;font-size:14px}
.dock{display:grid;grid-template-columns:repeat(4,1fr);padding:4px 6px 8px;border-top:1px solid #ffffff18;background:#0b1220}.dock button{display:grid;justify-items:center;gap:4px;min-height:56px;border:0;background:none;color:#fff;font-size:12px}.dock button:disabled{opacity:.35}
.fondo-hoja{position:fixed;inset:0;display:flex;align-items:flex-end;background:#0007;z-index:20}
.hoja{position:relative;width:100%;max-height:78dvh;overflow-y:auto;box-sizing:border-box;padding:18px 16px max(18px,env(safe-area-inset-bottom));border-radius:18px 18px 0 0;background:#fff;color:#08204a;user-select:text;-webkit-user-select:text}
.hoja h2{margin:0 0 12px;font-size:18px}.cerrar{position:absolute;right:8px;top:8px;display:grid;place-items:center;width:44px;height:44px;border:0;background:none;color:#08204a}
.hoja label{display:grid;gap:6px;margin:10px 0}.hoja .casilla{display:flex;align-items:center;gap:8px}.ayuda{display:block;margin:6px 0;color:#4a5a73;font-size:12px}
textarea,input[type=datetime-local]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #c5d0e0;border-radius:10px;font:inherit;font-size:16px;color:#08204a;background:#fff}textarea{resize:none}input[type=range]{width:100%}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.chips button,.acciones button,.fila button{min-height:44px;padding:0 16px;border:1px solid #08204a;border-radius:999px;background:#fff;color:#08204a;font:inherit;font-weight:700}.chips .activa{background:#08204a;color:#fff}
.acciones{display:grid;gap:8px;margin-top:10px}.acciones button{display:flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;min-height:50px}.primario{background:#08204a!important;color:#fff!important}.fila{display:flex;gap:8px;margin-top:8px}
.plantillas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.plantillas button{display:grid;justify-items:center;gap:6px;padding:8px;border:1px solid #c5d0e0;border-radius:10px;background:#fff;color:#08204a}.plantillas .activa{border-color:#08204a;box-shadow:0 0 0 2px #ffd800}
.mini{position:relative;width:54px;height:54px;background:#08204a;display:block}.mini i{position:absolute;box-sizing:border-box;border:1px solid #fff;background:#174ea6}.plantillas small{font-size:10px;text-align:center}
.avisos{margin:8px 0;padding:8px 8px 8px 24px;background:#fff6c2;border-radius:8px;font-size:13px}.recibo{margin:6px 0;font-size:13px}
.recientes{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px}.recientes button{display:flex;justify-content:space-between;gap:8px;width:100%;padding:12px;border:1px solid #dde5f1;border-radius:10px;background:#fff;color:#08204a;text-align:left;font:inherit}.recientes span{display:flex;align-items:center;gap:4px;font-size:12px;color:#4a5a73}
.nuevo{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border-radius:999px;background:#08204a;color:#fff;text-decoration:none;font-weight:700}
</style>
