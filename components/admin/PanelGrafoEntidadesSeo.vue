<script setup lang="ts">
import { Check, CircleHelp, Link2, LoaderCircle, Search, X } from '@lucide/vue'
import type {
  CargaRelacionesEntidadesSeo,
  TipoEntidadSeo,
  TipoRelacionEntidadSeo
} from '~/types/contenidoEditorial'

const props = defineProps<{
  articuloId: string
  deshabilitado?: boolean
}>()

const etiquetasEntidad: Record<TipoEntidadSeo, string> = {
  article: 'Artículo',
  match: 'Partido',
  team: 'Equipo',
  player: 'Jugador',
  competition: 'Competición'
}
const etiquetasRelacion: Record<TipoRelacionEntidadSeo, string> = {
  about: 'Tema principal',
  mentions: 'Mención',
  related: 'Relacionado'
}

const carga = ref<CargaRelacionesEntidadesSeo | null>(null)
const cargando = ref(false)
const guardandoClave = ref('')
const errorCarga = ref('')
const mensaje = ref('')
const busqueda = ref('')
const filtroTipo = ref<TipoEntidadSeo | ''>('')
const relacionSeleccionada = ref<TipoRelacionEntidadSeo>('related')

const relacionesGuardadas = computed(() => carga.value?.relaciones || [])
const entidadPrincipalConfirmada = computed(() => relacionesGuardadas.value
  .find(relacion => relacion.estado === 'confirmed' && relacion.relacion === 'about'))
const sugerencias = computed(() => (carga.value?.sugerencias || [])
  .filter(sugerencia => filtroTipo.value === '' || sugerencia.tipo === filtroTipo.value)
  .slice(0, 8))
const resultadosManual = computed(() => {
  const termino = normalizarBusqueda(busqueda.value)
  if (termino.length < 2) return []
  return (carga.value?.entidades || [])
    .filter(entidad => filtroTipo.value === '' || entidad.tipo === filtroTipo.value)
    .filter(entidad => !relacionesGuardadas.value.some(relacion =>
      relacion.tipo === entidad.tipo && relacion.slug === entidad.slug && relacion.estado === 'confirmed'
    ))
    .filter(entidad => normalizarBusqueda(`${entidad.nombre} ${entidad.slug}`).includes(termino))
    .slice(0, 10)
})

watch(() => props.articuloId, cargarRelaciones, { immediate: true })

async function cargarRelaciones() {
  if (!props.articuloId) return
  cargando.value = true
  errorCarga.value = ''
  try {
    carga.value = await $fetch<CargaRelacionesEntidadesSeo>(
      `/api/admin/contenidos/${encodeURIComponent(props.articuloId)}/entidades`
    )
  } catch (error: unknown) {
    errorCarga.value = obtenerMensajeError(error)
  } finally {
    cargando.value = false
  }
}

async function decidir(
  tipo: TipoEntidadSeo,
  slug: string,
  estado: 'confirmed' | 'rejected',
  relacion: TipoRelacionEntidadSeo = relacionSeleccionada.value
) {
  if (estado === 'confirmed'
    && relacion === 'about'
    && entidadPrincipalConfirmada.value
    && (entidadPrincipalConfirmada.value.tipo !== tipo || entidadPrincipalConfirmada.value.slug !== slug)) {
    errorCarga.value = 'Ya hay una entidad principal confirmada. Quítala primero para asignar otra.'
    return
  }

  const clave = `${tipo}:${slug}`
  guardandoClave.value = clave
  errorCarga.value = ''
  mensaje.value = ''
  try {
    carga.value = await $fetch<CargaRelacionesEntidadesSeo>(
      `/api/admin/contenidos/${encodeURIComponent(props.articuloId)}/entidades`,
      {
        method: 'PUT',
        body: { decisiones: [{ tipo, slug, relacion, estado }] }
      }
    )
    mensaje.value = estado === 'confirmed' ? 'Relación guardada.' : 'Sugerencia descartada.'
  } catch (error: unknown) {
    errorCarga.value = obtenerMensajeError(error)
  } finally {
    guardandoClave.value = ''
  }
}

function normalizarBusqueda(valor: string): string {
  return valor.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function obtenerMensajeError(error: unknown): string {
  const dato = error as { data?: { statusMessage?: string }, statusMessage?: string }
  return dato.data?.statusMessage || dato.statusMessage || 'No se pudieron actualizar las relaciones.'
}
</script>

<template>
  <section class="panel-grafo-entidades" aria-labelledby="titulo-grafo-entidades">
    <header class="cabecera-grafo-entidades">
      <div>
        <p class="etiqueta-panel">Enlaces estructurados</p>
        <h2 id="titulo-grafo-entidades">Entidades relacionadas</h2>
        <p>Conecta esta publicación con páginas públicas de partidos, equipos, jugadores, competiciones y artículos.</p>
      </div>
      <Link2 aria-hidden="true" />
    </header>

    <div class="ayuda-grafo-entidades">
      <CircleHelp aria-hidden="true" />
      <span>Las coincidencias son sugerencias automáticas por nombre exacto. Revisa cada una; solo las relaciones que confirmes aparecen en el artículo público.</span>
    </div>

    <div class="controles-grafo-entidades">
      <label>
        Tipo de relación
        <select v-model="relacionSeleccionada" :disabled="deshabilitado || cargando || Boolean(guardandoClave)">
          <option value="related">Relacionado</option>
          <option value="about" :disabled="Boolean(entidadPrincipalConfirmada)">Tema principal</option>
          <option value="mentions">Mención</option>
        </select>
      </label>
      <label>
        Filtrar por tipo
        <select v-model="filtroTipo" :disabled="cargando">
          <option value="">Todos</option>
          <option v-for="(etiqueta, tipo) in etiquetasEntidad" :key="tipo" :value="tipo">{{ etiqueta }}</option>
        </select>
      </label>
    </div>

    <p v-if="entidadPrincipalConfirmada" class="estado-principal-grafo">
      Tema principal: {{ entidadPrincipalConfirmada.nombre }}. Quita esta relación antes de elegir otra entidad principal.
    </p>
    <p v-else class="estado-principal-grafo">
      Esta pieza aún no tiene una entidad principal confirmada. Si la historia gira alrededor de un equipo, partido, jugador o competición, asígnala aquí; es un aviso, no bloquea la publicación.
    </p>

    <p v-if="errorCarga" class="estado-error-grafo" role="alert">{{ errorCarga }}</p>
    <p v-else-if="mensaje" class="estado-exito-grafo" role="status">{{ mensaje }}</p>
    <p v-if="cargando" class="estado-carga-grafo" role="status"><LoaderCircle class="girando" aria-hidden="true" /> Buscando entidades públicas…</p>

    <section v-if="sugerencias.length" class="lista-sugerencias-grafo" aria-labelledby="titulo-sugerencias-grafo">
      <header>
        <h3 id="titulo-sugerencias-grafo">Sugerencias para revisar</h3>
        <span>{{ sugerencias.length }}</span>
      </header>
      <article v-for="sugerencia in sugerencias" :key="`${sugerencia.tipo}:${sugerencia.slug}`">
        <div>
          <small>{{ etiquetasEntidad[sugerencia.tipo] }} · {{ Math.round(sugerencia.confianza * 100) }}% · {{ sugerencia.motivo }}</small>
          <strong>{{ sugerencia.nombre }}</strong>
        </div>
        <div class="acciones-relacion-grafo">
          <button
            type="button"
            :disabled="deshabilitado || Boolean(guardandoClave)"
            :aria-label="`Confirmar relación con ${sugerencia.nombre}`"
            @click="decidir(sugerencia.tipo, sugerencia.slug, 'confirmed')"
          >
            <Check aria-hidden="true" /> Confirmar
          </button>
          <button
            class="accion-descartar-grafo"
            type="button"
            :disabled="deshabilitado || Boolean(guardandoClave)"
            :aria-label="`Descartar sugerencia de ${sugerencia.nombre}`"
            @click="decidir(sugerencia.tipo, sugerencia.slug, 'rejected')"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      </article>
    </section>

    <section class="busqueda-entidades-grafo" aria-labelledby="titulo-busqueda-grafo">
      <h3 id="titulo-busqueda-grafo">Agregar manualmente</h3>
      <label>
        <span class="solo-lectores-pantalla">Buscar una entidad pública</span>
        <Search aria-hidden="true" />
        <input v-model="busqueda" type="search" maxlength="100" placeholder="Busca equipo, partido, jugador, competición o artículo">
      </label>
      <ul v-if="resultadosManual.length">
        <li v-for="entidad in resultadosManual" :key="`${entidad.tipo}:${entidad.slug}`">
          <span><small>{{ etiquetasEntidad[entidad.tipo] }}</small><strong>{{ entidad.nombre }}</strong></span>
          <button
            type="button"
            :disabled="deshabilitado || Boolean(guardandoClave)"
            @click="decidir(entidad.tipo, entidad.slug, 'confirmed')"
          >
            <Check aria-hidden="true" /> Vincular
          </button>
        </li>
      </ul>
      <p v-else-if="busqueda.trim().length >= 2" class="texto-vacio-grafo">No hay coincidencias disponibles para esa búsqueda.</p>
      <p v-else class="texto-vacio-grafo">Escribe al menos dos caracteres para buscar entre las páginas públicas disponibles.</p>
    </section>

    <section v-if="relacionesGuardadas.length" class="relaciones-actuales-grafo" aria-labelledby="titulo-actuales-grafo">
      <h3 id="titulo-actuales-grafo">Relaciones revisadas</h3>
      <ul>
        <li
          v-for="relacion in relacionesGuardadas"
          :key="`${relacion.tipo}:${relacion.slug}`"
          :class="{ rechazada: relacion.estado === 'rejected' }"
        >
          <span>
            <small>{{ etiquetasEntidad[relacion.tipo] }} · {{ etiquetasRelacion[relacion.relacion] }} · {{ relacion.estado === 'confirmed' ? 'Visible' : 'Descartada' }}{{ relacion.ruta ? '' : ' · destino ya no disponible' }}</small>
            <strong>{{ relacion.nombre }}</strong>
          </span>
          <button
            v-if="relacion.estado === 'confirmed'"
            type="button"
            :disabled="deshabilitado || Boolean(guardandoClave)"
            @click="decidir(relacion.tipo, relacion.slug, 'rejected', relacion.relacion)"
          >
            Quitar
          </button>
          <button
            v-else-if="relacion.ruta"
            type="button"
            :disabled="deshabilitado || Boolean(guardandoClave)"
            @click="decidir(relacion.tipo, relacion.slug, 'confirmed', relacion.relacion)"
          >
            Restaurar
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.panel-grafo-entidades { grid-column: 1 / -1; display: grid; gap: 18px; min-width: 0; border: 1px solid #dbe2ec; border-radius: 8px; background: #fff; padding: clamp(18px, 2.8vw, 28px); color: #13253d; }
.cabecera-grafo-entidades { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }
.cabecera-grafo-entidades h2 { margin: 3px 0 6px; font-size: 1.25rem; }
.cabecera-grafo-entidades p:last-child { max-width: 760px; margin: 0; color: #586980; line-height: 1.5; }
.cabecera-grafo-entidades > svg { flex: 0 0 auto; width: 22px; height: 22px; color: #2476b8; }
.ayuda-grafo-entidades { display: flex; align-items: flex-start; gap: 9px; border-radius: 7px; background: #eef6fc; padding: 12px; color: #36536f; font-size: .84rem; line-height: 1.5; }
.ayuda-grafo-entidades svg { flex: 0 0 17px; width: 17px; height: 17px; margin-top: 1px; color: #2476b8; }
.controles-grafo-entidades { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.controles-grafo-entidades label { display: grid; gap: 6px; font-size: .8rem; font-weight: 750; }
.controles-grafo-entidades select, .busqueda-entidades-grafo input { width: 100%; min-height: 42px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; padding: 8px 10px; color: #13253d; }
.estado-principal-grafo { margin: -4px 0 0; color: #586980; font-size: .82rem; line-height: 1.5; }
.lista-sugerencias-grafo, .busqueda-entidades-grafo, .relaciones-actuales-grafo { display: grid; gap: 10px; min-width: 0; }
.lista-sugerencias-grafo > header { display: flex; align-items: center; gap: 8px; }
.lista-sugerencias-grafo h3, .busqueda-entidades-grafo h3, .relaciones-actuales-grafo h3 { margin: 0; font-size: .98rem; }
.lista-sugerencias-grafo > header > span { display: grid; width: 23px; height: 23px; place-items: center; border-radius: 50%; background: #edf4fb; color: #145996; font-size: .72rem; font-weight: 850; }
.lista-sugerencias-grafo article, .relaciones-actuales-grafo li, .busqueda-entidades-grafo li { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-width: 0; border: 1px solid #e2e8f0; border-radius: 7px; padding: 11px 12px; }
.lista-sugerencias-grafo article > div:first-child, .relaciones-actuales-grafo li > span, .busqueda-entidades-grafo li > span { display: grid; gap: 4px; min-width: 0; }
.lista-sugerencias-grafo small, .relaciones-actuales-grafo small, .busqueda-entidades-grafo small { color: #61738a; font-size: .72rem; line-height: 1.4; }
.lista-sugerencias-grafo strong, .relaciones-actuales-grafo strong, .busqueda-entidades-grafo strong { overflow-wrap: anywhere; font-size: .88rem; }
.acciones-relacion-grafo { display: flex; flex: 0 0 auto; gap: 6px; }
.panel-grafo-entidades button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; border: 1px solid #bed1e4; border-radius: 6px; background: #f3f8fc; padding: 6px 10px; color: #145996; font-size: .78rem; font-weight: 800; cursor: pointer; }
.panel-grafo-entidades button:hover:not(:disabled) { border-color: #2476b8; background: #e9f4fc; }
.panel-grafo-entidades button:focus-visible { outline: 3px solid #6ccce7; outline-offset: 2px; }
.panel-grafo-entidades button:disabled { opacity: .55; cursor: wait; }
.panel-grafo-entidades button svg { width: 15px; height: 15px; }
.panel-grafo-entidades .accion-descartar-grafo { width: 36px; padding: 6px; color: #9a3440; }
.busqueda-entidades-grafo > label { position: relative; display: block; }
.busqueda-entidades-grafo > label > svg { position: absolute; top: 13px; left: 12px; width: 16px; height: 16px; color: #61738a; }
.busqueda-entidades-grafo input { padding-left: 38px; }
.busqueda-entidades-grafo ul, .relaciones-actuales-grafo ul { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.busqueda-entidades-grafo li small, .relaciones-actuales-grafo li small { display: block; }
.relaciones-actuales-grafo li.rechazada { background: #f8fafc; opacity: .82; }
.texto-vacio-grafo { margin: 0; color: #61738a; font-size: .82rem; }
.estado-error-grafo, .estado-exito-grafo, .estado-carga-grafo { display: flex; align-items: center; gap: 8px; margin: 0; border-radius: 6px; padding: 10px 12px; font-size: .82rem; }
.estado-error-grafo { background: #fff0f0; color: #9e2735; }
.estado-exito-grafo { background: #edf9f1; color: #13753a; }
.estado-carga-grafo { color: #586980; }
.estado-carga-grafo svg { width: 16px; height: 16px; }
.girando { animation: rotar-grafo 1s linear infinite; }
@keyframes rotar-grafo { to { transform: rotate(360deg); } }

@media (max-width: 620px) {
  .controles-grafo-entidades { grid-template-columns: minmax(0, 1fr); }
  .lista-sugerencias-grafo article, .relaciones-actuales-grafo li, .busqueda-entidades-grafo li { align-items: flex-start; }
  .lista-sugerencias-grafo article { flex-direction: column; }
  .acciones-relacion-grafo { width: 100%; }
  .acciones-relacion-grafo button:first-child { flex: 1; }
}
</style>
