<script setup lang="ts">
import { ArrowRight, Search, ImagePlus, Eye } from '@lucide/vue'
import VistaRapidaPublicacionSocial from '~/components/admin/VistaRapidaPublicacionSocial.vue'
import ProgramacionMasivaSocial from '~/components/admin/ProgramacionMasivaSocial.vue'
definePageMeta({ layout: 'admin', middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ title: 'Publicaciones para redes | Pont3la10', robots: 'noindex, nofollow' })
const buscar = ref(''), termino = ref(''), pagina = ref(1)
const estado = ref('')
const { tienePermiso } = useContextoEditorial()
const seleccion = ref<{ id: string, titulo: string }[]>([])
function seleccionar(id: string, titulo: string) {
  if (seleccion.value.some(item => item.id === id)) seleccion.value = seleccion.value.filter(item => item.id !== id)
  else if (seleccion.value.length < 50) seleccion.value.push({ id, titulo })
}
function seleccionarPendientes() {
  for (const articulo of articulos.value.filter(item => item.estado === 'pending')) {
    if (!seleccion.value.some(item => item.id === articulo.id) && seleccion.value.length < 50) seleccion.value.push({ id: articulo.id, titulo: articulo.titulo })
  }
}
const articuloVistaRapida = ref<string | null>(null)
const { data, status, error, refresh } = await useFetch('/api/admin/redes', { query: { buscar: termino, pagina } })
const etiquetas: Record<string, string> = { pending: 'Por preparar', draft: 'Borrador', ready: 'Listo para compartir' }
const articulos = computed(() => data.value?.articulos.filter(actual => !estado.value || actual.estado === estado.value) || [])
function aplicarBusqueda() { pagina.value = 1; termino.value = buscar.value }
</script>
<template>
  <section class="bandeja-redes">
    <header><div><h1>Publicaciones para redes</h1><p>Una noticia, una historia que merece compartirse.</p></div><NuxtLink to="/admin/redes/cuentas">Conectar cuentas</NuxtLink></header>
    <p v-if="data && !data.almacenamientoDisponible" class="aviso-redes">El editor está disponible. Para guardar borradores en el CMS falta instalar la migración social.</p>
    <form class="filtros-redes" @submit.prevent="aplicarBusqueda">
      <label><span>Buscar noticia</span><div><input v-model="buscar" type="search" placeholder="Equipo, protagonista o titular"><button type="submit" aria-label="Buscar"><Search :size="19" /></button></div></label>
      <label><span>Estado en esta página</span><select v-model="estado"><option value="">Todos</option><option v-for="(nombre, id) in etiquetas" :key="id" :value="id">{{ nombre }}</option></select></label>
    </form>
    <div v-if="tienePermiso('contenido.editarTodos')" class="seleccion-masiva"><button type="button" @click="seleccionarPendientes">Seleccionar pendientes de esta página</button><button type="button" :disabled="!seleccion.length" @click="seleccion = []">Limpiar selección</button><span>{{ seleccion.length }} seleccionadas</span></div>
    <p v-if="status === 'pending'" role="status">Cargando noticias…</p>
    <div v-else-if="error" role="alert"><p>No pudimos cargar las noticias.</p><button @click="refresh()">Reintentar</button></div>
    <p v-else-if="!articulos.length">No hay noticias para estos filtros.</p>
    <div v-else class="lista-redes">
      <article v-for="articulo in articulos" :key="articulo.id">
        <img v-if="articulo.portada" :src="articulo.portada" alt="" loading="lazy"><div v-else class="sin-foto"><ImagePlus /></div>
        <div class="datos-noticia"><small>{{ articulo.categoria }} · {{ articulo.publicadoEn ? new Date(articulo.publicadoEn).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '' }}</small><h2>{{ articulo.titulo }}</h2><p>{{ articulo.resumen }}</p><a :href="`/articulos/${articulo.slug}`" target="_blank" rel="noopener">Ver noticia ↗</a></div>
        <div class="accion-noticia"><label v-if="tienePermiso('contenido.editarTodos')" class="seleccionar-noticia"><input type="checkbox" :checked="seleccion.some(item => item.id === articulo.id)" :aria-label="`Programar: ${articulo.titulo}`" @change="seleccionar(articulo.id, articulo.titulo)">Programar</label><span :class="`estado-${articulo.estado}`">{{ etiquetas[articulo.estado] }}</span><button type="button" class="boton-vista-rapida" :aria-label="`Vista rápida: ${articulo.titulo}`" aria-haspopup="dialog" @click="articuloVistaRapida = articulo.id"><Eye :size="17" />Vista rápida</button><NuxtLink :to="`/admin/redes/${articulo.id}`">Editar publicación <ArrowRight :size="17" /></NuxtLink></div>
      </article>
    </div>
    <footer v-if="data"><button :disabled="pagina === 1" @click="pagina--">Anterior</button><span>Página {{ pagina }} · {{ data.total }} noticias</span><button :disabled="pagina * 20 >= data.total" @click="pagina++">Siguiente</button></footer>
    <ProgramacionMasivaSocial v-if="tienePermiso('contenido.editarTodos')" :seleccion="seleccion" @limpiar="seleccion = []" />
    <VistaRapidaPublicacionSocial v-if="articuloVistaRapida" :key="articuloVistaRapida" :articulo-id="articuloVistaRapida" @cerrar="articuloVistaRapida = null" />
  </section>
</template>
<style scoped>
.seleccion-masiva{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:18px 0;font-size:13px}.seleccion-masiva button{padding:12px;border:1px solid var(--line);border-radius:6px;background:white;color:var(--navy)}.seleccionar-noticia{display:flex;gap:8px;align-items:center;min-height:44px}.seleccionar-noticia input{width:18px;height:18px}.accion-noticia{flex-wrap:wrap}
.boton-vista-rapida{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:1px solid var(--line);border-radius:6px;color:var(--navy);background:white;font:inherit;font-weight:700}.boton-vista-rapida:focus-visible{outline:3px solid #2376cf;outline-offset:3px}
.bandeja-redes{max-width:1300px;margin:auto;color:var(--navy)}header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:28px}h1{font-size:30px;margin:0 0 8px}header p{color:var(--muted);margin:0}header>span{font-size:13px;border-left:3px solid var(--yellow);padding:8px 14px}.filtros-redes{display:flex;gap:20px;margin-bottom:24px}.filtros-redes label:first-child{flex:1}.filtros-redes label>span{display:block;font-size:12px;margin-bottom:7px}.filtros-redes label>div{display:flex}.filtros-redes input,.filtros-redes select{min-height:44px;border:1px solid var(--line);background:white;border-radius:6px;padding:10px;color:var(--navy)}.filtros-redes input{flex:1;min-width:0}.filtros-redes button{background:var(--navy);color:white;border:0;padding:10px 18px;border-radius:6px}.lista-redes{border-top:1px solid var(--line)}article{display:grid;grid-template-columns:160px 1fr 180px;gap:24px;padding:24px 0;border-bottom:1px solid var(--line);align-items:center}article>img,.sin-foto{width:160px;height:118px;object-fit:cover;border-radius:7px}.sin-foto{display:grid;place-items:center;background:var(--soft-blue)}small{color:var(--muted);font-size:12px}h2{font-size:18px;line-height:1.4;margin:7px 0}.datos-noticia p{font-size:13px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0 0 10px}.datos-noticia a{font-size:12px}.accion-noticia{display:grid;gap:20px;font-size:12px}.accion-noticia>span{justify-self:start;padding:5px 9px;background:var(--soft-blue);border-radius:4px}.accion-noticia .estado-ready{background:#e7f3dc}.accion-noticia a{display:flex;align-items:center;gap:8px;font-weight:700}footer{display:flex;align-items:center;justify-content:space-between;margin-top:24px;font-size:13px}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}footer button{border:1px solid var(--line);background:white;padding:10px;border-radius:5px}.aviso-redes{padding:14px;background:var(--soft-yellow)}@media(max-width:800px){article{grid-template-columns:90px 1fr;gap:14px}article>img,.sin-foto{width:90px;height:90px}.accion-noticia{grid-column:2;display:flex;align-items:center;justify-content:space-between}.filtros-redes{flex-direction:column}header{align-items:start;flex-direction:column}h1{font-size:24px}}
</style>
