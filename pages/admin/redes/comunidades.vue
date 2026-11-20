<script setup lang="ts">
import { ArrowLeft, Copy, Check, Download } from '@lucide/vue'
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
  <section class="comunidades">
    <header>
      <NuxtLink to="/admin/redes" aria-label="Volver a publicaciones para redes"><ArrowLeft :size="20" /></NuxtLink>
      <div>
        <h1>Paquete para YouTube y WhatsApp</h1>
        <p>YouTube Comunidad y la Comunidad de WhatsApp no tienen API oficial para publicar. Copia el texto, descarga la imagen y pégalos en cada canal.</p>
      </div>
    </header>
    <p v-if="errorImagen" class="aviso" role="alert">{{ errorImagen }}</p>
    <p v-if="status === 'pending'" role="status">Cargando noticias…</p>
    <div v-else-if="error" role="alert"><p>No pudimos cargar las noticias.</p><button type="button" @click="refresh()">Reintentar</button></div>
    <p v-else-if="!articulos.length">No hay noticias recientes.</p>
    <ul v-else class="lista">
      <li v-for="articulo in articulos" :key="articulo.id">
        <img v-if="articulo.imagen" :src="articulo.imagen" alt="" loading="lazy">
        <div class="cuerpo">
          <small>{{ new Date(articulo.publicadoEn).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) }}</small>
          <h2>{{ articulo.titulo }}</h2>
          <div class="acciones">
            <button type="button" @click="copiar(articulo, 'youtube', articulo.paquete.youtube)"><component :is="copiado === `${articulo.id}:youtube` ? Check : Copy" :size="16" />{{ copiado === `${articulo.id}:youtube` ? 'Copiado' : 'Copiar texto de YouTube' }}</button>
            <button type="button" @click="copiar(articulo, 'whatsapp', articulo.paquete.whatsapp)"><component :is="copiado === `${articulo.id}:whatsapp` ? Check : Copy" :size="16" />{{ copiado === `${articulo.id}:whatsapp` ? 'Copiado' : 'Copiar texto de WhatsApp' }}</button>
            <button v-if="articulo.imagen" type="button" @click="descargarImagen(articulo)"><Download :size="16" />Descargar imagen</button>
          </div>
          <details>
            <summary>Ver textos</summary>
            <h3>YouTube Comunidad</h3><pre>{{ articulo.paquete.youtube }}</pre>
            <h3>WhatsApp</h3><pre>{{ articulo.paquete.whatsapp }}</pre>
          </details>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.comunidades{max-width:900px;margin:auto;display:grid;gap:18px;color:var(--navy)}
header{display:flex;gap:14px;align-items:flex-start}header>a{display:grid;place-items:center;flex:none;width:44px;height:44px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy)}header h1{margin:0 0 4px}header p{margin:0;color:var(--muted)}
.aviso{padding:12px;border-radius:6px;background:var(--soft-yellow)}
.lista{display:grid;gap:12px;margin:0;padding:0;list-style:none}
.lista li{display:grid;grid-template-columns:120px 1fr;gap:14px;padding:14px;border:1px solid var(--line);border-radius:8px;background:white}
.lista img{width:120px;height:120px;object-fit:cover;border-radius:6px}
.cuerpo{display:grid;gap:8px;min-width:0}.cuerpo small{color:var(--muted)}.cuerpo h2{margin:0;font-size:17px}
.acciones{display:flex;flex-wrap:wrap;gap:8px}
.acciones button{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy);font:inherit;font-weight:700;cursor:pointer}
.acciones button:hover{border-color:var(--navy)}
details summary{cursor:pointer;color:var(--muted);font-size:14px}details h3{margin:10px 0 4px;font-size:14px}
pre{margin:0;padding:10px;border-radius:6px;background:var(--soft-yellow);white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:14px}
@media (max-width:640px){.lista li{grid-template-columns:1fr}.lista img{width:100%;height:180px}}
</style>
