<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, Download, ExternalLink, Image as ImageIcon, LoaderCircle, Move, RotateCcw, Save, Send, X } from '@lucide/vue'
import LienzoPublicacionSocial from './LienzoPublicacionSocial.vue'
import type { BorradorSocial, EditorPublicacionSocial } from '~/types/publicacionesSociales'
import type { RedSocial } from '~/utils/editorial/publicacionesSociales'
import { formatosSociales } from '~/utils/editorial/publicacionesSociales'
import { cuentasSocialesObjetivo } from '~/data/cuentasSociales'
import type { EstadoConexionSocialX } from '~/types/conexionSocialX'
import type { ConexionMeta, DestinoMeta, ResultadoPublicacionMeta } from '~/types/publicacionMeta'

const props = defineProps<{ articuloId: string }>()
const emit = defineEmits<{ cerrar: [] }>()
const dialogo = ref<HTMLDialogElement | null>(null)
const editor = ref<EditorPublicacionSocial | null>(null)
const cargando = ref(true), exportando = ref(false)
const problema = ref(''), errorLienzo = ref('')
const indice = ref(0), red = ref<RedSocial>('facebook')
const { tienePermiso } = useContextoEditorial()
const puedeExportar = computed(() => tienePermiso('contenido.editarTodos'))
const documento = computed(() => editor.value?.borrador.documento)
const diapositiva = computed(() => documento.value?.diapositivas[indice.value])
const medio = computed(() => editor.value?.medios.find(actual => actual.id === diapositiva.value?.medioId) || null)
const encuadre = computed(() => documento.value && diapositiva.value?.encuadres[documento.value.formato])
const ajustesPendientes = ref(false), guardandoEncuadre = ref(false)
const ajustandoBloqueado = computed(() => guardandoEncuadre.value || publicandoX.value || publicandoMeta.value || exportando.value)
const controlesEncuadre = [
  { campo: 'zoom', nombre: 'Acercar imagen', minimo: 1, maximo: 3, paso: .01 },
  { campo: 'x', nombre: 'Posición horizontal', minimo: -100, maximo: 100, paso: 1 },
  { campo: 'y', nombre: 'Posición vertical', minimo: -100, maximo: 100, paso: 1 }
] as const
const solicitud = new AbortController()
const conexionX = ref<EstadoConexionSocialX | null>(null)
const conexionMeta = ref<ConexionMeta | null>(null)
const destinosMeta = ref<DestinoMeta[]>(['facebook', 'instagram'])
const confirmacionMeta = ref(false), publicandoMeta = ref(false)
const resultadosMeta = ref<Partial<Record<DestinoMeta, ResultadoPublicacionMeta>>>({})
const problemasMeta = ref<Partial<Record<DestinoMeta, string>>>({})
const destinosMetaDisponibles = computed(() => destinosMeta.value.filter(destino => conexionMeta.value?.[destino].preparada
  && !['published', 'in_progress', 'uncertain'].includes(resultadosMeta.value[destino]?.estado || '')))
const confirmacionX = ref(false)
const publicandoX = ref(false)
const resultadoX = ref<{ estado: 'published' | 'in_progress' | 'uncertain' | 'failed', url?: string,
  yaPublicado?: boolean, aviso?: string } | null>(null)
const redesVista = cuentasSocialesObjetivo.filter(cuenta => cuenta.id !== 'youtube')
const puedePublicarX = computed(() => red.value === 'x' && puedeExportar.value && conexionX.value?.preparada
  && Boolean(conexionX.value.cuenta) && !publicandoX.value && !publicandoMeta.value && !guardandoEncuadre.value && !ajustesPendientes.value && !errorLienzo.value)
let focoAnterior: HTMLElement | null = null
let desbordamientoAnterior = ''

function mensajeError(error: unknown, defecto: string) {
  const respuesta = error as { data?: { statusMessage?: string } }
  return respuesta.data?.statusMessage || defecto
}
function marcarEncuadre() {
  ajustesPendientes.value = true
  confirmacionX.value = false
  confirmacionMeta.value = false
  resultadoX.value = null
  resultadosMeta.value = {}
  problemasMeta.value = {}
}
function moverEncuadre(x: number, y: number) {
  if (!puedeExportar.value || ajustandoBloqueado.value || !encuadre.value || (encuadre.value.x === x && encuadre.value.y === y)) return
  Object.assign(encuadre.value, { x, y })
  marcarEncuadre()
}
async function guardarEncuadre() {
  if (!editor.value || !documento.value || !puedeExportar.value || ajustandoBloqueado.value || !ajustesPendientes.value) return
  guardandoEncuadre.value = true
  problema.value = ''
  try {
    const guardado = await $fetch<BorradorSocial>(`/api/admin/redes/${props.articuloId}`, {
      method: 'PUT', body: { documento: documento.value, revision: editor.value.borrador.revision, estado: 'draft' }
    })
    editor.value.borrador = guardado
    ajustesPendientes.value = false
  } catch (error) { problema.value = mensajeError(error, 'No se pudo guardar el encuadre. Los ajustes se conservan aquí; revisa tu sesión y MFA.') }
  finally { guardandoEncuadre.value = false }
}
async function cargar() {
  cargando.value = true
  problema.value = ''
  try {
    const resultado = await $fetch<EditorPublicacionSocial>(`/api/admin/redes/${props.articuloId}`, { signal: solicitud.signal })
    if (solicitud.signal.aborted) return
    editor.value = resultado
    ajustesPendientes.value = false
    red.value = resultado.borrador.documento.red === 'whatsapp' ? 'facebook' : resultado.borrador.documento.red
  } catch (error) {
    if (!solicitud.signal.aborted) problema.value = mensajeError(error, 'No se pudo cargar la vista rápida.')
  } finally {
    if (!solicitud.signal.aborted) cargando.value = false
  }
}
async function descargar() {
  if (!documento.value || !diapositiva.value || exportando.value || errorLienzo.value || !puedeExportar.value) return
  exportando.value = true
  problema.value = ''
  try {
    const archivo = await $fetch<Blob>(`/api/admin/redes/${props.articuloId}/exportar`, {
      method: 'POST', responseType: 'blob', signal: solicitud.signal,
      body: { diapositiva: diapositiva.value, formato: documento.value.formato }
    })
    if (solicitud.signal.aborted) return
    const enlace = document.createElement('a')
    const url = URL.createObjectURL(archivo)
    const extension = archivo.type === 'image/jpeg' ? 'jpg' : 'png'
    enlace.href = url
    enlace.download = `pont3la10-${props.articuloId}-${indice.value + 1}.${extension}`
    enlace.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    if (!solicitud.signal.aborted) problema.value = mensajeError(error, 'No se pudo descargar la imagen. Comprueba tu sesión y la verificación MFA.')
  } finally {
    exportando.value = false
  }
}
async function confirmarPublicacionX() {
  if (!puedePublicarX.value || !confirmacionX.value) return
  publicandoX.value = true
  problema.value = ''
  resultadoX.value = null
  confirmacionX.value = false
  try {
    resultadoX.value = await $fetch<typeof resultadoX.value>(`/api/admin/redes/${props.articuloId}/publicar-x`, {
      method: 'POST', body: { confirmar: true }
    })
  } catch (error) {
    problema.value = mensajeError(error, 'No se pudo completar la publicación en X.')
  } finally {
    publicandoX.value = false
  }
}
async function confirmarPublicacionMeta() {
  if (!confirmacionMeta.value || ajustandoBloqueado.value || ajustesPendientes.value || !puedeExportar.value || errorLienzo.value || !editor.value) return
  const destinos = [...destinosMetaDisponibles.value]
  if (!destinos.length) return
  confirmacionMeta.value = false
  publicandoMeta.value = true
  try {
    // Cada destino tiene recibo independiente. Un fallo no vuelve a enviar la otra red.
    for (const destino of destinos) {
      problemasMeta.value[destino] = ''
      try {
        resultadosMeta.value[destino] = await $fetch<ResultadoPublicacionMeta>(`/api/admin/redes/${props.articuloId}/publicar-meta`, {
          method: 'POST', body: { confirmar: true, destino, revision: editor.value.borrador.revision,
            versionArticulo: editor.value.articulo.versionBloqueo }
        })
      } catch (error) { problemasMeta.value[destino] = mensajeError(error, `No se pudo completar el envío a ${destino}.`) }
    }
  } finally { publicandoMeta.value = false }
}
function estadoDestino(id: string) {
  if (id === 'facebook' || id === 'instagram') return conexionMeta.value?.[id].preparada
    ? 'Cuenta verificada · envío con confirmación' : 'Conexión pendiente de verificar'
  if (id === 'x') return conexionX.value?.cuenta ? 'Conectada · envío con confirmación' : 'Pendiente de conexión'
  return 'Comunidad: envío manual'
}
function cerrar() {
  dialogo.value?.close()
  emit('cerrar')
}
function cerrarDesdeFondo(evento: MouseEvent) {
  const elemento = dialogo.value
  if (!elemento || evento.target !== elemento) return
  const limites = elemento.getBoundingClientRect()
  if (evento.clientX < limites.left || evento.clientX > limites.right || evento.clientY < limites.top || evento.clientY > limites.bottom) cerrar()
}
onMounted(() => {
  focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
  desbordamientoAnterior = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialogo.value?.showModal()
  void cargar()
  void $fetch<ConexionMeta>('/api/admin/redes/oauth/meta', { signal: solicitud.signal })
    .then(resultado => { if (!solicitud.signal.aborted) conexionMeta.value = resultado }).catch(() => {})
  void $fetch<EstadoConexionSocialX>('/api/admin/redes/oauth/x', { signal: solicitud.signal })
    .then(resultado => { if (!solicitud.signal.aborted) conexionX.value = resultado }).catch(() => {})
})
onBeforeUnmount(() => {
  solicitud.abort()
  dialogo.value?.close()
  document.body.style.overflow = desbordamientoAnterior
  focoAnterior?.focus()
})
</script>

<template>
  <dialog ref="dialogo" class="vista-rapida-social" aria-labelledby="titulo-vista-rapida" @cancel.prevent="cerrar" @click="cerrarDesdeFondo">
    <header class="cabecera-rapida">
      <div><h2 id="titulo-vista-rapida">Vista rápida</h2><p>Revisa tu pieza y prepara el siguiente envío.</p></div>
      <button type="button" class="cerrar-rapida" aria-label="Cerrar vista rápida" autofocus @click="cerrar"><X :size="23" /></button>
    </header>
    <section v-if="cargando" class="estado-carga-vista" role="status" aria-live="polite" aria-busy="true">
      <div class="arte-carga" aria-hidden="true">
        <div class="campo-carga">
          <span class="marca-carga">PONT3LA10 <i /></span>
          <span class="linea-campo" />
          <span class="circulo-campo" />
          <span class="arco-campo arco-campo--izquierdo" />
          <span class="arco-campo arco-campo--derecho" />
          <span class="destello-carga destello-carga--uno" />
          <span class="destello-carga destello-carga--dos" />
          <div class="icono-imagen-carga">
            <ImageIcon :size="31" stroke-width="1.5" />
            <span class="anillo-carga" />
          </div>
          <div class="renglones-arte">
            <span />
            <span />
          </div>
        </div>
      </div>

      <div class="detalle-carga">
        <span class="etiqueta-carga"><i /> Vista de publicación</span>
        <h3>Armando tu vista previa</h3>
        <p class="mensaje-carga">Estamos reuniendo la imagen, los ajustes y el texto de cada red para mostrarte la pieza tal como quedará.</p>
        <div class="esqueleto-carga" aria-hidden="true">
          <span class="linea-esqueleto linea-esqueleto--titulo" />
          <span class="linea-esqueleto linea-esqueleto--titulo linea-esqueleto--corta" />
          <span class="linea-esqueleto linea-esqueleto--cuerpo" />
          <span class="linea-esqueleto linea-esqueleto--cuerpo linea-esqueleto--media" />
          <span class="linea-esqueleto linea-esqueleto--cuerpo linea-esqueleto--corta" />
        </div>
        <div class="pie-carga">
          <LoaderCircle :size="17" class="giro-carga" aria-hidden="true" />
          <span>Preparando composición y textos</span>
        </div>
      </div>
    </section>
    <div v-else-if="!editor" role="alert"><p>{{ problema }}</p><button type="button" @click="cargar">Reintentar</button></div>
    <div v-else-if="documento && diapositiva" class="cuerpo-rapido">
      <section class="pieza-rapida" aria-label="Imagen de la publicación">
        <div class="barra-pieza"><span>{{ formatosSociales[documento.formato].nombre }}</span><span>{{ formatosSociales[documento.formato].ancho }} × {{ formatosSociales[documento.formato].alto }}</span></div>
        <LienzoPublicacionSocial :diapositiva="diapositiva" :formato="documento.formato" :medio="medio" :dominio="editor.dominio" :solo-lectura="!puedeExportar || ajustandoBloqueado" @mover="moverEncuadre" @error="errorLienzo = $event" />
        <p v-if="puedeExportar && diapositiva.tipo === 'noticia'" class="ayuda-arrastre"><Move :size="14" aria-hidden="true" /> Arrastra la foto para encontrar el mejor encuadre.</p>
        <fieldset v-if="puedeExportar && diapositiva.tipo === 'noticia' && encuadre" class="ajustes-encuadre" :disabled="ajustandoBloqueado">
          <legend>Ajustar imagen</legend>
          <p>Acerca la foto para tener más espacio al moverla.</p>
          <label v-for="control in controlesEncuadre" :key="control.campo" :for="`encuadre-rapido-${articuloId}-${control.campo}`">
            <span>{{ control.nombre }} <output>{{ encuadre[control.campo] }}</output></span>
            <input :id="`encuadre-rapido-${articuloId}-${control.campo}`" v-model.number="encuadre[control.campo]" type="range" :min="control.minimo" :max="control.maximo" :step="control.paso" @input="marcarEncuadre">
          </label>
          <button type="button" @click="Object.assign(encuadre, { x: 0, y: 0, zoom: 1 }); marcarEncuadre()"><RotateCcw :size="14" aria-hidden="true" /> Restablecer encuadre</button>
        </fieldset>
        <div v-if="puedeExportar && ajustesPendientes" class="guardar-encuadre" role="status">
          <p><strong>Cambios sin guardar</strong>Guarda el encuadre antes de publicar.</p>
          <button type="button" :disabled="ajustandoBloqueado || Boolean(errorLienzo)" @click="guardarEncuadre"><Save :size="15" aria-hidden="true" />{{ guardandoEncuadre ? 'Guardando…' : 'Guardar encuadre' }}</button>
        </div>
        <nav class="navegacion-diapositivas" aria-label="Diapositivas">
          <button type="button" :disabled="indice === 0 || ajustandoBloqueado" aria-label="Diapositiva anterior" @click="indice--"><ChevronLeft :size="20" /></button>
          <span>{{ indice + 1 }} / {{ documento.diapositivas.length }}</span>
          <button type="button" :disabled="indice + 1 === documento.diapositivas.length || ajustandoBloqueado" aria-label="Diapositiva siguiente" @click="indice++"><ChevronRight :size="20" /></button>
        </nav>
      </section>
      <section class="detalle-rapido" aria-label="Descripción y destinos">
        <h3>{{ editor.articulo.titulo }}</h3>
        <p class="origen-ajustes">{{ editor.borrador.revision ? 'Configuración guardada' : 'Configuración predeterminada' }} · {{ formatosSociales[documento.formato].nombre }}</p>
        <fieldset class="redes-texto"><legend>Texto por red</legend><label v-for="cuenta in redesVista" :key="cuenta.id"><input v-model="red" type="radio" name="red-vista-rapida" :value="cuenta.id">{{ cuenta.nombre }}</label></fieldset>
        <p class="descripcion-rapida">{{ documento.textos[red] || 'Esta publicación aún no tiene descripción para esta red.' }}</p>
        <details class="destinos-rapidos">
          <summary>Cuentas y conexiones</summary>
          <ul><li v-for="cuenta in cuentasSocialesObjetivo" :key="cuenta.id"><span>{{ cuenta.nombre }} · {{ cuenta.perfil }}</span><strong>{{ estadoDestino(cuenta.id) }}</strong></li></ul>
          <p>Facebook e Instagram reciben la composición completa y su texto correspondiente. Cada red guarda su propio resultado. YouTube Comunidad requiere envío manual.</p>
          <NuxtLink to="/admin/redes/cuentas">Conectar cuentas y revisar requisitos <ExternalLink :size="15" /></NuxtLink>
        </details>
        <p v-if="problema" role="alert">{{ problema }}</p>
        <p v-if="errorLienzo" role="alert">{{ errorLienzo }}</p>
        <section v-if="puedeExportar" class="publicacion-meta" aria-labelledby="titulo-publicacion-meta">
          <h4 id="titulo-publicacion-meta">Publicar en Facebook e Instagram</h4>
          <fieldset :disabled="publicandoMeta || publicandoX"><legend>Selecciona dónde compartir</legend>
            <label v-for="destino in (['facebook', 'instagram'] as const)" :key="destino" :class="{ 'destino-seleccionado': destinosMeta.includes(destino) }">
              <input v-model="destinosMeta" type="checkbox" :aria-label="destino === 'facebook' ? 'Facebook' : 'Instagram'" :value="destino" :disabled="!conexionMeta?.[destino].preparada || ['published', 'in_progress', 'uncertain'].includes(resultadosMeta[destino]?.estado || '')">
              <span><b>{{ destino === 'facebook' ? 'Facebook' : 'Instagram' }}</b><small>{{ conexionMeta?.[destino].preparada ? (destino === 'instagram' ? '@pont3ladiez' : 'Pont3 la 10') : 'Conexión pendiente' }}</small></span>
              <Check v-if="destinosMeta.includes(destino)" :size="16" aria-hidden="true" />
            </label>
          </fieldset>
          <p v-if="!conexionMeta">Consultando las conexiones de Meta…</p>
          <template v-for="destino in (['facebook', 'instagram'] as const)" :key="destino">
            <p v-if="conexionMeta && !conexionMeta[destino].preparada">{{ destino }}: {{ conexionMeta[destino].aviso }}</p>
            <p v-if="problemasMeta[destino]" role="alert">{{ destino }}: {{ problemasMeta[destino] }}</p>
            <div v-if="resultadosMeta[destino]" class="resultado-publicacion-x" role="status" aria-live="polite">
              <strong>{{ destino }}: {{ resultadosMeta[destino]?.estado === 'published' ? (resultadosMeta[destino]?.yaPublicado ? 'Esta versión ya estaba publicada.' : 'Publicación confirmada.') : resultadosMeta[destino]?.estado === 'uncertain' ? 'Resultado sin confirmar. Revisa la cuenta; reenvío bloqueado.' : resultadosMeta[destino]?.estado === 'in_progress' ? 'Envío en proceso. No vuelvas a enviarlo.' : 'No se completó el envío.' }}</strong>
              <a v-if="resultadosMeta[destino]?.url" :href="resultadosMeta[destino]?.url" target="_blank" rel="noopener noreferrer">{{ resultadosMeta[destino]?.url?.endsWith('/pont3ladiez/') ? 'Abrir perfil de Instagram' : 'Ver publicación en ' + destino }} <ExternalLink :size="15" /></a>
              <p v-if="resultadosMeta[destino]?.aviso">{{ resultadosMeta[destino]?.aviso }}</p>
            </div>
          </template>
          <section v-if="confirmacionMeta" class="confirmacion-publicacion-x" role="group" aria-labelledby="titulo-confirmacion-meta">
            <strong id="titulo-confirmacion-meta">¿Publicar ahora en {{ destinosMetaDisponibles.join(' e ') }}?</strong>
            <p>Se enviarán las {{ documento.diapositivas.length }} imágenes con el texto guardado para cada destino. Revisa los textos usando «Texto por red» antes de confirmar.</p>
            <div class="acciones-confirmacion-x">
              <button type="button" @click="confirmacionMeta = false">Seguir revisando</button>
              <button type="button" :disabled="ajustandoBloqueado || ajustesPendientes || !destinosMetaDisponibles.length" @click="confirmarPublicacionMeta">Confirmar y publicar</button>
            </div>
          </section>
          <div class="acciones-rapidas">
            <button type="button" :disabled="ajustandoBloqueado || ajustesPendientes || Boolean(errorLienzo) || !destinosMetaDisponibles.length" @click="confirmacionMeta = true">
              <LoaderCircle v-if="publicandoMeta" :size="17" class="giro-publicar-x" /><Send v-else :size="17" />
              {{ publicandoMeta ? 'Enviando a Meta…' : 'Publicar en las redes seleccionadas' }}
            </button>
          </div>
          <p v-if="publicandoMeta" role="status">Instagram puede tardar alrededor de un minuto en preparar las imágenes. Puedes mantener esta ventana abierta para ver el resultado.</p>
        </section>
        <section v-if="resultadoX" class="resultado-publicacion-x" :class="`resultado-publicacion-x--${resultadoX.estado}`" role="status" aria-live="polite">
          <template v-if="resultadoX.estado === 'published'">
            <strong>{{ resultadoX.yaPublicado ? 'Esta versión ya se había publicado en X.' : 'Publicación confirmada en X.' }}</strong>
            <a v-if="resultadoX.url" :href="resultadoX.url" target="_blank" rel="noopener noreferrer">Ver publicación <ExternalLink :size="15" /></a>
            <p v-if="resultadoX.aviso">{{ resultadoX.aviso }}</p>
          </template>
          <template v-else-if="resultadoX.estado === 'uncertain'">
            <strong>X no confirmó el resultado.</strong>
            <p>Revisa @{{ conexionX?.cuenta?.usuario }} antes de volver a intentarlo; el sistema bloqueó el reenvío automático para evitar duplicados.</p>
          </template>
          <template v-else-if="resultadoX.estado === 'in_progress'">
            <strong>La publicación sigue procesándose.</strong>
            <p>Espera un momento y vuelve a abrir la vista rápida para consultar el resultado.</p>
          </template>
          <template v-else>
            <strong>No se publicó en X.</strong>
            <p>Corrige el problema y vuelve a confirmar el envío.</p>
          </template>
        </section>
        <section v-if="confirmacionX" class="confirmacion-publicacion-x" role="group" aria-labelledby="titulo-confirmacion-x">
          <div><strong id="titulo-confirmacion-x">¿Publicar ahora en @{{ conexionX?.cuenta?.usuario }}?</strong>
            <p>Se enviará el texto de X con {{ documento?.diapositivas.length }} imagen(es). La acción puede generar cargos de API en tu cuenta de desarrollador de X.</p></div>
          <div class="acciones-confirmacion-x">
            <button type="button" @click="confirmacionX = false">Revisar antes</button>
            <button type="button" :disabled="publicandoX" @click="confirmarPublicacionX"><Send :size="16" /> Confirmar publicación</button>
          </div>
        </section>
        <div class="acciones-rapidas">
          <button
            v-if="red === 'x' && puedeExportar && conexionX?.cuenta && conexionX.preparada"
            type="button"
            class="boton-publicar-x"
            :disabled="ajustandoBloqueado || ajustesPendientes || Boolean(errorLienzo) || ['published', 'in_progress', 'uncertain'].includes(resultadoX?.estado || '')"
            @click="confirmacionX = true; resultadoX = null"
          >
            <LoaderCircle v-if="publicandoX" :size="17" class="giro-publicar-x" aria-hidden="true" />
            <Send v-else :size="17" />{{ publicandoX ? 'Publicando en X…' : 'Publicar en X' }}
          </button>
          <NuxtLink v-else-if="red === 'x' && puedeExportar" to="/admin/redes/cuentas">Conecta @Pont3la10 para publicar en X</NuxtLink>
          <button v-if="puedeExportar" type="button" :disabled="exportando || Boolean(errorLienzo)" @click="descargar"><Download :size="17" />{{ exportando ? 'Exportando…' : 'Descargar esta imagen' }}</button>
          <NuxtLink :to="`/admin/redes/${articuloId}`">Abrir editor</NuxtLink>
        </div>
      </section>
    </div>
  </dialog>
</template>

<style scoped>
.ajustes-encuadre { display: grid; grid-template-columns: 1fr 1fr; column-gap: 20px; margin: 18px 0 0; padding: 16px; border: 1px solid #dfe6ef; border-radius: 10px; background: white; }
.ajustes-encuadre legend { padding: 0 6px; font-size: 13px; font-weight: 700; }
.ajustes-encuadre p,.guardar-encuadre p { font-size: 12px; line-height: 1.6; color: var(--muted); margin: 0 0 12px; }
.ajustes-encuadre p,.ajustes-encuadre label:first-of-type,.ajustes-encuadre button { grid-column: 1 / -1; }
.ajustes-encuadre label { display: block; min-width: 0; margin: 5px 0 8px; }
.ajustes-encuadre label span { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 550; color: #38516e; }
.ajustes-encuadre output { font-variant-numeric: tabular-nums; color: #174ea6; font-weight: 700; }
.ajustes-encuadre input { width: 100%; accent-color: #174ea6; min-height: 32px; }
.ajustes-encuadre button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; justify-self: start; padding: 8px 0; background: none; border: 0; color: #526174; font-size: 12px; }
.guardar-encuadre { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; margin-top: 12px; border: 1px solid #efdc95; background: #fff9e7; border-radius: 8px; }
.guardar-encuadre p { margin: 0; }.guardar-encuadre strong { display: block; color: #695018; margin-bottom: 2px; }
.guardar-encuadre button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; flex-shrink: 0; border: 0; border-radius: 7px; padding: 12px; color: #08204a; background: #ffd800; font-size: 12px; font-weight: 750; }
.publicacion-meta { margin-top: 20px; border-top: 1px solid var(--line); padding-top: 16px; }
.publicacion-meta h4 { margin: 0 0 14px; }
.publicacion-meta fieldset { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border: 0; padding: 0; margin: 0; }
.publicacion-meta legend { font-size: 12px; color: #62748b; margin-bottom: 12px; }
.publicacion-meta label { display: flex; align-items: center; gap: 9px; min-width: 0; min-height: 64px; box-sizing: border-box; padding: 12px; border: 1px solid #dce4ef; border-radius: 9px; font-size: 13px; cursor: pointer; transition: border-color 150ms, background-color 150ms; }
.publicacion-meta label.destino-seleccionado { background: #f1f6ff; border-color: #7199cd; }
.publicacion-meta label:has(input:disabled) { cursor: default; }
.publicacion-meta label span { min-width: 0; flex: 1; }.publicacion-meta label b,.publicacion-meta label small { display: block; }
.publicacion-meta label small { font-size: 10px; color: #62748b; margin-top: 4px; overflow-wrap: anywhere; }
.publicacion-meta label svg { color: #174ea6; flex-shrink: 0; }.publicacion-meta input { accent-color: #174ea6; margin: 0; }
.publicacion-meta > p { color: var(--muted); font-size: 13px; line-height: 1.6; }
.vista-rapida-social {
  box-sizing: border-box;
  width: min(1140px, calc(100% - 40px));
  max-height: calc(100dvh - 32px);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 0;
  color: var(--navy);
  background: #fff;
  overflow: auto;
  box-shadow: 0 28px 100px #02132955;
  overscroll-behavior: contain;
  font-family: Inter, Arial, sans-serif;
}

.vista-rapida-social::backdrop { background: #06182bcc; }
.cabecera-rapida { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 0; padding: 20px 26px; border-bottom: 1px solid #e5ebf2; background: #fff; }
.cabecera-rapida p { margin: 6px 0 0; color: #738197; font-size: 12px; line-height: 1.5; }
.cabecera-rapida h2 { margin: 0; font-size: 23px; font-weight: 750; letter-spacing: -.035em; line-height: 1.15; }
.cerrar-rapida { display: grid; flex-shrink: 0; width: 40px; height: 40px; place-items: center; border: 1px solid #e5ebf2; border-radius: 10px; background: #f7f9fc; color: #526174; transition: background-color 150ms; }
.cerrar-rapida:hover { background: #eaf0f8; }
.barra-pieza { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 2px 2px 13px; font-size: 11px; font-weight: 600; color: #62748b; }
.barra-pieza span:last-child { font-variant-numeric: tabular-nums; font-weight: 450; }
.ayuda-arrastre { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 13px 0 0; color: #738197; font-size: 11px; line-height: 1.5; }
.pieza-rapida :deep(.lienzo-social) { border-radius: 6px; }

.estado-carga-vista {
  margin: 24px;
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  align-items: center;
  gap: clamp(24px, 4vw, 48px);
  min-height: 390px;
  overflow: hidden;
  padding: clamp(18px, 2.6vw, 32px);
  border: 1px solid #e4eaf2;
  border-radius: 14px;
  background: linear-gradient(115deg, #f5f8fc 0%, #fff 72%);
  animation: entrada-carga 260ms ease-out both;
}

.estado-carga-vista::before {
  position: absolute;
  z-index: -1;
  top: -130px;
  right: -100px;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(23, 78, 166, 0.08), transparent 68%);
  content: '';
}

.arte-carga {
  position: relative;
  min-width: 0;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 11px;
  background:
    radial-gradient(ellipse at 50% 42%, rgba(23, 78, 166, 0.9), transparent 38%),
    linear-gradient(145deg, #0c2d60, #061631 70%);
  box-shadow: 0 18px 42px rgba(8, 32, 74, 0.18);
}

.arte-carga::before,
.arte-carga::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
}

.arte-carga::before {
  background: repeating-linear-gradient(116deg, transparent 0 46px, rgba(255, 255, 255, 0.035) 47px 48px, transparent 49px 93px);
  mask-image: linear-gradient(90deg, transparent, #000 34%, #000 80%, transparent);
}

.arte-carga::after {
  background: linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.14) 47%, transparent 60%);
  transform: translateX(-110%);
  animation: barrido-carga 2.8s ease-in-out infinite;
}

.campo-carga {
  position: absolute;
  inset: 7%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 7px;
}

.campo-carga::before {
  position: absolute;
  inset: 8%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  content: '';
}

.marca-carga {
  position: absolute;
  z-index: 1;
  top: 12%;
  left: 12%;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.82);
  font: 700 10px/1 Montserrat, Inter, Arial, sans-serif;
  letter-spacing: 0.09em;
}

.marca-carga i { width: 19px; height: 3px; border-radius: 2px; background: #ffd800; }
.linea-campo { position: absolute; top: 8%; bottom: 8%; left: 50%; width: 1px; background: rgba(255, 255, 255, 0.14); }
.circulo-campo { position: absolute; top: 50%; left: 50%; width: 28%; aspect-ratio: 1; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 50%; transform: translate(-50%, -50%); }
.arco-campo { position: absolute; top: 36%; width: 10%; height: 28%; border: 1px solid rgba(255, 255, 255, 0.13); }
.arco-campo--izquierdo { left: 8%; border-left: 0; border-radius: 0 50% 50% 0; }
.arco-campo--derecho { right: 8%; border-right: 0; border-radius: 50% 0 0 50%; }

.destello-carga {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd800;
  box-shadow: 0 0 18px 5px rgba(255, 216, 0, 0.35);
}

.destello-carga--uno { top: 28%; left: 24%; }
.destello-carga--dos { right: 20%; bottom: 28%; width: 4px; height: 4px; background: #66a8ff; box-shadow: 0 0 18px 5px rgba(53, 139, 255, 0.45); }

.icono-imagen-carga {
  position: absolute;
  top: 49%;
  left: 50%;
  display: grid;
  width: 74px;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.23);
  border-radius: 50%;
  background: rgba(5, 22, 49, 0.64);
  color: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  transform: translate(-50%, -50%);
  backdrop-filter: blur(6px);
}

.anillo-carga {
  position: absolute;
  inset: -9px;
  border: 2px solid rgba(255, 255, 255, 0.18);
  border-top-color: #ffd800;
  border-right-color: rgba(255, 216, 0, 0.6);
  border-radius: 50%;
  animation: giro-anillo 1.15s linear infinite;
}

.renglones-arte { position: absolute; right: 12%; bottom: 12%; left: 12%; display: grid; gap: 9px; }
.renglones-arte span { height: 8px; border-radius: 4px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.08)); }
.renglones-arte span:first-child { width: 76%; height: 11px; }
.renglones-arte span:last-child { width: 48%; opacity: 0.65; }

.detalle-carga { width: min(100%, 390px); padding: 10px 0; }
.etiqueta-carga { display: inline-flex; align-items: center; gap: 8px; color: #31537e; font-size: 12px; font-weight: 700; }
.etiqueta-carga i { width: 8px; height: 8px; border-radius: 50%; background: #ffd800; box-shadow: 0 0 0 4px rgba(255, 216, 0, 0.2); }
.detalle-carga h3 { margin: 18px 0 10px; color: #08204a; font-size: clamp(22px, 2.4vw, 29px); font-weight: 750; letter-spacing: -0.035em; line-height: 1.15; }
.mensaje-carga { max-width: 360px; margin: 0; color: #5f6878; font-size: 14px; line-height: 1.7; }

.esqueleto-carga { display: grid; gap: 9px; margin-top: 26px; }
.linea-esqueleto { position: relative; display: block; overflow: hidden; border-radius: 5px; background: #e4ebf4; }
.linea-esqueleto::after { position: absolute; inset: 0; background: linear-gradient(95deg, transparent, rgba(255, 255, 255, 0.9), transparent); content: ''; transform: translateX(-100%); animation: brillo-esqueleto 2s ease-in-out infinite; }
.linea-esqueleto--titulo { width: 88%; height: 12px; background: #dce5f0; }
.linea-esqueleto--corta { width: 58%; }
.linea-esqueleto--cuerpo { width: 100%; height: 8px; margin-top: 5px; background: #edf1f7; }
.linea-esqueleto--media { width: 84%; margin-top: 0; }
.linea-esqueleto--cuerpo.linea-esqueleto--corta { width: 67%; margin-top: 0; }

.pie-carga { display: flex; align-items: center; gap: 9px; margin-top: 25px; color: #31537e; font-size: 12px; font-weight: 650; }
.giro-carga { color: #174ea6; animation: giro-anillo 1s linear infinite; }

.cuerpo-rapido { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 30px; padding: 24px; }
.pieza-rapida { min-width: 0; align-self: start; border-radius: 12px; padding: 16px; background: #f4f7fb; }
.navegacion-diapositivas { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 13px; }
.navegacion-diapositivas button { display: grid; min-width: 44px; min-height: 44px; place-items: center; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
.detalle-rapido { min-width: 0; padding: 4px 0 8px; }
.detalle-rapido h3 { margin: 0 0 10px; font-size: 20px; font-weight: 700; letter-spacing: -.025em; line-height: 1.4; text-wrap: balance; }
.origen-ajustes, .nota-ajustes { color: var(--muted); font-size: 12px; line-height: 1.6; }
.redes-texto { display: flex; flex-wrap: wrap; gap: 6px; margin: 22px 0 10px; border: 0; padding: 0; }
.redes-texto legend { margin-bottom: 12px; font-size: 12px; font-weight: 650; color: #526174; }
.redes-texto label { display: flex; min-height: 38px; box-sizing: border-box; align-items: center; gap: 7px; border: 1px solid #e1e8f1; border-radius: 7px; padding: 8px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
.redes-texto label:has(input:checked) { background: #123d79; border-color: #123d79; color: white; }.redes-texto input { accent-color: #174ea6; margin: 0; }
.descripcion-rapida { max-height: 200px; overflow: auto; border: 1px solid #e5ebf2; border-radius: 9px; padding: 17px; background: #fafbfd; color: #3d5068; font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; white-space: pre-wrap; }
.destinos-rapidos { margin-top: 20px; border-top: 1px solid var(--line); padding-top: 14px; }
.destinos-rapidos summary { cursor: pointer; padding: 2px 0; color: #526174; font-size: 12px; font-weight: 650; }
.destinos-rapidos[open] summary { margin-bottom: 16px; }
.destinos-rapidos ul { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.destinos-rapidos li { display: grid; gap: 3px; font-size: 12px; }
.destinos-rapidos strong { color: #526174; font-weight: 500; }
.destinos-rapidos p { color: var(--muted); font-size: 12px; line-height: 1.6; }
.destinos-rapidos a { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; }
.confirmacion-publicacion-x,
.resultado-publicacion-x { margin-top: 16px; border: 1px solid #d9e3ef; border-radius: 10px; padding: 15px; background: #f6f9fd; }
.confirmacion-publicacion-x strong,
.resultado-publicacion-x strong { color: #09274f; font-size: 14px; }
.confirmacion-publicacion-x p,
.resultado-publicacion-x p { margin: 7px 0 0; color: #526174; font-size: 12px; line-height: 1.6; }
.acciones-confirmacion-x { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 9px; margin-top: 14px; }
.acciones-confirmacion-x button { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid #cbd6e3; border-radius: 7px; padding: 9px 13px; background: #fff; color: #17375f; font-weight: 700; }
.acciones-confirmacion-x button:last-child { border-color: #123d79; background: #123d79; color: #fff; }
.resultado-publicacion-x { display: grid; gap: 7px; }
.resultado-publicacion-x a { display: inline-flex; align-items: center; gap: 6px; width: fit-content; color: #174ea6; font-weight: 700; }
.resultado-publicacion-x--uncertain { border-color: #ead6a2; background: #fffaf0; }
.resultado-publicacion-x--uncertain strong { color: #775100; }
.resultado-publicacion-x--published { border-color: #badfc9; background: #f1fbf5; }
.resultado-publicacion-x--published strong { color: #14643b; }
.acciones-rapidas { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 24px; }
.acciones-rapidas button { display: flex; justify-content: center; align-items: center; gap: 9px; min-height: 46px; border: 0; border-radius: 8px; padding: 12px 16px; background: #123d79; color: #fff; font-size: 13px; font-weight: 650; }
.publicacion-meta .acciones-rapidas button { width: 100%; }.publicacion-meta h4 { font-size: 14px; letter-spacing: -.015em; }
.detalle-rapido > .acciones-rapidas { border-top: 1px solid #e5ebf2; padding-top: 18px; }
.detalle-rapido > .acciones-rapidas button:not(.boton-publicar-x) { background: #f1f5fa; color: #38516e; border: 1px solid #dce4ef; font-size: 12px; }
.acciones-rapidas button.boton-publicar-x { background: #0b1118; color: #fff; }
.giro-publicar-x { animation: giro-anillo 1s linear infinite; }
.acciones-rapidas a { font-size: 13px; font-weight: 700; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: 0.5; }
button:focus-visible, a:focus-visible, input:focus-visible, summary:focus-visible { outline: 3px solid #2376cf; outline-offset: 3px; }

@keyframes entrada-carga { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
@keyframes giro-anillo { to { transform: rotate(360deg); } }
@keyframes brillo-esqueleto { 55%, 100% { transform: translateX(115%); } }
@keyframes barrido-carga { 45%, 100% { transform: translateX(110%); } }

@media (max-width: 720px) {
  .cuerpo-rapido { grid-template-columns: minmax(0, 1fr); }
  .estado-carga-vista { grid-template-columns: minmax(0, 1fr); gap: 24px; padding: 14px; }
  .estado-carga-vista::before { right: 0; width: min(100%, 360px); }
  .arte-carga { width: min(100%, 430px); justify-self: center; }
  .detalle-carga { box-sizing: border-box; width: 100%; padding: 0 4px 8px; }
  .detalle-carga h3 { margin-top: 14px; }
  .esqueleto-carga { margin-top: 18px; }
  .pie-carga { margin-top: 18px; }
  .vista-rapida-social { width: calc(100% - 16px); max-height: calc(100dvh - 16px); padding: 0; border-radius: 13px; }
  .cabecera-rapida { padding: 16px; }.cabecera-rapida h2 { font-size: 21px; }.cabecera-rapida p { max-width: 220px; font-size: 11px; }
  .cuerpo-rapido { padding: 14px; gap: 22px; }.pieza-rapida { padding: 12px; }
  .guardar-encuadre { align-items: stretch; flex-direction: column; }.ayuda-arrastre { font-size: 10px; }
  .publicacion-meta label { padding: 10px; gap: 7px; }.publicacion-meta label small { font-size: 10px; }
  .pieza-rapida { box-sizing: border-box; width: 100%; }
  .acciones-rapidas { padding-bottom: 12px; }
  .acciones-confirmacion-x { flex-direction: column-reverse; }
  .acciones-confirmacion-x button { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .publicacion-meta label,.cerrar-rapida { transition: none; }
  .estado-carga-vista,
  .arte-carga::after,
  .anillo-carga,
  .linea-esqueleto::after,
  .giro-carga,
  .giro-publicar-x { animation: none; }
}
</style>
