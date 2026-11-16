<script setup lang="ts">
import { parse } from 'opentype.js'
import type { Font } from 'opentype.js'
import { ArrowLeft, Save, ImagePlus, Plus, Trash2, ChevronLeft, ChevronRight, Type, Send, CalendarClock, Upload } from '@lucide/vue'
import SelectorPortadaEditorial from '~/components/admin/SelectorPortadaEditorial.vue'
import ModalSubirMedio from '~/components/admin/ModalSubirMedio.vue'
import type { MedioEditorial } from '~/types/mediaEditorial'
import type { TemporalSocialVista } from '~/utils/editorial/mediosTemporales'
import { cajaElementoPropio, componerSvgPropio, limitarPosicionPropia } from '~/utils/editorial/composicionPropia'
import type { DocumentoPropio, ElementoPropio, FormatoPropio, PlantillaPropia } from '~/utils/editorial/publicacionesPropias'
import { avisosPublicacionPropia, cambiarPlantillaPropia, coloresTextoPropio, crearDiapositivaPropia, crearElementoLogo,
  crearElementoTexto, esDocumentoVideoPropio, esquemaDocumentoPropio, formatosPropios, maximoDiapositivasPropias, plantillasPropias } from '~/utils/editorial/publicacionesPropias'

definePageMeta({ layout: 'admin', middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ title: 'Publicación propia | Pont3la10', robots: 'noindex, nofollow' })
const route = useRoute()
const { tienePermiso } = useContextoEditorial()
const { data, error } = await useFetch(`/api/admin/redes/propias/${route.params.id}`)

// Las publicaciones de vídeo se editan en la vista rápida (también móvil).
if (data.value && esDocumentoVideoPropio(data.value.publicacion.documento)) await navigateTo(`/admin/redes/movil?id=${route.params.id}`, { replace: true })
const documento = ref<DocumentoPropio | null>(data.value && !esDocumentoVideoPropio(data.value.publicacion.documento) ? structuredClone(toRaw(data.value.publicacion.documento)) as DocumentoPropio : null)
const titulo = ref(data.value?.publicacion.titulo || '')
const destinos = ref<Array<'facebook' | 'instagram'>>(data.value ? [...data.value.publicacion.destinos] : ['facebook', 'instagram'])
const revision = ref(data.value?.publicacion.revision || 1)
const estado = ref(data.value?.publicacion.estado || 'draft')
const programadaPara = ref(data.value?.publicacion.programadaPara || null)
const recibos = ref<Record<string, { estado: string, url?: string }>>(data.value?.recibos || {})
const medios = ref<MedioEditorial[]>(data.value?.medios || [])
const temporales = ref<TemporalSocialVista[]>(data.value?.temporales || [])
const { subir, progreso, subiendo } = useSubidaTemporalSocial()
const errorSubida = ref('')
const firmaGuardada = ref(JSON.stringify({ titulo: titulo.value, documento: documento.value, destinos: destinos.value }))
const indice = ref(0), celdaActiva = ref(0), elementoActivo = ref<string | null>(null)
const selectorAbierto = ref(false), subidaAbierta = ref(false)
const guardando = ref(false), enviando = ref(false), mensaje = ref(''), problema = ref('')
const fechaProgramada = ref('')
const fuente = shallowRef<Font | null>(null)
const logoPublico = '/brand/pont3la10_logo_login_blanco.png'

const sucio = computed(() => JSON.stringify({ titulo: titulo.value, documento: documento.value, destinos: destinos.value }) !== firmaGuardada.value)
const puedeEditar = computed(() => tienePermiso('contenido.editarTodos') && ['draft', 'failed', 'scheduled'].includes(estado.value))
const diapositiva = computed(() => documento.value?.diapositivas[indice.value] || null)
const formato = computed<FormatoPropio>(() => documento.value?.formato || 'cuadrado')
const dimensiones = computed(() => formatosPropios[formato.value])
const celdas = computed(() => diapositiva.value ? plantillasPropias[diapositiva.value.plantilla].celdas : [])
const medioDeCelda = (posicion: number): { id: string, urlPublica: string, ancho: number, alto: number } | null => {
  const id = diapositiva.value?.medios[posicion]?.medioId
  const temporal = temporales.value.find(actual => actual.id === id && actual.tipo === 'imagen' && actual.ancho && actual.alto)
  if (temporal) return { id: temporal.id, urlPublica: temporal.url, ancho: temporal.ancho!, alto: temporal.alto! }
  return medios.value.find(actual => actual.id === id) || null
}
const avisos = computed(() => documento.value ? avisosPublicacionPropia(documento.value, destinos.value) : [])
const elementoSeleccionado = computed(() => diapositiva.value?.elementos.find(actual => actual.id === elementoActivo.value) || null)
const encuadre = computed(() => diapositiva.value?.medios[celdaActiva.value]?.encuadre || null)

const svg = computed(() => {
  if (!fuente.value || !diapositiva.value) return ''
  try {
    const imagenes = diapositiva.value.medios.map((_, posicion) => {
      const medio = medioDeCelda(posicion)
      return medio ? { url: medio.urlPublica, ancho: medio.ancho, alto: medio.alto } : null
    })
    if (imagenes.some(imagen => !imagen)) return ''
    return componerSvgPropio({ diapositiva: diapositiva.value, formato: formato.value, fuente: fuente.value, logo: logoPublico, imagenes })
  } catch (falla) { return falla instanceof Error ? falla.message : 'No se pudo mostrar la pieza.' }
})
const cajas = computed(() => (diapositiva.value?.elementos || []).map(elemento => ({ elemento, caja: cajaElementoPropio(elemento, formato.value, fuente.value) })))

onMounted(async () => {
  try {
    const respuesta = await fetch('/fonts/Montserrat-Bold.ttf')
    if (!respuesta.ok) throw new Error()
    fuente.value = parse(await respuesta.arrayBuffer())
  } catch { problema.value = 'No se pudo cargar la tipografía de la plantilla.' }
  window.addEventListener('beforeunload', avisarSalida)
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', avisarSalida))
onBeforeRouteLeave(() => !sucio.value || window.confirm('Tienes cambios sin guardar. ¿Salir sin guardarlos?'))
function avisarSalida(evento: BeforeUnloadEvent) { if (sucio.value) evento.preventDefault() }

function elegirImagen(posicion: number) { celdaActiva.value = posicion; selectorAbierto.value = true }
function usarMedio(medio: MedioEditorial) {
  if (!diapositiva.value) return
  if (!medios.value.some(actual => actual.id === medio.id)) medios.value.push(medio)
  diapositiva.value.medios[celdaActiva.value]!.medioId = medio.id
  selectorAbierto.value = false; subidaAbierta.value = false
}
async function subirDesdeDispositivo(evento: Event) {
  const entrada = evento.target as HTMLInputElement
  const archivo = entrada.files?.[0]
  entrada.value = ''
  if (!archivo || !diapositiva.value) return
  errorSubida.value = ''
  try {
    const temporal = await subir(archivo, String(route.params.id))
    temporales.value.push(temporal)
    diapositiva.value.medios[celdaActiva.value]!.medioId = temporal.id
  } catch (falla) { errorSubida.value = (falla as { statusMessage?: string, message?: string }).statusMessage || (falla as Error).message || 'No se pudo subir la imagen.' }
}
function ponerPlantilla(plantilla: PlantillaPropia) {
  if (!documento.value || !diapositiva.value) return
  documento.value.diapositivas[indice.value] = cambiarPlantillaPropia(diapositiva.value, plantilla)
  celdaActiva.value = 0
}
function agregarDiapositiva() {
  if (!documento.value || documento.value.diapositivas.length >= maximoDiapositivasPropias) return
  documento.value.diapositivas.push(crearDiapositivaPropia('una'))
  indice.value = documento.value.diapositivas.length - 1
}
function quitarDiapositiva() {
  if (!documento.value || documento.value.diapositivas.length < 2) return
  documento.value.diapositivas.splice(indice.value, 1)
  indice.value = Math.max(0, indice.value - 1)
}
function moverDiapositiva(delta: number) {
  const lista = documento.value?.diapositivas
  const destino = indice.value + delta
  if (!lista || destino < 0 || destino >= lista.length) return
  const [actual] = lista.splice(indice.value, 1)
  lista.splice(destino, 0, actual!)
  indice.value = destino
}
function agregarElemento(tipo: 'logo' | 'texto') {
  if (!diapositiva.value || diapositiva.value.elementos.length >= 8) return
  const elemento = tipo === 'logo' ? crearElementoLogo() : crearElementoTexto()
  diapositiva.value.elementos.push(elemento)
  elementoActivo.value = elemento.id
}
function quitarElemento(id: string) {
  if (!diapositiva.value) return
  diapositiva.value.elementos = diapositiva.value.elementos.filter(actual => actual.id !== id)
  if (elementoActivo.value === id) elementoActivo.value = null
}

let arrastre: { id: string, x: number, y: number, inicioX: number, inicioY: number } | null = null
function iniciarArrastre(evento: PointerEvent, elemento: ElementoPropio) {
  if (!puedeEditar.value) return
  ;(evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId)
  elementoActivo.value = elemento.id
  arrastre = { id: elemento.id, x: evento.clientX, y: evento.clientY, inicioX: elemento.x, inicioY: elemento.y }
}
function moverArrastre(evento: PointerEvent) {
  if (!arrastre || !diapositiva.value) return
  const lienzo = (evento.currentTarget as HTMLElement).closest('.lienzo-propio') as HTMLElement | null
  const rectangulo = lienzo?.getBoundingClientRect()
  const elemento = diapositiva.value.elementos.find(actual => actual.id === arrastre!.id)
  if (!rectangulo || !elemento) return
  ponerPosicion(elemento, arrastre.inicioX + (evento.clientX - arrastre.x) / rectangulo.width * 100,
    arrastre.inicioY + (evento.clientY - arrastre.y) / rectangulo.height * 100)
}
function ponerPosicion(elemento: ElementoPropio, x: number, y: number) {
  const posicion = limitarPosicionPropia(elemento, formato.value, fuente.value, x, y)
  elemento.x = posicion.x; elemento.y = posicion.y
}
/** Mover con teclado: flechas 1 %, con Mayús 5 %. */
function moverConTeclado(evento: KeyboardEvent, elemento: ElementoPropio) {
  if (!puedeEditar.value) return
  const paso = evento.shiftKey ? 5 : 1
  const delta: Record<string, [number, number]> = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }
  const mover = delta[evento.key]
  if (!mover) return
  evento.preventDefault()
  elementoActivo.value = elemento.id
  ponerPosicion(elemento, elemento.x + mover[0], elemento.y + mover[1])
}
function pasarDeDestino(destino: 'facebook' | 'instagram') {
  destinos.value = destinos.value.includes(destino) ? destinos.value.filter(actual => actual !== destino) : [...destinos.value, destino]
}
function copiarDescripcion() { if (documento.value) documento.value.textos.instagram = documento.value.textos.facebook.slice(0, 2200) }

async function guardar(): Promise<boolean> {
  if (!documento.value || !destinos.value.length) { problema.value = 'Elige al menos un destino.'; return false }
  const validado = esquemaDocumentoPropio.safeParse(documento.value)
  if (!validado.success) { problema.value = 'La publicación tiene datos inválidos. Revisa textos y plantillas.'; return false }
  guardando.value = true; problema.value = ''; mensaje.value = ''
  const estabaProgramada = estado.value === 'scheduled'
  try {
    const respuesta = await $fetch(`/api/admin/redes/propias/${route.params.id}`, { method: 'PUT',
      body: { titulo: titulo.value, documento: documento.value, destinos: destinos.value, revision: revision.value } })
    revision.value = respuesta.publicacion.revision; estado.value = respuesta.publicacion.estado; programadaPara.value = respuesta.publicacion.programadaPara
    medios.value = respuesta.medios; temporales.value = respuesta.temporales
    firmaGuardada.value = JSON.stringify({ titulo: titulo.value, documento: documento.value, destinos: destinos.value })
    mensaje.value = estabaProgramada ? 'Guardado. Al editar, la programación se canceló: revisa y vuelve a programar.' : 'Guardado.'
    return true
  } catch (falla) {
    problema.value = (falla as { statusMessage?: string }).statusMessage || 'No se pudo guardar. Tus cambios siguen en pantalla.'
    return false
  } finally { guardando.value = false }
}
async function recargarEstado() {
  const actual = await $fetch<NonNullable<typeof data.value>>(`/api/admin/redes/propias/${route.params.id}`)
  estado.value = actual.publicacion.estado; programadaPara.value = actual.publicacion.programadaPara
  recibos.value = actual.recibos
}
async function publicar(destino: 'facebook' | 'instagram') {
  if (sucio.value && !(await guardar())) return
  if (!window.confirm(`¿Publicar ahora en ${destino === 'facebook' ? 'Facebook' : 'Instagram'}? Esta acción no se puede deshacer.`)) return
  enviando.value = true; problema.value = ''; mensaje.value = ''
  try {
    const resultado = await $fetch<{ estado: string, url?: string, aviso?: string }>(`/api/admin/redes/propias/${route.params.id}/publicar`,
      { method: 'POST', body: { destino, revision: revision.value, confirmar: true } })
    recibos.value = { ...recibos.value, [destino]: { estado: resultado.estado, url: resultado.url } }
    mensaje.value = resultado.estado === 'published' ? 'Publicada.' : resultado.aviso || `Resultado: ${resultado.estado}.`
    await recargarEstado()
  } catch (falla) { problema.value = (falla as { statusMessage?: string }).statusMessage || 'No se pudo publicar.' } finally { enviando.value = false }
}
async function programar() {
  if (!fechaProgramada.value) { problema.value = 'Elige fecha y hora.'; return }
  if (sucio.value && !(await guardar())) return
  enviando.value = true; problema.value = ''; mensaje.value = ''
  try {
    const respuesta = await $fetch<{ estado: string, programadaPara: string | null }>(`/api/admin/redes/propias/${route.params.id}/programar`,
      { method: 'POST', body: { fecha: new Date(`${fechaProgramada.value}:00-05:00`).toISOString(), revision: revision.value, confirmar: true } })
    estado.value = respuesta.estado as typeof estado.value; programadaPara.value = respuesta.programadaPara
    mensaje.value = 'Programada. Se publicará sola a esa hora en las redes elegidas.'
  } catch (falla) { problema.value = (falla as { statusMessage?: string }).statusMessage || 'No se pudo programar.' } finally { enviando.value = false }
}
async function cancelarProgramacion() {
  enviando.value = true; problema.value = ''
  try {
    await $fetch(`/api/admin/redes/propias/${route.params.id}/cancelar`, { method: 'POST', body: {} })
    estado.value = 'draft'; programadaPara.value = null; mensaje.value = 'Programación cancelada.'
  } catch (falla) { problema.value = (falla as { statusMessage?: string }).statusMessage || 'No se pudo cancelar.' } finally { enviando.value = false }
}
</script>

<template>
  <section class="editor-propio">
    <p v-if="error || !documento" role="alert">No se pudo cargar la publicación. <NuxtLink to="/admin/redes">Volver</NuxtLink></p>
    <template v-else>
      <header class="cabecera-propio">
        <NuxtLink to="/admin/redes" aria-label="Volver a publicaciones para redes"><ArrowLeft :size="20" /></NuxtLink>
        <label class="campo-titulo"><span>Nombre interno</span><input v-model="titulo" type="text" maxlength="120" :disabled="!puedeEditar"></label>
        <span class="estado-propio" :class="`estado-${estado}`">{{ { draft: 'Borrador', scheduled: 'Programada', publishing: 'Publicando…', published: 'Publicada', failed: 'Con error' }[estado] }}</span>
        <button v-if="puedeEditar" type="button" class="guardar" :disabled="guardando || !sucio" @click="guardar"><Save :size="18" />{{ guardando ? 'Guardando…' : 'Guardar' }}</button>
      </header>
      <p v-if="problema" class="aviso-propio error" role="alert">{{ problema }}</p>
      <p v-else-if="mensaje" class="aviso-propio" role="status">{{ mensaje }}</p>

      <div class="rejilla-propia">
        <div class="columna-vista">
          <div class="tiras" role="tablist" aria-label="Diapositivas">
            <button v-for="(item, posicion) in documento.diapositivas" :key="item.id" type="button" role="tab" :aria-selected="posicion === indice" :class="{ activa: posicion === indice }" @click="indice = posicion; elementoActivo = null">{{ posicion + 1 }}</button>
            <button v-if="puedeEditar && documento.diapositivas.length < maximoDiapositivasPropias" type="button" class="mas" aria-label="Agregar diapositiva" @click="agregarDiapositiva"><Plus :size="17" /></button>
          </div>
          <div class="lienzo-propio" :style="{ aspectRatio: `${dimensiones.ancho} / ${dimensiones.alto}` }">
            <!-- SVG propio: texto convertido a trazados y atributos escapados por el compositor. -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="svg.startsWith('<svg')" class="svg-propio" v-html="svg" />
            <p v-else class="vacio-propio" role="status">{{ svg || 'Elige las imágenes de esta diapositiva para ver la vista previa.' }}</p>
            <div v-if="svg.startsWith('<svg')" class="capa-arrastre">
              <div
v-for="{ elemento, caja } in cajas" :key="elemento.id" class="elemento-arrastrable" :class="{ activo: elemento.id === elementoActivo }"
                :style="{ left: `${caja.x / dimensiones.ancho * 100}%`, top: `${caja.y / dimensiones.alto * 100}%`, width: `${caja.ancho / dimensiones.ancho * 100}%`, height: `${caja.alto / dimensiones.alto * 100}%` }"
                role="button" tabindex="0" :aria-label="elemento.tipo === 'logo' ? 'Mover el logo con las flechas del teclado' : `Mover el texto con las flechas del teclado: ${elemento.texto}`" :aria-pressed="elemento.id === elementoActivo"
                @pointerdown="iniciarArrastre($event, elemento)" @keydown="moverConTeclado($event, elemento)" @pointermove="moverArrastre" @pointerup="arrastre = null" @pointercancel="arrastre = null" @click="elementoActivo = elemento.id" />
            </div>
          </div>
          <div v-if="puedeEditar" class="acciones-diapositiva">
            <button type="button" :disabled="indice === 0" @click="moverDiapositiva(-1)"><ChevronLeft :size="16" />Antes</button>
            <button type="button" :disabled="indice === documento.diapositivas.length - 1" @click="moverDiapositiva(1)">Después<ChevronRight :size="16" /></button>
            <button type="button" :disabled="documento.diapositivas.length < 2" @click="quitarDiapositiva"><Trash2 :size="16" />Quitar diapositiva</button>
          </div>
          <p class="nota-propia">Arrastra el logo o el texto sobre la vista previa para ubicarlos. {{ documento.diapositivas.length > 1 ? `Carrusel de ${documento.diapositivas.length} diapositivas.` : 'Agrega diapositivas para hacer un carrusel.' }} Para videos usa la vista rápida (Nuevo → Video).</p>
        </div>

        <aside class="columna-controles" aria-label="Controles de la publicación">
          <fieldset :disabled="!puedeEditar">
            <legend>Formato</legend>
            <div class="opciones"><label v-for="(valor, id) in formatosPropios" :key="id"><input v-model="documento.formato" type="radio" :value="id">{{ valor.nombre }}</label></div>
          </fieldset>
          <fieldset v-if="diapositiva" :disabled="!puedeEditar">
            <legend>Diseño de la diapositiva</legend>
            <div class="plantillas">
              <button v-for="(valor, id) in plantillasPropias" :key="id" type="button" :class="{ activa: diapositiva.plantilla === id }" :aria-label="valor.nombre" :aria-pressed="diapositiva.plantilla === id" @click="ponerPlantilla(id)">
                <span class="mini" aria-hidden="true"><i v-for="(celda, k) in valor.celdas" :key="k" :style="{ left: `${celda[0] * 100}%`, top: `${celda[1] * 100}%`, width: `${celda[2] * 100}%`, height: `${celda[3] * 100}%` }" /></span>
                <small>{{ valor.nombre }}</small>
              </button>
            </div>
            <div class="imagenes">
              <button v-for="(_, posicion) in celdas" :key="posicion" type="button" :class="{ activa: celdaActiva === posicion }" @click="elegirImagen(posicion)">
                <img v-if="medioDeCelda(posicion)" :src="medioDeCelda(posicion)!.urlPublica" :alt="`Imagen ${posicion + 1}`"><ImagePlus v-else :size="22" aria-hidden="true" />
                <small>{{ medioDeCelda(posicion) ? `Cambiar imagen ${posicion + 1}` : `Elegir imagen ${posicion + 1}` }}</small>
              </button>
            </div>
            <label class="subir-dispositivo"><Upload :size="16" aria-hidden="true" />{{ subiendo ? `Subiendo… ${progreso} %` : `Subir desde mi dispositivo (imagen ${celdaActiva + 1})` }}<input type="file" accept="image/jpeg,image/png,image/webp" :disabled="subiendo" @change="subirDesdeDispositivo"></label>
            <p v-if="errorSubida" class="aviso-propio error" role="alert">{{ errorSubida }}</p>
            <small class="nota-propia">Las subidas desde el dispositivo son temporales: se borran al publicar.</small>
            <div v-if="encuadre" class="encuadre">
              <label>Zoom de la imagen {{ celdaActiva + 1 }}<input v-model.number="encuadre.zoom" type="range" min="1" max="3" step="0.01"></label>
              <label>Mover horizontal<input v-model.number="encuadre.x" type="range" min="-100" max="100"></label>
              <label>Mover vertical<input v-model.number="encuadre.y" type="range" min="-100" max="100"></label>
            </div>
          </fieldset>
          <fieldset v-if="diapositiva" :disabled="!puedeEditar">
            <legend>Logo y texto</legend>
            <div class="acciones-fila"><button type="button" @click="agregarElemento('logo')"><Plus :size="15" />Logo de Pont3la10</button><button type="button" @click="agregarElemento('texto')"><Type :size="15" />Texto</button></div>
            <ul class="elementos">
              <li v-for="elemento in diapositiva.elementos" :key="elemento.id" :class="{ activo: elemento.id === elementoActivo }">
                <button type="button" class="seleccionar" @click="elementoActivo = elemento.id">{{ elemento.tipo === 'logo' ? 'Logo' : elemento.texto.slice(0, 28) }}</button>
                <button type="button" :aria-label="'Quitar elemento'" @click="quitarElemento(elemento.id)"><Trash2 :size="15" /></button>
              </li>
            </ul>
            <div v-if="elementoSeleccionado" class="encuadre">
              <label>Posición horizontal ({{ elementoSeleccionado.x }}%)<input :value="elementoSeleccionado.x" type="range" min="0" max="100" step="0.5" @input="ponerPosicion(elementoSeleccionado, Number(($event.target as HTMLInputElement).value), elementoSeleccionado.y)"></label>
              <label>Posición vertical ({{ elementoSeleccionado.y }}%)<input :value="elementoSeleccionado.y" type="range" min="0" max="100" step="0.5" @input="ponerPosicion(elementoSeleccionado, elementoSeleccionado.x, Number(($event.target as HTMLInputElement).value))"></label>
              <small>También puedes moverlo con las flechas del teclado (Mayús para saltos de 5 %).</small>
            </div>
            <div v-if="elementoSeleccionado?.tipo === 'texto'" class="encuadre">
              <label>Texto (usa ** ** para resaltar)<textarea v-model="elementoSeleccionado.texto" rows="3" maxlength="220" /></label>
              <label>Tamaño<input v-model.number="elementoSeleccionado.tamano" type="range" min="24" max="140"></label>
              <label>Color<select v-model="elementoSeleccionado.color"><option v-for="(_, nombre) in coloresTextoPropio" :key="nombre" :value="nombre">{{ nombre }}</option></select></label>
              <label class="casilla"><input v-model="elementoSeleccionado.banda" type="checkbox">Banda oscura detrás</label>
            </div>
            <div v-else-if="elementoSeleccionado?.tipo === 'logo'" class="encuadre"><label>Tamaño del logo<input v-model.number="elementoSeleccionado.ancho" type="range" min="8" max="80"></label></div>
          </fieldset>
          <fieldset :disabled="!puedeEditar">
            <legend>Dónde publicar</legend>
            <div class="opciones"><label><input type="checkbox" :checked="destinos.includes('facebook')" @change="pasarDeDestino('facebook')">Facebook</label><label><input type="checkbox" :checked="destinos.includes('instagram')" @change="pasarDeDestino('instagram')">Instagram</label></div>
            <label>Descripción de Facebook<textarea v-model="documento.textos.facebook" rows="4" maxlength="5000" /></label>
            <label>Descripción de Instagram ({{ documento.textos.instagram.length }}/2200)<textarea v-model="documento.textos.instagram" rows="4" maxlength="2200" /></label>
            <button type="button" class="enlace" @click="copiarDescripcion">Copiar la de Facebook a Instagram</button>
          </fieldset>
          <ul v-if="avisos.length" class="avisos" role="status"><li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li></ul>
          <section v-if="tienePermiso('contenido.editarTodos')" class="publicar" aria-label="Publicar">
            <p v-for="(recibo, red) in recibos" :key="red" class="recibo">{{ red === 'facebook' ? 'Facebook' : 'Instagram' }}: {{ recibo.estado === 'published' ? 'publicada' : recibo.estado }} <a v-if="recibo.url" :href="recibo.url" target="_blank" rel="noopener noreferrer">ver</a></p>
            <div v-if="estado !== 'published' && estado !== 'publishing'" class="acciones-fila">
              <button v-for="red in destinos" :key="red" type="button" :disabled="enviando || guardando || avisos.length > 0 || recibos[red]?.estado === 'published'" @click="publicar(red)"><Send :size="15" />Publicar en {{ red === 'facebook' ? 'Facebook' : 'Instagram' }}</button>
            </div>
            <div v-if="estado === 'scheduled'" class="programada"><p>Programada para {{ programadaPara ? new Date(programadaPara).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '' }} (hora Colombia).</p><button type="button" :disabled="enviando" @click="cancelarProgramacion">Cancelar programación</button></div>
            <div v-else-if="estado !== 'published' && estado !== 'publishing'" class="programar"><label>Programar para (hora de Colombia)<input v-model="fechaProgramada" type="datetime-local"></label><button type="button" :disabled="enviando || guardando || avisos.length > 0" @click="programar"><CalendarClock :size="15" />Programar</button></div>
          </section>
        </aside>
      </div>
      <SelectorPortadaEditorial v-if="selectorAbierto" :seleccionado-id="medioDeCelda(celdaActiva)?.id" :puede-subir="true" @cerrar="selectorAbierto = false" @seleccionar="usarMedio" @solicitar-subida="subidaAbierta = true" />
      <ModalSubirMedio v-if="subidaAbierta" @cerrar="subidaAbierta = false" @subido="usarMedio" />
    </template>
  </section>
</template>

<style scoped>
.editor-propio{max-width:1400px;margin:auto;color:var(--navy)}
.cabecera-propio{display:flex;align-items:end;gap:14px;flex-wrap:wrap;margin-bottom:14px}.cabecera-propio>a{display:grid;place-items:center;width:44px;height:44px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy)}
.campo-titulo{flex:1;min-width:200px}.campo-titulo span,fieldset label{display:block;font-size:12px;margin-bottom:6px}
input[type=text],input[type=datetime-local],textarea,select{width:100%;border:1px solid var(--line);border-radius:6px;padding:10px;background:white;color:var(--navy);font:inherit}
.estado-propio{padding:6px 10px;border-radius:4px;background:var(--soft-blue);font-size:12px}.estado-published{background:#e7f3dc}.estado-failed{background:#fde2e2}.estado-scheduled{background:var(--soft-yellow)}
.guardar,.acciones-fila button,.publicar button,.acciones-diapositiva button{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:10px 14px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy);font:inherit;font-weight:700;cursor:pointer}
.guardar{background:var(--navy);color:white}button:disabled{opacity:.5;cursor:default}
.aviso-propio{padding:12px;background:var(--soft-yellow);border-radius:6px;margin:0 0 14px}.aviso-propio.error{background:#fde2e2}
.rejilla-propia{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(320px,.9fr);gap:24px;align-items:start}
.tiras{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.tiras button{min-width:44px;min-height:44px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy);font-weight:700;cursor:pointer}.tiras .activa{background:var(--navy);color:white}
.lienzo-propio{position:relative;width:100%;background:#08204a;overflow:hidden;border-radius:6px;box-shadow:0 12px 35px #08204a20;touch-action:none}
.svg-propio{line-height:0}.svg-propio :deep(svg){display:block;width:100%;height:auto;pointer-events:none}.vacio-propio{display:grid;place-items:center;height:100%;margin:0;padding:24px;text-align:center;color:white}
.capa-arrastre{position:absolute;inset:0}.elemento-arrastrable{position:absolute;cursor:grab;outline:2px dashed transparent}.elemento-arrastrable:hover,.elemento-arrastrable.activo,.elemento-arrastrable:focus-visible{outline-color:#ffd800}.elemento-arrastrable:active{cursor:grabbing}
.subir-dispositivo{display:flex!important;align-items:center;gap:8px;min-height:44px;padding:8px 12px;border:1px dashed var(--navy);border-radius:6px;cursor:pointer;font-weight:700}.subir-dispositivo input{position:absolute;opacity:0;width:1px;height:1px}
.acciones-diapositiva{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.nota-propia{font-size:12px;color:var(--muted)}
.columna-controles{display:grid;gap:14px}fieldset{border:1px solid var(--line);border-radius:8px;padding:14px;margin:0;display:grid;gap:12px;background:white}legend{font-weight:700;padding:0 6px}
.opciones{display:flex;gap:14px;flex-wrap:wrap}.opciones label{display:flex;align-items:center;gap:6px;margin:0}
.plantillas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.plantillas button,.imagenes button{display:grid;gap:6px;justify-items:center;padding:8px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy);cursor:pointer}.plantillas .activa,.imagenes .activa{border-color:var(--navy);box-shadow:0 0 0 2px #ffd800}
.mini{position:relative;width:54px;height:54px;background:#08204a;display:block}.mini i{position:absolute;box-sizing:border-box;border:1px solid white;background:#174ea6}.plantillas small{font-size:10px;text-align:center}
.imagenes{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.imagenes img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px}.imagenes small{font-size:10px;text-align:center}
.encuadre{display:grid;gap:8px}.encuadre input[type=range]{width:100%}.casilla{display:flex!important;align-items:center;gap:6px}
.acciones-fila{display:flex;gap:8px;flex-wrap:wrap}.elementos{list-style:none;margin:0;padding:0;display:grid;gap:6px}.elementos li{display:flex;gap:6px}.elementos li.activo .seleccionar{border-color:var(--navy);font-weight:700}.elementos .seleccionar{flex:1;text-align:left;padding:8px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy);cursor:pointer}.elementos li>button:last-child{border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy);cursor:pointer}
.enlace{justify-self:start;border:0;background:none;color:var(--navy);text-decoration:underline;font:inherit;cursor:pointer}.avisos{margin:0;padding:12px 12px 12px 28px;background:var(--soft-yellow);border-radius:6px;font-size:13px}
.publicar{display:grid;gap:12px;padding:14px;border:1px solid var(--line);border-radius:8px;background:white}.recibo{margin:0;font-size:13px}.programar{display:grid;gap:8px}.programada p{margin:0 0 8px;font-size:13px}
@media(max-width:900px){.rejilla-propia{grid-template-columns:1fr}.plantillas{grid-template-columns:repeat(2,1fr)}}
</style>
