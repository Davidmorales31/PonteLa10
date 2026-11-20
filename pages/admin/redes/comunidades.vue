<script setup lang="ts">
import { ArrowLeft, Copy, Check, Download, FileText } from '@lucide/vue'
import PanelModal from '~/components/admin/ui/PanelModal.vue'
import { construirPaqueteComunidad, type CanalComunidad } from '~/utils/editorial/paqueteComunidad'

definePageMeta({ layout: 'admin', middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ title: 'Paquete para YouTube y WhatsApp | Ponte la 10', robots: 'noindex, nofollow' })

interface ArticuloFeed { id: string, slug: string, titulo: string, tituloPortada?: string | null, resumen?: string | null, publicadoEn: string, imagen?: string | null }
const { data, status, error, refresh } = await useFetch<ArticuloFeed[] | { articulos: ArticuloFeed[] }>('/api/articulos', { query: { categoria: 'futbol-colombiano', limite: 30 } })
const articulos = computed(() => {
  const lista = Array.isArray(data.value) ? data.value : (data.value?.articulos || [])
  return lista.map(articulo => ({ ...articulo, paquete: construirPaqueteComunidad(articulo) }))
})

const copiado = ref('')
const verTextos = ref<(typeof articulos.value)[number] | null>(null)
let temporizador: ReturnType<typeof setTimeout> | undefined
async function copiar(articulo: { id: string }, canal: CanalComunidad, texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = `${articulo.id}:${canal}`
    clearTimeout(temporizador)
    temporizador = setTimeout(() => { copiado.value = '' }, 2500)
  } catch {
    copiado.value = ''
  }
}
onBeforeUnmount(() => clearTimeout(temporizador))

const errorImagen = ref('')
async function descargarImagen(articulo: { slug: string, imagen?: string | null }) {
  errorImagen.value = ''
  if (!articulo.imagen) return
  try {
    const respuesta = await fetch(articulo.imagen)
    if (!respuesta.ok) throw new Error('respuesta')
    const enlace = document.createElement('a')
    const url = URL.createObjectURL(await respuesta.blob())
    enlace.href = url
    enlace.download = `${articulo.slug.slice(0, 60)}.jpg`
    enlace.click()
    URL.revokeObjectURL(url)
  } catch {
    errorImagen.value = 'No se pudo descargar la imagen aquí. Ábrela en otra pestaña y guárdala.'
    window.open(articulo.imagen, '_blank', 'noopener')
  }
}
</script>

<template>
  <div class="pagina-ajustada comunidades">
    <header class="encabezado-subpagina">
      <NuxtLink to="/admin/redes" aria-label="Volver a Redes sociales"><ArrowLeft :size="18" /></NuxtLink>
      <div>
        <h1>Paquete para YouTube y WhatsApp</h1>
        <p>Estos canales no tienen API oficial para publicar: copia el texto, descarga la imagen y pégalos en cada uno.</p>
      </div>
    </header>
    <p v-if="errorImagen" class="aviso-panel aviso-panel--alerta" role="alert">{{ errorImagen }}</p>

    <section class="zona-desplazable" aria-live="polite" aria-label="Noticias recientes">
      <div v-if="status === 'pending'" aria-label="Cargando noticias">
        <div v-for="indice in 8" :key="indice" class="esqueleto-fila" />
      </div>
      <div v-else-if="error" class="estado-vacio-compacto" role="alert">
        <h2>No pudimos cargar las noticias</h2>
        <button class="boton-panel" type="button" @click="() => refresh()">Reintentar</button>
      </div>
      <div v-else-if="!articulos.length" class="estado-vacio-compacto"><h2>No hay noticias recientes</h2></div>
      <table v-else class="tabla-densa tabla-apilable">
        <thead>
          <tr><th scope="col">Noticia</th><th scope="col"><span class="sr-only">Acciones</span></th></tr>
        </thead>
        <tbody>
          <tr v-for="articulo in articulos" :key="articulo.id">
            <td>
              <div class="noticia-comunidad">
                <img v-if="articulo.imagen" :src="articulo.imagen" alt="" loading="lazy">
                <span v-else class="sin-foto" aria-hidden="true" />
                <div>
                  <strong>{{ articulo.titulo }}</strong>
                  <small>{{ new Date(articulo.publicadoEn).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }}</small>
                </div>
              </div>
            </td>
            <td>
              <div class="acciones-comunidad">
                <button class="boton-panel" type="button" @click="copiar(articulo, 'youtube', articulo.paquete.youtube)">
                  <component :is="copiado === `${articulo.id}:youtube` ? Check : Copy" />{{ copiado === `${articulo.id}:youtube` ? 'Copiado' : 'YouTube' }}
                </button>
                <button class="boton-panel" type="button" @click="copiar(articulo, 'whatsapp', articulo.paquete.whatsapp)">
                  <component :is="copiado === `${articulo.id}:whatsapp` ? Check : Copy" />{{ copiado === `${articulo.id}:whatsapp` ? 'Copiado' : 'WhatsApp' }}
                </button>
                <button v-if="articulo.imagen" class="boton-panel" type="button" @click="descargarImagen(articulo)"><Download />Imagen</button>
                <button class="boton-panel" type="button" :aria-label="`Ver textos de ${articulo.titulo}`" @click="verTextos = articulo"><FileText />Textos</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <PanelModal :abierto="Boolean(verTextos)" :titulo="verTextos?.titulo || ''" descripcion="Textos listos para pegar en cada canal." ancho="lg" @cerrar="verTextos = null">
      <div v-if="verTextos" class="textos-comunidad">
        <h3>YouTube Comunidad</h3><pre>{{ verTextos.paquete.youtube }}</pre>
        <h3>WhatsApp</h3><pre>{{ verTextos.paquete.whatsapp }}</pre>
      </div>
      <template #pie>
        <button v-if="verTextos" class="boton-panel" type="button" @click="copiar(verTextos, 'youtube', verTextos.paquete.youtube)">Copiar YouTube</button>
        <button v-if="verTextos" class="boton-panel boton-panel--marca" type="button" @click="copiar(verTextos, 'whatsapp', verTextos.paquete.whatsapp)">Copiar WhatsApp</button>
      </template>
    </PanelModal>
  </div>
</template>

<style scoped>
.encabezado-subpagina{display:flex;gap:12px;align-items:center;color:var(--navy)}.encabezado-subpagina>a{display:grid;place-items:center;flex:none;width:36px;height:36px;border:1px solid var(--line);border-radius:7px;background:white;color:var(--navy)}.encabezado-subpagina h1{margin:0 0 2px;font-size:1.35rem}.encabezado-subpagina p{margin:0;color:var(--muted);font-size:.84rem}
.noticia-comunidad{display:flex;min-width:0;align-items:center;gap:12px}.noticia-comunidad img,.sin-foto{width:64px;height:44px;flex:none;border-radius:6px;object-fit:cover;background:var(--soft-blue)}.noticia-comunidad>div{display:grid;min-width:0;gap:2px}.noticia-comunidad strong{color:var(--navy);font-weight:750;line-height:1.3}.noticia-comunidad small{color:var(--muted);font-size:.74rem}
.acciones-comunidad{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.acciones-comunidad .boton-panel{min-height:32px;padding:0 10px;font-size:.78rem}
.textos-comunidad h3{margin:0 0 6px;font-size:.86rem}.textos-comunidad h3:not(:first-child){margin-top:14px}
pre{margin:0;padding:10px;border-radius:7px;background:var(--soft-yellow);white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:.86rem}
</style>
