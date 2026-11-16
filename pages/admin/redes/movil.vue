<script setup lang="ts">
import { Camera, Video, Send, CalendarClock, ArrowLeft, Upload } from '@lucide/vue'
import type { TemporalSocialVista } from '~/utils/editorial/mediosTemporales'
import { aceptarImagenesTemporales, aceptarVideosTemporales } from '~/utils/editorial/mediosTemporales'
import type { DocumentoPropio, DocumentoVideoPropio } from '~/utils/editorial/publicacionesPropias'
import { avisosPublicacionPropia, crearDiapositivaPropia, crearDocumentoPropio, crearElementoLogo, esDocumentoVideoPropio, maximoDiapositivasPropias } from '~/utils/editorial/publicacionesPropias'

definePageMeta({ layout: false, middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ title: 'Redes rápido | Pont3la10', robots: 'noindex, nofollow' })
useHead({ link: [{ rel: 'manifest', href: '/manifest-redes.webmanifest' }, { rel: 'apple-touch-icon', href: '/brand/app-redes-180.png' }],
  meta: [{ name: 'apple-mobile-web-app-capable', content: 'yes' }, { name: 'mobile-web-app-capable', content: 'yes' }, { name: 'apple-mobile-web-app-title', content: 'Redes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, { name: 'theme-color', content: '#08204a' }] })

const route = useRoute()
const { tienePermiso } = useContextoEditorial()
const { subir, progreso, subiendo } = useSubidaTemporalSocial()
const idActual = ref<string>(typeof route.query.id === 'string' ? route.query.id : '')
const respuesta = ref<Awaited<ReturnType<typeof cargar>> | null>(null)
async function cargar(id: string) { return $fetch<{ publicacion: { titulo: string, estado: string, destinos: Array<'facebook' | 'instagram'>, revision: number, programadaPara: string | null, documento: DocumentoPropio | DocumentoVideoPropio },
  medios: Array<{ id: string, urlPublica: string }>, temporales: TemporalSocialVista[], recibos: Record<string, { estado: string, url?: string }> }>(`/api/admin/redes/propias/${id}`) }
const { data: lista, refresh: refrescarLista } = await useFetch<{ publicaciones: Array<{ id: string, titulo: string, estado: string }> }>('/api/admin/redes/propias')

const documento = ref<DocumentoPropio | DocumentoVideoPropio | null>(null)
const titulo = ref(''), destinos = ref<Array<'facebook' | 'instagram'>>(['facebook', 'instagram'])
const estado = ref('draft'), revision = ref(1), programadaPara = ref<string | null>(null)
const temporales = ref<TemporalSocialVista[]>([]), miniaturasBiblioteca = ref<Record<string, string>>({})
const recibos = ref<Record<string, { estado: string, url?: string }>>({})
const descripcion = ref(''), conLogo = ref(false), fechaProgramada = ref('')
const ocupado = ref(false), mensaje = ref(''), problema = ref('')
const esVideo = computed(() => !!documento.value && esDocumentoVideoPropio(documento.value))
const avisos = computed(() => documento.value ? avisosPublicacionPropia(documento.value, destinos.value) : [])
const editable = computed(() => tienePermiso('contenido.editarTodos') && ['draft', 'failed', 'scheduled'].includes(estado.value))
const miniaturas = computed(() => {
  const doc = documento.value
  if (!doc || esDocumentoVideoPropio(doc)) return []
  return doc.diapositivas.flatMap(d => d.medios.map(m => m.medioId)).flatMap((id) => {
    const url = temporales.value.find(t => t.id === id)?.url || (id ? miniaturasBiblioteca.value[id] : '')
    return url ? [{ id: id!, url }] : []
  })
})
const video = computed(() => {
  const doc = documento.value
  return doc && esDocumentoVideoPropio(doc) ? temporales.value.find(t => t.id === doc.video.medioId) || null : null
})

function aplicar(datos: NonNullable<typeof respuesta.value>) {
  documento.value = structuredClone(toRaw(datos.publicacion.documento))
  titulo.value = datos.publicacion.titulo; destinos.value = [...datos.publicacion.destinos]; estado.value = datos.publicacion.estado
  revision.value = datos.publicacion.revision; programadaPara.value = datos.publicacion.programadaPara
  temporales.value = datos.temporales; recibos.value = datos.recibos
  miniaturasBiblioteca.value = Object.fromEntries(datos.medios.map(m => [m.id, m.urlPublica]))
  descripcion.value = datos.publicacion.documento.textos.facebook || datos.publicacion.documento.textos.instagram
  conLogo.value = !esDocumentoVideoPropio(datos.publicacion.documento) && datos.publicacion.documento.diapositivas.every(d => d.elementos.some(e => e.tipo === 'logo'))
}
if (idActual.value) { try { respuesta.value = await cargar(idActual.value); aplicar(respuesta.value) } catch { problema.value = 'No se pudo cargar la publicación.' } }

function textoError(falla: unknown, porDefecto: string) { return (falla as { statusMessage?: string, message?: string }).statusMessage || (falla as Error)?.message || porDefecto }
const nombreAutomatico = () => `Móvil ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })}`

async function empezar(evento: Event, tipo: 'imagenes' | 'video') {
  const entrada = evento.target as HTMLInputElement
  const archivos = [...(entrada.files || [])].slice(0, tipo === 'video' ? 1 : maximoDiapositivasPropias)
  entrada.value = ''
  if (!archivos.length) return
  ocupado.value = true; problema.value = ''; mensaje.value = ''
  try {
    const creada = await $fetch<{ id: string, revision: number }>('/api/admin/redes/propias', { method: 'POST', body: { titulo: nombreAutomatico(), tipo } })
    idActual.value = creada.id
    const subidos: TemporalSocialVista[] = []
    for (const [i, archivo] of archivos.entries()) { mensaje.value = `Subiendo ${i + 1} de ${archivos.length}…`; subidos.push(await subir(archivo, creada.id)) }
    temporales.value = subidos
    documento.value = tipo === 'video'
      ? { version: 1, tipo: 'video', video: { medioId: subidos[0]!.id }, textos: { facebook: '', instagram: '' } }
      : { ...crearDocumentoPropio(), formato: 'vertical', diapositivas: subidos.map(s => crearDiapositivaPropia('una', [s.id])) }
    titulo.value = nombreAutomatico(); revision.value = creada.revision; estado.value = 'draft'; recibos.value = {}; mensaje.value = ''
    await guardar()
    await navigateTo({ query: { id: creada.id } }, { replace: true })
  } catch (falla) { problema.value = textoError(falla, 'No se pudo subir. Inténtalo de nuevo con buena señal.') } finally { ocupado.value = false }
}

function prepararDocumento() {
  const doc = documento.value
  if (!doc) return null
  doc.textos.facebook = descripcion.value; doc.textos.instagram = descripcion.value.slice(0, 2200)
  if (!esDocumentoVideoPropio(doc)) {
    for (const diapositiva of doc.diapositivas) {
      const tiene = diapositiva.elementos.some(e => e.tipo === 'logo')
      if (conLogo.value && !tiene) diapositiva.elementos.push(crearElementoLogo())
      if (!conLogo.value && tiene) diapositiva.elementos = diapositiva.elementos.filter(e => e.tipo !== 'logo')
    }
  }
  return doc
}
async function guardar(): Promise<boolean> {
  const doc = prepararDocumento()
  if (!doc || !idActual.value) return false
  try {
    const guardado = await $fetch<{ publicacion: { revision: number, estado: string, programadaPara: string | null }, temporales: TemporalSocialVista[] }>(`/api/admin/redes/propias/${idActual.value}`,
      { method: 'PUT', body: { titulo: titulo.value, documento: doc, destinos: destinos.value, revision: revision.value } })
    revision.value = guardado.publicacion.revision; estado.value = guardado.publicacion.estado; programadaPara.value = guardado.publicacion.programadaPara
    temporales.value = guardado.temporales
    return true
  } catch (falla) { problema.value = textoError(falla, 'No se pudo guardar.'); return false }
}
function alternarDestino(destino: 'facebook' | 'instagram') {
  destinos.value = destinos.value.includes(destino) ? destinos.value.filter(d => d !== destino) : [...destinos.value, destino]
}
async function publicarAhora() {
  if (!destinos.value.length) { problema.value = 'Elige al menos una red.'; return }
  if (!window.confirm(`¿Publicar ahora en ${destinos.value.map(d => d === 'facebook' ? 'Facebook' : 'Instagram').join(' e ')}? No se puede deshacer.`)) return
  ocupado.value = true; problema.value = ''; mensaje.value = ''
  try {
    if (!(await guardar())) return
    for (const destino of destinos.value) {
      if (recibos.value[destino]?.estado === 'published') continue
      mensaje.value = `Publicando en ${destino === 'facebook' ? 'Facebook' : 'Instagram'}… (un vídeo puede tardar un par de minutos)`
      const resultado = await $fetch<{ estado: string, url?: string, aviso?: string }>(`/api/admin/redes/propias/${idActual.value}/publicar`,
        { method: 'POST', body: { destino, revision: revision.value, confirmar: true } })
      recibos.value = { ...recibos.value, [destino]: { estado: resultado.estado, url: resultado.url } }
      if (resultado.aviso) mensaje.value = resultado.aviso
    }
    const actual = await cargar(idActual.value); aplicar(actual)
    mensaje.value = estado.value === 'published' ? '¡Publicada! Los archivos temporales ya se borraron.' : mensaje.value || 'Listo.'
    await refrescarLista()
  } catch (falla) { problema.value = textoError(falla, 'No se pudo publicar.') } finally { ocupado.value = false }
}
async function programar() {
  if (!fechaProgramada.value) { problema.value = 'Elige fecha y hora.'; return }
  ocupado.value = true; problema.value = ''; mensaje.value = ''
  try {
    if (!(await guardar())) return
    const programada = await $fetch<{ estado: string, programadaPara: string | null }>(`/api/admin/redes/propias/${idActual.value}/programar`,
      { method: 'POST', body: { fecha: new Date(`${fechaProgramada.value}:00-05:00`).toISOString(), revision: revision.value, confirmar: true } })
    estado.value = programada.estado; programadaPara.value = programada.programadaPara
    mensaje.value = 'Programada. Se publicará sola a esa hora (hora de Colombia).'
    await refrescarLista()
  } catch (falla) { problema.value = textoError(falla, 'No se pudo programar.') } finally { ocupado.value = false }
}
async function cancelarProgramacion() {
  ocupado.value = true
  try { await $fetch(`/api/admin/redes/propias/${idActual.value}/cancelar`, { method: 'POST', body: {} }); estado.value = 'draft'; programadaPara.value = null; mensaje.value = 'Programación cancelada.' }
  catch (falla) { problema.value = textoError(falla, 'No se pudo cancelar.') } finally { ocupado.value = false }
}
async function abrir(id: string) { await navigateTo({ query: { id } }); window.location.reload() }
const etiquetas: Record<string, string> = { draft: 'Borrador', scheduled: 'Programada', publishing: 'Publicando…', published: 'Publicada', failed: 'Con error' }
</script>

<template>
  <main class="movil">
    <header>
      <NuxtLink v-if="idActual" to="/admin/redes/movil" external aria-label="Inicio"><ArrowLeft :size="22" /></NuxtLink>
      <h1>Redes · Pont3la10</h1>
      <NuxtLink to="/admin/redes" class="escritorio">Panel completo</NuxtLink>
    </header>
    <p v-if="problema" class="aviso error" role="alert">{{ problema }}</p>
    <p v-else-if="mensaje || subiendo" class="aviso" role="status">{{ subiendo ? `Subiendo… ${progreso} %` : mensaje }}</p>

    <template v-if="!documento">
      <p v-if="!tienePermiso('contenido.editarTodos')" class="aviso error">No tienes permiso para crear publicaciones.</p>
      <div v-else class="elegir">
        <label class="boton grande"><Camera :size="26" aria-hidden="true" />Subir foto(s)<input type="file" :accept="aceptarImagenesTemporales" multiple :disabled="ocupado" @change="empezar($event, 'imagenes')"></label>
        <label class="boton grande"><Video :size="26" aria-hidden="true" />Subir video / Reel<input type="file" :accept="aceptarVideosTemporales" :disabled="ocupado" @change="empezar($event, 'video')"></label>
        <small>Se suben directo desde tu teléfono a un almacenamiento temporal y se borran al publicar. Varias fotos forman un carrusel.</small>
      </div>
      <section v-if="lista?.publicaciones.length" class="recientes"><h2>Recientes</h2>
        <ul><li v-for="item in lista.publicaciones" :key="item.id"><a :href="`/admin/redes/movil?id=${item.id}`" @click.prevent="abrir(item.id)"><strong>{{ item.titulo }}</strong><span>{{ etiquetas[item.estado] }}</span></a></li></ul>
      </section>
    </template>

    <template v-else>
      <section class="vista" aria-label="Contenido">
        <video v-if="video" :src="video.url" controls playsinline preload="metadata" />
        <div v-else-if="miniaturas.length" class="fotos"><img v-for="foto in miniaturas" :key="foto.id" :src="foto.url" alt="Imagen de la publicación"></div>
        <p v-else class="aviso">No se puede mostrar la vista previa (los archivos temporales ya se borraron o aún no hay archivo).</p>
        <span class="estado" :class="`e-${estado}`">{{ etiquetas[estado] }}</span>
      </section>
      <fieldset :disabled="!editable || ocupado">
        <label>Descripción (Facebook e Instagram)<textarea v-model="descripcion" rows="5" maxlength="2200" placeholder="Escribe el texto de la publicación" /></label>
        <div class="redes"><label><input type="checkbox" :checked="destinos.includes('facebook')" @change="alternarDestino('facebook')">Facebook</label><label><input type="checkbox" :checked="destinos.includes('instagram')" @change="alternarDestino('instagram')">Instagram</label></div>
        <template v-if="!esVideo && documento && !esDocumentoVideoPropio(documento)">
          <label>Formato<select v-model="documento.formato"><option value="vertical">Vertical 4:5 (recomendado)</option><option value="cuadrado">Cuadrado</option><option value="web">Horizontal (solo Facebook)</option></select></label>
          <label class="casilla"><input v-model="conLogo" type="checkbox">Poner el logo de Pont3la10</label>
          <NuxtLink :to="`/admin/redes/propias/${idActual}`" external class="enlace">Editar con más detalle (posición, texto, plantillas)</NuxtLink>
        </template>
      </fieldset>
      <ul v-if="avisos.length && editable" class="avisos"><li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li></ul>
      <p v-for="(recibo, red) in recibos" :key="red" class="recibo">{{ red === 'facebook' ? 'Facebook' : 'Instagram' }}: {{ recibo.estado === 'published' ? 'publicada' : recibo.estado }} <a v-if="recibo.url" :href="recibo.url" target="_blank" rel="noopener noreferrer">ver</a></p>
      <div v-if="editable" class="acciones">
        <button type="button" class="primario" :disabled="ocupado || avisos.length > 0 || estado === 'scheduled'" @click="publicarAhora"><Send :size="18" />Publicar ahora</button>
        <div v-if="estado === 'scheduled'" class="programada"><p>Programada: {{ programadaPara ? new Date(programadaPara).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '' }}</p><button type="button" :disabled="ocupado" @click="cancelarProgramacion">Cancelar programación</button></div>
        <div v-else class="programar"><label>Programar (hora Colombia)<input v-model="fechaProgramada" type="datetime-local"></label><button type="button" :disabled="ocupado || avisos.length > 0" @click="programar"><CalendarClock :size="18" />Programar</button></div>
        <button type="button" :disabled="ocupado" @click="guardar().then(ok => { if (ok) mensaje = 'Guardado.' })"><Upload :size="18" />Guardar borrador</button>
      </div>
    </template>
  </main>
</template>

<style scoped>
.movil{min-height:100dvh;padding:max(16px,env(safe-area-inset-top)) 16px max(24px,env(safe-area-inset-bottom));max-width:560px;margin:auto;color:#08204a;background:#f4f7fb;font-family:system-ui,-apple-system,sans-serif}
header{display:flex;align-items:center;gap:12px;margin-bottom:16px}header h1{flex:1;margin:0;font-size:20px}header a{color:#08204a}.escritorio{font-size:13px}
.aviso{padding:12px;border-radius:8px;background:#fff6c2;margin:0 0 14px}.aviso.error{background:#fde2e2}
.elegir{display:grid;gap:14px}.elegir small{color:#4a5a73}
.boton{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:14px;border-radius:12px;background:#08204a;color:white;font-weight:700;font-size:17px;cursor:pointer}.boton input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}
.recientes{margin-top:28px}.recientes h2{font-size:16px}.recientes ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}.recientes a{display:flex;justify-content:space-between;gap:10px;padding:14px;background:white;border-radius:10px;color:#08204a;text-decoration:none}.recientes span{font-size:12px;color:#4a5a73}
.vista{position:relative;margin-bottom:14px}.vista video{width:100%;max-height:60dvh;border-radius:12px;background:black}.fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}.fotos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px}
.estado{display:inline-block;margin-top:8px;padding:4px 10px;border-radius:999px;background:#dde7f7;font-size:12px}.e-published{background:#e1f3d4}.e-failed{background:#fde2e2}.e-scheduled{background:#fff0a8}
fieldset{border:0;padding:0;margin:0 0 14px;display:grid;gap:14px}fieldset label{display:grid;gap:6px;font-size:14px}
textarea,select,input[type=datetime-local]{width:100%;box-sizing:border-box;padding:12px;border:1px solid #c5d0e0;border-radius:10px;background:white;color:#08204a;font:inherit;font-size:16px}
.redes{display:flex;gap:18px}.redes label,.casilla{display:flex!important;align-items:center;gap:8px;min-height:44px}.enlace{font-size:14px;color:#08204a}
.acciones{display:grid;gap:12px}.acciones button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:12px;border:1px solid #08204a;border-radius:12px;background:white;color:#08204a;font:inherit;font-weight:700;font-size:16px}.acciones .primario{background:#08204a;color:white}button:disabled{opacity:.5}
.programar{display:grid;gap:8px}.programada p{margin:0 0 8px}.avisos{margin:0 0 12px;padding:12px 12px 12px 28px;background:#fff6c2;border-radius:8px;font-size:14px}.recibo{margin:0 0 8px;font-size:14px}
</style>
