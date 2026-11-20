<script setup lang="ts">
import { ArrowRight, CalendarClock, ChevronLeft, ChevronRight, Eye, ImagePlus, Plug, Plus, Search } from '@lucide/vue'
import ColaProgramadaSocial from '~/components/admin/ColaProgramadaSocial.vue'
import PanelPestanas from '~/components/admin/ui/PanelPestanas.vue'
import PanelPopover from '~/components/admin/ui/PanelPopover.vue'
import ProgramacionMasivaSocial from '~/components/admin/ProgramacionMasivaSocial.vue'
import VistaRapidaPublicacionSocial from '~/components/admin/VistaRapidaPublicacionSocial.vue'
import type { EstadoPublicacionesSociales } from '~/types/publicacionesSociales'

definePageMeta({ layout: 'admin', middleware: 'autenticacion-editorial', permisoEditorial: 'contenido.verBorradores' })
useSeoMeta({ title: 'Publicaciones para redes | Ponte la 10', robots: 'noindex, nofollow' })

const buscar = ref('')
const termino = ref('')
const pagina = ref(1)
const estado = ref('')
const pestana = ref('noticias')
const programando = ref(false)
const articuloVistaRapida = ref<string | null>(null)
const seleccion = ref<{ id: string, titulo: string }[]>([])
const { tienePermiso } = useContextoEditorial()

const { data: propias } = await useFetch('/api/admin/redes/propias')
const { data, status, error, refresh } = await useFetch('/api/admin/redes', { query: { buscar: termino, pagina } })

const etiquetasPropias: Record<string, { etiqueta: string, tono: string }> = {
  draft: { etiqueta: 'Borrador', tono: 'borrador' },
  scheduled: { etiqueta: 'Programada', tono: 'programado' },
  publishing: { etiqueta: 'Publicando…', tono: 'revision' },
  published: { etiqueta: 'Publicada', tono: 'publicado' },
  failed: { etiqueta: 'Con error', tono: 'peligro' }
}
const etiquetas: Record<string, { etiqueta: string, tono: string }> = {
  pending: { etiqueta: 'Por preparar', tono: 'borrador' },
  draft: { etiqueta: 'Borrador', tono: 'revision' },
  ready: { etiqueta: 'Listo para compartir', tono: 'programado' },
  partial: { etiqueta: 'Publicada en una red', tono: 'programado' },
  published: { etiqueta: 'Publicada', tono: 'publicado' }
}

const articulos = computed(() => data.value?.articulos.filter(actual => !estado.value || actual.estado === estado.value) || [])
const pestanas = computed(() => [
  { id: 'noticias', etiqueta: 'Noticias', conteo: data.value?.total ?? null },
  { id: 'propias', etiqueta: 'Publicaciones propias', conteo: propias.value?.publicaciones.length ?? null },
  { id: 'programadas', etiqueta: 'Programadas', oculta: !tienePermiso('contenido.editarTodos') }
])
const solicitaAprobacion = computed(() => (propias.value?.publicaciones || []).filter(p => p.solicitudAprobacion && ['draft', 'failed'].includes(p.estado)).length)

function puedeProgramar(publicaciones?: EstadoPublicacionesSociales) {
  return (['facebook', 'instagram'] as const).some(destino => !['published', 'in_progress', 'uncertain'].includes(publicaciones?.[destino]?.estado || ''))
}

function seleccionar(id: string, titulo: string) {
  const articulo = data.value?.articulos.find(item => item.id === id)
  if (!articulo || !puedeProgramar(articulo.publicaciones)) return
  if (seleccion.value.some(item => item.id === id)) seleccion.value = seleccion.value.filter(item => item.id !== id)
  else if (seleccion.value.length < 50) seleccion.value.push({ id, titulo })
}

function seleccionarPendientes() {
  for (const articulo of articulos.value.filter(item => item.estado === 'pending' && puedeProgramar(item.publicaciones))) {
    if (!seleccion.value.some(item => item.id === articulo.id) && seleccion.value.length < 50) seleccion.value.push({ id: articulo.id, titulo: articulo.titulo })
  }
}

async function cerrarVistaRapida() {
  articuloVistaRapida.value = null
  await refresh()
  seleccion.value = seleccion.value.filter(item => {
    const actual = data.value?.articulos.find(articulo => articulo.id === item.id)
    return !actual || puedeProgramar(actual.publicaciones)
  })
}

function aplicarBusqueda() {
  pagina.value = 1
  termino.value = buscar.value
}

const fechaCorta = (fecha: string | null) => fecha ? new Date(fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' }) : ''
const fechaHora = (fecha: string) => new Date(fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
</script>

<template>
  <div class="pagina-ajustada pagina-redes">
    <header class="titulo-vista-panel">
      <div>
        <h1>Redes sociales</h1>
        <p>Una noticia, una historia que merece compartirse.</p>
      </div>
      <div class="barra-herramientas">
        <PanelPopover etiqueta="Conexiones" alinear="fin">
          <template #icono><Plug aria-hidden="true" /></template>
          <nav class="menu-conexiones" aria-label="Conexiones de redes">
            <NuxtLink to="/admin/redes/cuentas">Cuentas de Facebook e Instagram</NuxtLink>
            <NuxtLink to="/admin/redes/comunidades">YouTube y WhatsApp</NuxtLink>
            <NuxtLink v-if="tienePermiso('configuracion.gestionar')" to="/admin/redes/agentes">Agentes de IA</NuxtLink>
          </nav>
        </PanelPopover>
        <NuxtLink v-if="tienePermiso('contenido.editarTodos')" to="/admin/redes/propias/nuevo" external class="boton-editorial-principal">
          <Plus aria-hidden="true" /> Nueva publicación
        </NuxtLink>
      </div>
    </header>

    <p v-if="data && !data.almacenamientoDisponible" class="aviso-panel aviso-panel--alerta">
      El editor está disponible. Para guardar borradores en el CMS falta instalar la migración social.
    </p>

    <PanelPestanas v-model="pestana" :pestanas="pestanas" etiqueta="Secciones de redes" />
    <p v-if="solicitaAprobacion && pestana !== 'propias'" class="aviso-panel aviso-panel--alerta">
      {{ solicitaAprobacion }} {{ solicitaAprobacion === 1 ? 'publicación pide' : 'publicaciones piden' }} tu aprobación.
      <button class="boton-panel" type="button" @click="pestana = 'propias'">Revisar</button>
    </p>

    <!-- Noticias -->
    <template v-if="pestana === 'noticias'">
      <section class="barra-herramientas" aria-label="Buscar y filtrar noticias">
        <form class="buscador-panel" role="search" @submit.prevent="aplicarBusqueda">
          <Search aria-hidden="true" />
          <input v-model="buscar" type="search" placeholder="Equipo, protagonista o titular" aria-label="Buscar noticia">
          <button type="submit">Buscar</button>
        </form>
        <select v-model="estado" class="campo-panel" aria-label="Estado en esta página">
          <option value="">Todos los estados</option>
          <option v-for="(item, id) in etiquetas" :key="id" :value="id">{{ item.etiqueta }}</option>
        </select>
        <button v-if="tienePermiso('contenido.editarTodos')" class="boton-panel" type="button" @click="seleccionarPendientes">
          Marcar pendientes
        </button>
      </section>

      <div v-if="seleccion.length" class="barra-seleccion" role="status">
        <span>{{ seleccion.length }} {{ seleccion.length === 1 ? 'seleccionada' : 'seleccionadas' }}</span>
        <button class="boton-editorial-principal" type="button" @click="programando = true">
          <CalendarClock aria-hidden="true" /> Programar
        </button>
        <button class="boton-panel" type="button" @click="seleccion = []">Limpiar</button>
      </div>

      <section class="zona-desplazable" aria-live="polite" aria-label="Noticias para compartir">
        <div v-if="status === 'pending'" aria-label="Cargando noticias">
          <div v-for="indice in 8" :key="indice" class="esqueleto-fila" />
        </div>
        <div v-else-if="error" class="estado-vacio-compacto" role="alert">
          <h2>No pudimos cargar las noticias</h2>
          <button class="boton-panel" type="button" @click="() => refresh()">Reintentar</button>
        </div>
        <div v-else-if="!articulos.length" class="estado-vacio-compacto">
          <h2>No hay noticias para estos filtros</h2>
        </div>
        <table v-else class="tabla-densa tabla-apilable tabla-redes">
          <thead>
            <tr>
              <th v-if="tienePermiso('contenido.editarTodos')" scope="col" class="col-marca"><span class="sr-only">Seleccionar</span></th>
              <th scope="col">Noticia</th>
              <th scope="col">Estado</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="articulo in articulos" :key="articulo.id" :class="{ marcada: seleccion.some(item => item.id === articulo.id) }">
              <td v-if="tienePermiso('contenido.editarTodos')" class="col-marca">
                <input
                  type="checkbox"
                  :checked="seleccion.some(item => item.id === articulo.id)"
                  :disabled="!puedeProgramar(articulo.publicaciones)"
                  :aria-label="`Programar: ${articulo.titulo}`"
                  @change="seleccionar(articulo.id, articulo.titulo)"
                >
              </td>
              <td>
                <div class="noticia-redes">
                  <img v-if="articulo.portada" :src="articulo.portada" alt="" loading="lazy">
                  <span v-else class="sin-foto" aria-hidden="true"><ImagePlus /></span>
                  <div>
                    <a :href="`/articulos/${articulo.slug}`" target="_blank" rel="noopener" class="titulo-noticia">{{ articulo.titulo }}</a>
                    <small>{{ articulo.categoria }} · {{ fechaCorta(articulo.publicadoEn) }}</small>
                  </div>
                </div>
              </td>
              <td><span class="chip-estado" :data-tono="(etiquetas[articulo.estado] || { tono: 'borrador' }).tono">{{ (etiquetas[articulo.estado] || { etiqueta: articulo.estado }).etiqueta }}</span></td>
              <td>
                <div class="acciones-redes">
                  <button class="boton-panel" type="button" :aria-label="`Vista rápida: ${articulo.titulo}`" aria-haspopup="dialog" @click="articuloVistaRapida = articulo.id">
                    <Eye aria-hidden="true" /> Vista rápida
                  </button>
                  <NuxtLink class="boton-panel boton-panel--marca" :to="`/admin/redes/${articulo.id}`">
                    Editar <ArrowRight aria-hidden="true" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer v-if="data" class="pie-lista">
        <span><strong>{{ data.total }}</strong> noticias · página {{ pagina }}</span>
        <div class="paginas">
          <button type="button" aria-label="Página anterior" :disabled="pagina === 1" @click="pagina--"><ChevronLeft aria-hidden="true" /></button>
          <button type="button" aria-label="Página siguiente" :disabled="pagina * 20 >= data.total" @click="pagina++"><ChevronRight aria-hidden="true" /></button>
        </div>
      </footer>
    </template>

    <!-- Publicaciones propias -->
    <section v-else-if="pestana === 'propias'" class="zona-desplazable" aria-label="Publicaciones propias">
      <div v-if="!propias?.publicaciones.length" class="estado-vacio-compacto">
        <h2>Aún no hay publicaciones propias</h2>
        <p>Crea una con «Nueva publicación»: carruseles, Reels y piezas que no salen de una noticia.</p>
      </div>
      <ul v-else class="lista-propias">
        <li v-for="propia in propias.publicaciones" :key="propia.id">
          <NuxtLink :to="`/admin/redes/propias/${propia.id}`">
            <div>
              <strong>{{ propia.titulo }}</strong>
              <small>
                <em v-if="propia.agenteId" class="etiqueta-agente">Agente IA</em>
                <em v-if="propia.solicitudAprobacion && ['draft', 'failed'].includes(propia.estado)" class="etiqueta-aprobar">Pide tu aprobación</em>
                <template v-if="propia.programadaPara">Programada · {{ fechaHora(propia.programadaPara) }}</template>
              </small>
            </div>
            <span class="chip-estado" :data-tono="(etiquetasPropias[propia.estado] || { tono: 'borrador' }).tono">{{ (etiquetasPropias[propia.estado] || { etiqueta: propia.estado }).etiqueta }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- Cola programada -->
    <section v-else class="zona-desplazable" aria-label="Publicaciones programadas">
      <ColaProgramadaSocial />
    </section>

    <ProgramacionMasivaSocial
      v-if="tienePermiso('contenido.editarTodos')"
      :abierto="programando"
      :seleccion="seleccion"
      @cerrar="programando = false"
      @limpiar="seleccion = []"
    />
    <VistaRapidaPublicacionSocial v-if="articuloVistaRapida" :key="articuloVistaRapida" :articulo-id="articuloVistaRapida" @cerrar="cerrarVistaRapida" />
  </div>
</template>

<style scoped>
.menu-conexiones { display: grid; gap: 2px; min-width: 250px; }
.menu-conexiones a { display: flex; min-height: 38px; align-items: center; border-radius: 7px; padding: 0 10px; color: #0e1b33; font-size: 0.86rem; font-weight: 650; text-decoration: none; }
.menu-conexiones a:hover { background: #f3f6fa; }
.col-marca { width: 44px; padding-right: 0 !important; }
.col-marca input { width: 17px; height: 17px; cursor: pointer; }
.tabla-redes tr.marcada { background: #eef4ff; }
.noticia-redes { display: flex; min-width: 0; align-items: center; gap: 12px; }
.noticia-redes img, .sin-foto { width: 64px; height: 44px; flex: 0 0 auto; border-radius: 6px; object-fit: cover; }
.sin-foto { display: grid; place-items: center; background: #eaf2ff; color: #1e4fb4; }
.sin-foto svg { width: 18px; height: 18px; }
.noticia-redes > div { display: grid; min-width: 0; gap: 2px; }
.titulo-noticia { display: -webkit-box; overflow: hidden; color: #071b3f; font-weight: 750; line-height: 1.3; text-decoration: none; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.titulo-noticia:hover { text-decoration: underline; }
.noticia-redes small { color: #4d5b73; font-size: 0.74rem; font-weight: 600; }
.acciones-redes { display: flex; justify-content: flex-end; gap: 6px; }
.lista-propias { margin: 0; padding: 0; list-style: none; }
.lista-propias li + li { border-top: 1px solid #edf1f6; }
.lista-propias a { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 16px; color: #071b3f; text-decoration: none; }
.lista-propias a:hover { background: #f8fbff; }
.lista-propias div { display: grid; gap: 3px; }
.lista-propias small { color: #4d5b73; font-size: 0.76rem; }
.etiqueta-agente, .etiqueta-aprobar { margin-right: 6px; border-radius: 999px; background: #e4edff; padding: 1px 8px; color: #1e4fb4; font-size: 0.7rem; font-style: normal; font-weight: 800; }
.etiqueta-aprobar { background: #fff1c6; color: #8a5a00; }
@media (max-width: 700px) {
  .acciones-redes .boton-panel:first-child { display: none; }
}
</style>
