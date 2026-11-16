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
const mostrarProgramar = ref(false)
const ocupado = ref(false), mensaje = ref(''), problema = ref('')
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
      <NuxtLink v-if="idActual" to="/admin/redes/movil" external aria-label="Inicio"><ArrowLeft :size="20" /></NuxtLink>
      <h1>Redes · Pont3la10</h1>
      <NuxtLink to="/admin/redes" class="escritorio">Panel</NuxtLink>
    </header>
    <p v-if="problema" class="aviso error" role="alert">{{ problema }}</p>
    <p v-else-if="mensaje || subiendo" class="aviso" role="status">{{ subiendo ? `Subiendo… ${progreso} %` : mensaje }}</p>

    <template v-if="!documento">
      <p v-if="!tienePermiso('contenido.editarTodos')" class="aviso error">No tienes permiso para crear publicaciones.</p>
      <div v-else class="elegir">
        <label class="boton"><Camera :size="24" aria-hidden="true" />Foto(s)<input type="file" :accept="aceptarImagenesTemporales" multiple :disabled="ocupado" @change="empezar($event, 'imagenes')"></label>
        <label class="boton"><Video :size="24" aria-hidden="true" />Video / Reel<input type="file" :accept="aceptarVideosTemporales" :disabled="ocupado" @change="empezar($event, 'video')"></label>
      </div>
      <small class="nota">Se suben directo desde tu teléfono y se borran al publicar. Varias fotos = carrusel.</small>
      <section v-if="lista?.publicaciones.length" class="recientes"><h2>Recientes</h2>
        <ul><li v-for="item in lista.publicaciones.slice(0, 8)" :key="item.id"><a :href="`/admin/redes/movil?id=${item.id}`" @click.prevent="abrir(item.id)"><strong>{{ item.titulo }}</strong><span>{{ etiquetas[item.estado] }}</span></a></li></ul>
      </section>
    </template>

    <template v-else>
      <div class="cuerpo">
        <section class="vista" aria-label="Contenido">
          <video v-if="video" :src="video.url" controls playsinline preload="metadata" />
          <div v-else-if="miniaturas.length" class="fotos"><img v-for="foto in miniaturas" :key="foto.id" :src="foto.url" alt="Imagen de la publicación"></div>
          <p v-else class="nota">Sin vista previa (los archivos temporales ya se borraron o aún no hay archivo).</p>
          <span class="estado" :class="`e-${estado}`">{{ etiquetas[estado] }}</span>
        </section>
        <fieldset :disabled="!editable || ocupado">
          <textarea v-model="descripcion" rows="3" maxlength="2200" placeholder="Descripción (Facebook e Instagram)" aria-label="Descripción" />
          <div class="opciones">
            <label class="chip"><input type="checkbox" :checked="destinos.includes('facebook')" @change="alternarDestino('facebook')">Facebook</label>
            <label class="chip"><input type="checkbox" :checked="destinos.includes('instagram')" @change="alternarDestino('instagram')">Instagram</label>
            <template v-if="documento && !esDocumentoVideoPropio(documento)">
              <label class="chip"><input v-model="conLogo" type="checkbox">Logo</label>
              <select v-model="documento.formato" aria-label="Formato"><option value="vertical">4:5</option><option value="cuadrado">1:1</option><option value="web">Horizontal</option></select>
            </template>
          </div>
        </fieldset>
        <ul v-if="avisos.length && editable" class="avisos"><li v-for="aviso in avisos" :key="aviso">{{ aviso }}</li></ul>
        <p v-for="(recibo, red) in recibos" :key="red" class="recibo">{{ red === 'facebook' ? 'Facebook' : 'Instagram' }}: {{ recibo.estado === 'published' ? 'publicada' : recibo.estado }} <a v-if="recibo.url" :href="recibo.url" target="_blank" rel="noopener noreferrer">ver</a></p>
        <p v-if="estado === 'scheduled'" class="recibo">Programada: {{ programadaPara ? new Date(programadaPara).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '' }}</p>
        <NuxtLink v-if="documento && !esDocumentoVideoPropio(documento)" :to="`/admin/redes/propias/${idActual}`" external class="enlace">Editor detallado</NuxtLink>
      </div>
      <div v-if="editable" class="barra">
        <div v-if="mostrarProgramar && estado !== 'scheduled'" class="fila"><input v-model="fechaProgramada" type="datetime-local" aria-label="Fecha y hora (Colombia)"><button type="button" class="primario" :disabled="ocupado || avisos.length > 0" @click="programar"><CalendarClock :size="18" />OK</button></div>
        <div class="fila">
          <button v-if="estado !== 'scheduled'" type="button" class="primario" :disabled="ocupado || avisos.length > 0" @click="publicarAhora"><Send :size="18" />Publicar</button>
          <button v-if="estado === 'scheduled'" type="button" class="primario" :disabled="ocupado" @click="cancelarProgramacion">Cancelar programación</button>
          <button v-else type="button" :disabled="ocupado" aria-label="Programar" @click="mostrarProgramar = !mostrarProgramar"><CalendarClock :size="18" />Programar</button>
          <button type="button" :disabled="ocupado" aria-label="Guardar borrador" @click="guardar().then(ok => { if (ok) mensaje = 'Guardado.' })"><Upload :size="18" /></button>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.movil{display:flex;flex-direction:column;height:100dvh;box-sizing:border-box;padding:max(10px,env(safe-area-inset-top)) 12px max(10px,env(safe-area-inset-bottom));max-width:560px;margin:auto;color:#08204a;background:#f4f7fb;font-family:system-ui,-apple-system,sans-serif;font-size:15px}
header{display:flex;align-items:center;gap:10px;margin-bottom:8px}header h1{flex:1;margin:0;font-size:17px}header a{color:#08204a;display:grid;place-items:center;min-width:32px;min-height:32px}.escritorio{font-size:13px}
.aviso{padding:8px 10px;border-radius:8px;background:#fff6c2;margin:0 0 8px;font-size:13px}.aviso.error{background:#fde2e2}.nota{color:#4a5a73;font-size:12px}
.elegir{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
.boton{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:84px;padding:10px;border-radius:12px;background:#08204a;color:white;font-weight:700;font-size:15px;cursor:pointer}.boton input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}
.recientes{margin-top:10px;min-height:0;display:flex;flex-direction:column}.recientes h2{font-size:14px;margin:0 0 6px}.recientes ul{list-style:none;margin:0;padding:0;display:grid;gap:6px;overflow-y:auto}.recientes a{display:flex;justify-content:space-between;gap:8px;padding:10px;background:white;border-radius:10px;color:#08204a;text-decoration:none;font-size:14px}.recientes span{font-size:12px;color:#4a5a73;white-space:nowrap}
.cuerpo{flex:1;min-height:0;overflow-y:auto;display:grid;align-content:start;gap:8px}
.vista{display:flex;align-items:center;gap:10px}.vista video{height:22dvh;max-width:55%;border-radius:10px;background:black;object-fit:contain}.fotos{display:flex;gap:6px;overflow-x:auto;flex:1}.fotos img{height:22dvh;width:auto;max-width:44vw;aspect-ratio:auto;object-fit:cover;border-radius:8px}
.estado{padding:3px 10px;border-radius:999px;background:#dde7f7;font-size:12px;white-space:nowrap}.e-published{background:#e1f3d4}.e-failed{background:#fde2e2}.e-scheduled{background:#fff0a8}
fieldset{border:0;padding:0;margin:0;display:grid;gap:8px}
textarea,select,input[type=datetime-local]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #c5d0e0;border-radius:10px;background:white;color:#08204a;font:inherit;font-size:16px}textarea{resize:none}
.opciones{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.opciones select{width:auto;padding:8px;font-size:14px}.chip{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 12px;border:1px solid #c5d0e0;border-radius:999px;background:white;font-size:14px}
.enlace{font-size:13px;color:#08204a}.avisos{margin:0;padding:8px 8px 8px 24px;background:#fff6c2;border-radius:8px;font-size:13px}.recibo{margin:0;font-size:13px}
.barra{padding-top:8px;display:grid;gap:8px}.fila{display:flex;gap:8px}.fila input{flex:1}
.barra button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:0 14px;border:1px solid #08204a;border-radius:12px;background:white;color:#08204a;font:inherit;font-weight:700;font-size:15px}.barra .primario{flex:1;background:#08204a;color:white}button:disabled{opacity:.5}
</style>
