<script setup lang="ts">
import { ArrowLeft, Download, Save, Sparkles, Copy, Plus, Trash2, RotateCcw, Grip, ImagePlus, ChevronLeft, ChevronRight, Check, Smartphone } from '@lucide/vue'
import LienzoPublicacionSocial from '~/components/admin/LienzoPublicacionSocial.vue'
import SelectorPortadaEditorial from '~/components/admin/SelectorPortadaEditorial.vue'
import type { MedioEditorial } from '~/types/mediaEditorial'
import type { BorradorSocial } from '~/types/publicacionesSociales'
import type { DocumentoSocial, PropuestaSocial, RedSocial } from '~/utils/editorial/publicacionesSociales'
import { formatosSociales, redesSociales, crearDiapositivaSocial, esquemaDocumentoSocial,
  enlaceSocial, componerTextoSocial, avisosCompatibilidadSocial, rutaImagenCtaSocial } from '~/utils/editorial/publicacionesSociales'

definePageMeta({ layout: 'admin', middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ title: 'Generador de publicaciones | Pont3la10', robots: 'noindex, nofollow' })
const route = useRoute()
const { contextoEditorial, tienePermiso } = useContextoEditorial()
const { data, error, status, refresh } = await useFetch(`/api/admin/redes/${route.params.id}`)
const documento = ref<DocumentoSocial | null>(data.value ? structuredClone(toRaw(data.value.borrador.documento)) : null)
const revision = ref(data.value?.borrador.revision || 0)
const estadoGuardado = ref<'draft' | 'ready'>(data.value?.borrador.estado || 'draft')
const medios = ref<MedioEditorial[]>(data.value?.medios || [])
const indice = ref(0), guias = ref(false), selectorAbierto = ref(false), movil = ref(false)
const guardando = ref(false), generando = ref(false), exportando = ref(false)
const mensaje = ref(''), problema = ref(''), errorLienzo = ref(''), tono = ref('equilibrado')
const recuperable = ref<string | null>(null)
const firmaGuardada = ref(JSON.stringify(documento.value))
const operacionIa = ref<string | null>(null)
const sucio = computed(() => JSON.stringify(documento.value) !== firmaGuardada.value)
const puedeEditar = computed(() => tienePermiso('contenido.editarTodos'))
const diapositiva = computed(() => documento.value?.diapositivas[indice.value] || null)
const encuadre = computed(() => diapositiva.value && documento.value ? diapositiva.value.encuadres[documento.value.formato] : null)
const medio = computed(() => medios.value.find(actual => actual.id === diapositiva.value?.medioId) || null)
const avisos = computed(() => documento.value ? avisosCompatibilidadSocial(documento.value) : [])
const enlace = computed(() => data.value && documento.value ? enlaceSocial(data.value.urlCanonica, documento.value.red, data.value.articulo.id, documento.value.variante) : '')
const claveRecuperacion = computed(() => `pont3la10:social:${contextoEditorial.value?.usuario.id}:${route.params.id}`)
const nombresRed: Record<RedSocial, string> = { facebook: 'Facebook', instagram: 'Instagram', x: 'X / Twitter', whatsapp: 'WhatsApp' }
const ajustes = [
  { campo: 'x', nombre: 'Mover X', minimo: -100, maximo: 100, paso: 1 },
  { campo: 'y', nombre: 'Mover Y', minimo: -100, maximo: 100, paso: 1 },
  { campo: 'zoom', nombre: 'Zoom', minimo: 1, maximo: 3, paso: .01 },
  { campo: 'degradado', nombre: 'Sombreado inferior', minimo: 35, maximo: 90, paso: 1 },
  { campo: 'tamanoTexto', nombre: 'Tamaño del titular', minimo: 42, maximo: 120, paso: 1 }
] as const

watch(data, valor => {
  if (valor && !documento.value) {
    documento.value = structuredClone(toRaw(valor.borrador.documento)); medios.value = valor.medios
    revision.value = valor.borrador.revision; firmaGuardada.value = JSON.stringify(documento.value)
  }
})
watch(documento, () => {
  if (!import.meta.client || !documento.value || !puedeEditar.value) return
  try {
    if (sucio.value) sessionStorage.setItem(claveRecuperacion.value, JSON.stringify({ revision: revision.value, documento: documento.value }))
    else sessionStorage.removeItem(claveRecuperacion.value)
  } catch { /* La edición y el guardado del CMS siguen disponibles. */ }
}, { deep: true })
onMounted(() => {
  try { recuperable.value = sessionStorage.getItem(claveRecuperacion.value) } catch { /* Opcional. */ }
  window.addEventListener('beforeunload', protegerSalida)
})
onBeforeUnmount(() => { window.removeEventListener('beforeunload', protegerSalida) })
function protegerSalida(evento: BeforeUnloadEvent) { if (sucio.value) { evento.preventDefault(); evento.returnValue = '' } }
onBeforeRouteLeave(() => !sucio.value || window.confirm('Hay cambios sin guardar en el CMS. ¿Quieres salir del editor?'))
function fallo(error: unknown, respaldo: string) {
  const detalle = error as { data?: { statusMessage?: string, message?: string }, message?: string }
  problema.value = detalle.data?.statusMessage || detalle.data?.message || respaldo
}
async function recuperar() {
  try {
    const copia = JSON.parse(recuperable.value || '')
    const validacion = esquemaDocumentoSocial.safeParse(copia.documento)
    if (!validacion.success) throw new Error()
    if (copia.revision !== revision.value) { problema.value = 'La copia de esta pestaña pertenece a una revisión anterior. No se aplicó para evitar sobrescribir otra sesión.'; return }
    const ids = [...new Set(validacion.data.diapositivas.flatMap(actual => actual.medioId ? [actual.medioId] : []))]
    const recuperados = await Promise.all(ids.map(id => $fetch<MedioEditorial>(`/api/admin/media/${id}`)))
    medios.value = recuperados; documento.value = validacion.data; indice.value = 0; recuperable.value = null
  } catch { problema.value = 'No se pudo recuperar la copia de esta pestaña.' }
}
async function guardar(estado: 'draft' | 'ready' = 'draft') {
  if (!documento.value || guardando.value) return
  problema.value = ''; mensaje.value = ''
  const validacion = esquemaDocumentoSocial.safeParse(documento.value)
  if (!validacion.success) { problema.value = validacion.error.issues[0]?.message || 'Revisa el contenido.'; return }
  if (estado === 'ready' && errorLienzo.value) { problema.value = errorLienzo.value; return }
  guardando.value = true
  const copia = structuredClone(toRaw(documento.value))
  try {
    const resultado = await $fetch<BorradorSocial>(`/api/admin/redes/${route.params.id}`, { method: 'PUT', body: { documento: copia, revision: revision.value, estado } })
    revision.value = resultado.revision; estadoGuardado.value = estado
    firmaGuardada.value = JSON.stringify(copia)
    try {
      if (!sucio.value) sessionStorage.removeItem(claveRecuperacion.value)
      else sessionStorage.setItem(claveRecuperacion.value, JSON.stringify({ revision: revision.value, documento: documento.value }))
    } catch { /* El guardado en el CMS ya se confirmó aunque el navegador no permita la copia local. */ }
    mensaje.value = estado === 'ready' ? 'Revisión guardada como lista para compartir.' : 'Borrador guardado en el CMS.'
  } catch (error) { fallo(error, 'No se pudo guardar. Tus cambios siguen en esta pestaña.') }
  finally { guardando.value = false }
}
function elegirMedio(seleccionado: MedioEditorial) {
  if (!diapositiva.value) return
  if (!medios.value.some(actual => actual.id === seleccionado.id)) medios.value.push(seleccionado)
  diapositiva.value.medioId = seleccionado.id; selectorAbierto.value = false
}
function cambiarTipo(tipo: 'unica' | 'carrusel') {
  if (!documento.value || tipo === documento.value.tipo) return
  if (tipo === 'unica' && documento.value.diapositivas.length > 1 && !window.confirm('Conservarás únicamente la diapositiva seleccionada. ¿Cambiar a imagen única?')) return
  if (tipo === 'unica') documento.value.diapositivas = [documento.value.diapositivas[indice.value]!]
  else documento.value.diapositivas.push(crearDiapositivaSocial('La historia completa está en **Pont3la10**', null, 'cta'))
  documento.value.tipo = tipo; indice.value = 0
}
function agregar(tipo: 'noticia' | 'cta') {
  if (!documento.value || documento.value.diapositivas.length >= 8) return
  documento.value.tipo = 'carrusel'
  const nueva = crearDiapositivaSocial(tipo === 'cta' ? 'La historia completa está en **Pont3la10**' : 'Escribe un dato de la noticia', tipo === 'cta' ? null : medio.value?.id || data.value?.articulo.portadaId || null, tipo)
  const posicion = tipo === 'noticia' && documento.value.diapositivas.at(-1)?.tipo === 'cta' ? documento.value.diapositivas.length - 1 : documento.value.diapositivas.length
  documento.value.diapositivas.splice(posicion, 0, nueva); indice.value = posicion
}
function duplicar() {
  if (!documento.value || !diapositiva.value || documento.value.diapositivas.length >= 8) return
  const copia = structuredClone(toRaw(diapositiva.value)); copia.id = crypto.randomUUID()
  documento.value.diapositivas.splice(indice.value + 1, 0, copia); documento.value.tipo = 'carrusel'; indice.value++
}
function eliminar() {
  if (!documento.value || documento.value.diapositivas.length <= 1) return
  documento.value.diapositivas.splice(indice.value, 1); indice.value = Math.max(0, indice.value - 1)
  if (documento.value.diapositivas.length === 1) documento.value.tipo = 'unica'
}
function reordenar(desde: number, hasta: number) {
  if (!documento.value || hasta < 0 || hasta >= documento.value.diapositivas.length) return
  const elemento = documento.value.diapositivas.splice(desde, 1)[0]!
  documento.value.diapositivas.splice(hasta, 0, elemento); indice.value = hasta
}
function soltar(evento: DragEvent, hasta: number) {
    const desde = Number(evento.dataTransfer?.getData('text/plain'))
  if (Number.isInteger(desde) && desde >= 0 && desde < (documento.value?.diapositivas.length || 0)) reordenar(desde, hasta)
}
async function sugerir() {
  if (!documento.value || generando.value) return
  generando.value = true; problema.value = ''; mensaje.value = ''
  try {
    operacionIa.value ||= crypto.randomUUID()
    const resultado = await $fetch<{ propuestas: PropuestaSocial[] }>(`/api/admin/redes/${route.params.id}/sugerencias`, { method: 'POST', retry: 0, body: { tono: tono.value, operacionId: operacionIa.value } })
    documento.value.propuestas = resultado.propuestas; mensaje.value = 'Cinco enfoques preparados. Revisa el sustento antes de elegir.'
    operacionIa.value = null
  } catch (error) { fallo(error, 'No se pudo completar la generación. No se reintentó automáticamente.') }
  finally { generando.value = false }
}
function aplicarPropuesta(propuesta: PropuestaSocial, posicion: number) {
  if (!documento.value || !data.value || !diapositiva.value) return
  diapositiva.value.titular = propuesta.titular
  documento.value.variante = `enfoque_${posicion + 1}`
  for (const red of redesSociales) documento.value.textos[red] = componerTextoSocial(propuesta, red,
    enlaceSocial(data.value.urlCanonica, red, data.value.articulo.id, documento.value.variante))
}
async function copiar(texto: string) {
  try { await navigator.clipboard.writeText(texto); mensaje.value = 'Texto copiado.' }
  catch { problema.value = 'No se pudo acceder al portapapeles. Selecciona y copia el texto manualmente.' }
}
function insertarEnlace() {
  if (!documento.value || documento.value.red === 'instagram') return
  const red = documento.value.red
  if (!documento.value.textos[red].includes(enlace.value)) documento.value.textos[red] += `\n\nLa historia completa: ${enlace.value}`
}
async function exportar(todas = false) {
  if (!documento.value || !diapositiva.value || exportando.value) return
  exportando.value = true; problema.value = ''
  const formato = documento.value.formato
  const seleccion = structuredClone(toRaw(todas ? documento.value.diapositivas : [diapositiva.value]))
  try {
    for (const [posicion, actual] of seleccion.entries()) {
      const resultado = await $fetch<Blob>(`/api/admin/redes/${route.params.id}/exportar`, { method: 'POST',
        body: { diapositiva: actual, formato }, responseType: 'blob' })
      const url = URL.createObjectURL(resultado), enlaceDescarga = document.createElement('a')
      enlaceDescarga.href = url; enlaceDescarga.download = `pont3la10-${formato}-${todas ? posicion + 1 : indice.value + 1}.png`
      enlaceDescarga.click(); window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    }
    mensaje.value = 'Imágenes preparadas. Si tu navegador solicita permiso para varias descargas, habilítalo.'
  } catch (error) { fallo(error, 'No se pudo exportar. Revisa las imágenes y el tamaño del titular.') }
  finally { exportando.value = false }
}
</script>

<template>
  <section class="generador-redes">
    <header class="cabecera-generador"><div><NuxtLink to="/admin/redes"><ArrowLeft :size="16" /> Ver publicaciones</NuxtLink><h1>Generador de publicaciones</h1><p>Ajusta la pieza. Dale una razón para seguir leyendo.</p></div><span>{{ sucio ? 'Cambios sin guardar' : revision ? `Revisión ${revision} · ${estadoGuardado === 'ready' ? 'Lista' : 'Borrador'}` : 'Nueva propuesta' }}</span></header>
    <p v-if="status === 'pending'" role="status">Cargando noticia y composición…</p>
    <div v-else-if="error" role="alert"><p>No se pudo abrir la publicación. Comprueba tu sesión y la disponibilidad del CMS.</p><button @click="refresh()">Reintentar</button></div>
    <template v-else-if="documento && data && diapositiva && encuadre">
      <div v-if="recuperable" class="aviso-generador">Hay cambios recuperables de esta pestaña. <button @click="recuperar">Recuperar edición</button><button @click="recuperable = null">Conservar versión del CMS</button></div>
      <p v-if="!data.almacenamientoDisponible" class="aviso-generador">Falta instalar la migración social para guardar en el CMS. Puedes editar y descargar.</p>
      <p v-if="!puedeEditar" class="aviso-generador">Vista de consulta. Tu rol necesita permiso para editar todos los contenidos para guardar, generar o exportar.</p>
      <p v-if="problema" class="error-generador" role="alert">{{ problema }}</p><p v-if="mensaje" class="exito-generador" role="status">{{ mensaje }}</p>
      <div class="espacio-generador">
        <aside class="inspector-generador" aria-label="Configuración de la pieza">
          <section><h2>Noticia de origen</h2><p class="titular-origen">{{ data.articulo.titulo }}</p><a :href="data.urlCanonica" target="_blank" rel="noopener">Abrir noticia ↗</a></section>
          <fieldset :disabled="!puedeEditar"><legend><ImagePlus :size="17" /> {{ diapositiva.tipo === 'cta' ? 'Promoción final' : 'Fotografía' }}</legend>
            <template v-if="diapositiva.tipo === 'noticia'">
              <button class="boton-oscuro" @click="selectorAbierto = true">{{ medio ? 'Cambiar imagen' : 'Elegir imagen' }}</button>
              <label v-for="ajuste in ajustes" :key="ajuste.campo"><span>{{ ajuste.nombre }} <output>{{ encuadre[ajuste.campo] }}</output></span><input v-model.number="encuadre[ajuste.campo]" type="range" :min="ajuste.minimo" :max="ajuste.maximo" :step="ajuste.paso"></label>
              <button class="boton-texto" @click="Object.assign(encuadre, { x: 0, y: 0, zoom: 1 })"><RotateCcw :size="15" /> Restablecer encuadre</button>
              <p v-if="medio?.credito" class="credito-generador">Crédito: {{ medio.credito }}</p>
              <p class="nota-generador">Revisa que la autorización de la foto permita redistribuirla en redes.</p>
            </template>
            <label v-else><span>Diseño de cierre</span><select v-model="diapositiva.varianteCta"><option value="promocional">Imagen promocional (predeterminada)</option><option value="minimalista">Buscador minimalista</option><option value="deportivo">Buscador deportivo</option><option value="editorial">Premium editorial</option></select></label>
          </fieldset>
          <p v-if="diapositiva.tipo === 'cta' && diapositiva.varianteCta === 'promocional'" class="nota-generador">Cierre promocional generado con IA para Pont3la10. Su texto forma parte de la imagen. Elige otro diseño de cierre para editarlo.</p>
          <fieldset v-else :disabled="!puedeEditar"><legend>Texto de la pieza</legend><label><span>Titular</span><textarea v-model="diapositiva.titular" maxlength="220" rows="4" /></label><p class="nota-generador">Usa **palabras** para destacar en amarillo. Máximo cuatro líneas; el tamaño se ajusta sin cortar el texto.</p></fieldset>
          <div class="acciones-guardar"><button class="boton-oscuro" :disabled="guardando || !puedeEditar || !data.almacenamientoDisponible" @click="guardar()"><Save :size="17" /> {{ guardando ? 'Guardando…' : 'Guardar borrador' }}</button><button class="boton-amarillo" :disabled="guardando || !puedeEditar || !data.almacenamientoDisponible" @click="guardar('ready')"><Check :size="17" /> Marcar como lista</button></div>
        </aside>
        <section class="escenario-generador" aria-label="Lienzo de la publicación">
          <div class="barra-lienzo"><label>Formato<select v-model="documento.formato"><option v-for="(formato, id) in formatosSociales" :key="id" :value="id">{{ formato.nombre }} · {{ formato.ancho }} × {{ formato.alto }}</option></select></label><label class="control-guias"><input v-model="guias" type="checkbox"> Guías</label></div>
          <div class="soporte-lienzo" :class="{ 'vista-movil': movil }"><LienzoPublicacionSocial :diapositiva="diapositiva" :formato="documento.formato" :medio="medio" :dominio="data.dominio" :guias="guias" @mover="(x, y) => { if (puedeEditar && encuadre) Object.assign(encuadre, { x, y }) }" @error="errorLienzo = $event" /></div>
          <p class="ayuda-lienzo"><Grip :size="14" /> Arrastra la fotografía o usa los controles de posición.</p>
          <div class="miniaturas-generador" aria-label="Diapositivas">
            <button v-for="(actual, posicion) in documento.diapositivas" :key="actual.id" :draggable="puedeEditar" :class="{ seleccionada: indice === posicion }" :aria-pressed="indice === posicion" :aria-label="`Editar diapositiva ${posicion + 1}: ${actual.titular}`" @click="indice = posicion" @dragstart="($event as DragEvent).dataTransfer?.setData('text/plain', String(posicion))" @dragover.prevent @drop.prevent="soltar($event, posicion)">
              <img v-if="actual.tipo === 'cta' && actual.varianteCta === 'promocional'" :src="rutaImagenCtaSocial" alt=""><img v-else-if="actual.tipo === 'noticia' && medios.find(m => m.id === actual.medioId)" :src="medios.find(m => m.id === actual.medioId)?.urlPublica" alt=""><span v-else>{{ actual.tipo === 'cta' ? 'CTA' : 'Foto' }}</span><b>{{ posicion + 1 }}</b>
            </button>
          </div>
          <div class="herramientas-diapositiva"><button :disabled="!puedeEditar || indice === 0" title="Mover antes" aria-label="Mover diapositiva antes" @click="reordenar(indice, indice - 1)"><ChevronLeft :size="17" /></button><button :disabled="!puedeEditar || indice === documento.diapositivas.length - 1" title="Mover después" aria-label="Mover diapositiva después" @click="reordenar(indice, indice + 1)"><ChevronRight :size="17" /></button><button :disabled="!puedeEditar || documento.diapositivas.length >= 8" @click="duplicar"><Copy :size="15" /> Duplicar</button><button :disabled="!puedeEditar || documento.diapositivas.length < 2" @click="eliminar"><Trash2 :size="15" /> Eliminar</button></div>
          <div class="agregar-diapositiva"><button :disabled="!puedeEditar || documento.diapositivas.length >= 8" @click="agregar('noticia')"><Plus :size="16" /> Añadir imagen</button><button :disabled="!puedeEditar || documento.diapositivas.length >= 8" @click="agregar('cta')"><Plus :size="16" /> Añadir cierre CTA</button></div>
          <button class="boton-movil" :aria-pressed="movil" @click="movil = !movil"><Smartphone :size="16" /> {{ movil ? 'Ampliar vista previa' : 'Vista previa móvil' }}</button>
        </section>
        <aside class="asistente-generador" aria-label="Asistencia editorial y exportación">
          <section class="panel-enfoque"><h2><Sparkles :size="19" /> Un motivo para leer más</h2><p>Hecho + consecuencia + contexto útil. La curiosidad debe estar respaldada por la noticia.</p><label><span>Tono editorial</span><select v-model="tono" :disabled="generando"><option value="equilibrado">Equilibrado</option><option value="informativo">Más informativo</option><option value="breve">Más breve</option><option value="narrativo">Narrativo</option></select></label><button class="boton-amarillo" :disabled="generando || !puedeEditar" @click="sugerir"><Sparkles :size="16" /> {{ generando ? 'Preparando enfoques…' : documento.propuestas.length ? 'Regenerar cinco enfoques' : 'Proponer cinco enfoques' }}</button><p class="nota-generador">Usa DeepSeek bajo solicitud. Revisa las propuestas antes de aplicarlas.</p></section>
          <section v-if="documento.propuestas.length" class="propuestas-generador"><details v-for="(propuesta, posicion) in documento.propuestas" :key="posicion"><summary>{{ propuesta.objetivo }}</summary><p><strong>{{ propuesta.titular.replaceAll('**', '') }}</strong></p><p>{{ propuesta.gancho }}</p><p>{{ propuesta.razonParaLeer }}</p><small>Sustento en la noticia</small><blockquote v-for="cita in propuesta.sustento" :key="cita">{{ cita }}</blockquote><button :disabled="!puedeEditar" @click="aplicarPropuesta(propuesta, posicion)">Usar este enfoque</button></details></section>
          <section><h2>Tipo de publicación</h2><div class="selector-tipo"><button :disabled="!puedeEditar" :aria-pressed="documento.tipo === 'unica'" @click="cambiarTipo('unica')">Imagen única</button><button :disabled="!puedeEditar" :aria-pressed="documento.tipo === 'carrusel'" @click="cambiarTipo('carrusel')">Carrusel</button></div><label><span>Preparar para</span><select v-model="documento.red"><option v-for="red in redesSociales" :key="red" :value="red">{{ nombresRed[red] }}</option></select></label><label><span>Descripción para {{ nombresRed[documento.red] }}</span><textarea v-model="documento.textos[documento.red]" :disabled="!puedeEditar" rows="7" :maxlength="documento.red === 'instagram' ? 2200 : 5000" /></label><button class="boton-claro" @click="copiar(documento.textos[documento.red])"><Copy :size="15" /> Copiar descripción</button><button v-if="documento.red !== 'instagram'" class="boton-claro" :disabled="!puedeEditar" @click="insertarEnlace">Añadir enlace de la noticia</button><details class="enlace-generador"><summary>Enlace con atribución UTM</summary><p>{{ enlace }}</p><button @click="copiar(enlace)">Copiar enlace</button></details></section>
          <section><h2>Descargar y compartir</h2><p class="nota-generador">Publicación manual: descarga la pieza y copia su descripción. No se enviará contenido a tus cuentas.</p><button class="boton-amarillo" :disabled="exportando || !!errorLienzo || !puedeEditar" @click="exportar(false)"><Download :size="17" /> {{ exportando ? 'Exportando…' : 'Descargar imagen' }}</button><button v-if="documento.tipo === 'carrusel'" class="boton-claro" :disabled="exportando || !puedeEditar" @click="exportar(true)">Descargar carrusel completo</button><p v-for="aviso in avisos" :key="aviso" class="nota-generador">{{ aviso }}</p></section>
          <section class="conexiones-generador"><h2>Conexiones de cuentas</h2><p>Facebook, Instagram y X: conexión pendiente. Canal de WhatsApp: exportación manual.</p><p>La tarea editorial aún no genera ni publica estas piezas.</p></section>
        </aside>
      </div>
    </template>
    <SelectorPortadaEditorial v-if="selectorAbierto" :seleccionado-id="diapositiva?.medioId" @cerrar="selectorAbierto = false" @seleccionar="elegirMedio" />
  </section>
</template>

<style scoped>
@font-face{font-family:MontserratSocial;src:url('/fonts/Montserrat-Bold.ttf') format('truetype');font-weight:700;font-display:swap}
.generador-redes{color:var(--navy);max-width:1800px;margin:auto}.cabecera-generador{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px}.cabecera-generador a{display:inline-flex;gap:6px;align-items:center;font-size:12px}.cabecera-generador h1{font-size:27px;letter-spacing:-.7px;margin:10px 0 6px}.cabecera-generador p{margin:0;color:var(--muted);font-size:14px}.cabecera-generador>span{font-size:12px;color:var(--muted)}.espacio-generador{display:grid;grid-template-columns:250px minmax(280px,1fr) 310px;align-items:start;gap:22px}.inspector-generador{background:var(--navy);color:white;border-radius:10px;padding:20px}.inspector-generador section,.inspector-generador fieldset{padding:0 0 22px;margin:0 0 22px;border:0;border-bottom:1px solid #ffffff24}.generador-redes h2,legend{font-size:14px;font-weight:700;margin:0 0 14px;display:flex;align-items:center;gap:8px}.titular-origen{font-size:13px;line-height:1.5;color:#e3eaff}.inspector-generador a{font-size:12px;color:#ffd800}.generador-redes label{display:block;margin:14px 0}.generador-redes label>span{font-size:12px;display:flex;justify-content:space-between;gap:8px;margin-bottom:8px}.generador-redes output{font-size:11px;padding:2px 7px;background:#ffffff18;border-radius:5px}.generador-redes input[type=range]{width:100%;accent-color:var(--yellow)}.generador-redes textarea,.generador-redes select{width:100%;border:1px solid var(--line);border-radius:6px;padding:10px;background:white;color:var(--navy);font:inherit;font-size:13px;line-height:1.5}.generador-redes textarea{resize:vertical}.inspector-generador textarea{background:#ffffff08;border-color:#ffffff40;color:white}.generador-redes button{cursor:pointer;font:inherit;font-size:12px}.generador-redes button:disabled{opacity:.5;cursor:default}.boton-oscuro,.boton-claro,.boton-amarillo{display:flex;gap:8px;align-items:center;justify-content:center;min-height:42px;padding:10px 12px;width:100%;border-radius:6px;font-weight:700!important}.boton-oscuro{background:transparent;border:1px solid #ffffff90;color:white}.boton-amarillo{background:var(--yellow);border:1px solid var(--yellow);color:var(--navy)}.boton-claro{background:white;border:1px solid var(--line);color:var(--navy);margin-top:10px}.boton-texto{display:flex;gap:8px;align-items:center;background:transparent;border:0;color:inherit;padding:8px 0}.nota-generador{font-size:11px;line-height:1.55;color:var(--muted);margin:10px 0 0}.inspector-generador .nota-generador{color:#c4d1e7}.credito-generador{font-size:11px;color:#e2ebfb}.acciones-guardar{display:grid;gap:10px}.escenario-generador{min-width:0}.barra-lienzo{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.barra-lienzo>label{margin:0}.barra-lienzo>label:first-child{font-size:11px;flex:1}.barra-lienzo select{margin-top:5px;font-size:11px}.control-guias{display:flex!important;align-items:center;gap:5px;font-size:11px}.soporte-lienzo{max-width:620px;margin:0 auto}.soporte-lienzo.vista-movil{max-width:320px}.ayuda-lienzo{display:flex;gap:6px;justify-content:center;font-size:11px;color:var(--muted);margin:12px 0 18px}.miniaturas-generador{display:flex;gap:8px;overflow:auto;padding:4px}.miniaturas-generador>button{position:relative;flex:0 0 72px;height:78px;background:var(--navy);color:var(--yellow);border:2px solid transparent;border-radius:8px;padding:0;overflow:hidden}.miniaturas-generador>button.seleccionada{border-color:#174ea6;outline:2px solid #174ea640;outline-offset:2px}.miniaturas-generador img{width:100%;height:100%;object-fit:cover}.miniaturas-generador b{position:absolute;top:4px;left:4px;background:white;color:var(--navy);border-radius:50%;width:19px;height:19px;display:grid;place-items:center;font-size:11px}.herramientas-diapositiva{display:flex;gap:8px;margin:14px 0;flex-wrap:wrap}.herramientas-diapositiva button,.agregar-diapositiva button,.boton-movil{display:flex;align-items:center;justify-content:center;gap:5px;background:white;border:1px solid var(--line);border-radius:5px;color:var(--navy);padding:8px}.agregar-diapositiva{display:flex;gap:8px;flex-wrap:wrap}.boton-movil{width:100%;margin-top:16px}.asistente-generador>section{background:white;padding:18px;border:1px solid var(--line);border-radius:9px;margin-bottom:14px}.asistente-generador .panel-enfoque{border-color:#e8cc50;background:linear-gradient(#fff6cb,white 100px)}.panel-enfoque>p{font-size:12px;line-height:1.6}.asistente-generador h2{font-size:14px}.propuestas-generador details{padding:10px 0;border-bottom:1px solid var(--line);font-size:12px}.propuestas-generador summary{cursor:pointer;font-weight:700}.propuestas-generador p{line-height:1.6}.propuestas-generador blockquote{margin:8px 0;padding:8px 10px;border-left:2px solid var(--yellow);color:var(--muted);font-size:11px}.propuestas-generador button{border:0;border-radius:4px;background:var(--soft-blue);padding:9px 12px;color:var(--navy);font-weight:700}.selector-tipo{display:flex;gap:8px}.selector-tipo button{flex:1;background:white;border:1px solid var(--line);border-radius:6px;padding:12px 4px;color:var(--navy)}.selector-tipo button[aria-pressed=true]{border-color:var(--blue);background:var(--soft-blue)}.enlace-generador{font-size:11px;margin-top:12px}.enlace-generador summary{cursor:pointer}.enlace-generador p{overflow-wrap:anywhere;line-height:1.6}.enlace-generador button{border:0;background:var(--soft-blue);padding:7px}.conexiones-generador p{font-size:11px;line-height:1.6;color:var(--muted)}.aviso-generador,.error-generador,.exito-generador{padding:12px 16px;margin:0 0 14px;font-size:13px;line-height:1.6;border-radius:5px}.aviso-generador{background:var(--soft-yellow)}.aviso-generador button{margin-left:12px;border:1px solid var(--line);padding:6px;background:white;border-radius:4px}.error-generador{background:#fff0ed;color:#9d251a}.exito-generador{background:#ebf5e6;color:#265017}@media(min-width:1800px){.espacio-generador{grid-template-columns:270px minmax(280px,1fr) 350px;gap:28px}}@media(max-width:1300px){.espacio-generador{grid-template-columns:220px minmax(240px,1fr);gap:16px}.asistente-generador{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}.asistente-generador>section{margin:0}.soporte-lienzo{max-width:520px}}@media(max-width:760px){.cabecera-generador{display:block}.cabecera-generador>span{display:block;margin-top:10px}.cabecera-generador h1{font-size:23px}.espacio-generador{display:flex;flex-direction:column}.escenario-generador{order:0;width:100%}.inspector-generador{order:1;width:100%}.asistente-generador{order:2;display:block;width:100%}.asistente-generador>section{margin-bottom:14px}.soporte-lienzo{max-width:400px}.barra-lienzo{padding-top:8px}}
</style>
