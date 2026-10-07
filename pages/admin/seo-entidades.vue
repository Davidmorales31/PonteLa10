<script setup lang="ts">
import { AlertTriangle, ExternalLink, RefreshCw } from '@lucide/vue'
import type { ResultadoDetectorHuerfanasSeo } from '~/server/utils/grafoEntidadesSeo'
import type { TipoEntidadSeo } from '~/types/contenidoEditorial'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'contenido.verBorradores'
})

useSeoMeta({ title: 'Grafo de entidades | Pont3la10', robots: 'noindex, nofollow' })

const etiquetaTipo: Record<TipoEntidadSeo, string> = {
  article: 'Artículo',
  match: 'Partido',
  team: 'Equipo',
  player: 'Jugador',
  competition: 'Competición'
}
const { data, status, error, refresh } = await useFetch<ResultadoDetectorHuerfanasSeo>(
  '/api/admin/seo/grafo/orfanas',
  { key: 'admin-grafo-entidades-huerfanas', default: () => ({
    paginasPublicas: 0,
    paginasContextualmenteEnlazadas: 0,
    paginasSinEnlaceContextual: 0,
    coberturaArticulosCompleta: false,
    limiteArticulos: 1000,
    paginas: []
  }) }
)
const estaActualizando = computed(() => status.value === 'pending')

function mostrarError(valor: unknown): string {
  const dato = valor as { statusMessage?: string, data?: { statusMessage?: string } }
  return dato.data?.statusMessage || dato.statusMessage || 'No se pudo analizar el grafo público.'
}
</script>

<template>
  <div class="pagina-admin-grafo">
    <header class="cabecera-admin-grafo">
      <div>
        <p class="etiqueta-panel">SEO técnico</p>
        <h1>Grafo interno de entidades</h1>
        <p>Revisa qué páginas públicas tienen enlaces contextuales estructurados desde artículos o relaciones deportivas existentes.</p>
      </div>
      <button class="boton-editorial-secundario" type="button" :disabled="estaActualizando" @click="refresh()">
        <RefreshCw :class="{ 'girando-grafo-admin': estaActualizando }" aria-hidden="true" />
        Actualizar análisis
      </button>
    </header>

    <p class="nota-alcance-grafo">
      <AlertTriangle aria-hidden="true" />
      El detector mide enlaces contextuales estructurados; no cuenta menú, migas de pan ni sitemap como enlaces de apoyo. Los nodos de partidos, equipos y competiciones también consideran sus relaciones del calendario y la clasificación existentes.
    </p>

    <section v-if="error" class="error-admin-grafo" role="alert">
      <h2>No fue posible completar el análisis</h2>
      <p>{{ mostrarError(error) }}</p>
      <button class="boton-editorial-secundario" type="button" @click="refresh()">Intentar de nuevo</button>
    </section>

    <template v-else>
      <div class="metricas-admin-grafo" aria-live="polite">
        <article><strong>{{ data?.paginasPublicas || 0 }}</strong><span>Páginas públicas evaluadas</span></article>
        <article><strong>{{ data?.paginasContextualmenteEnlazadas || 0 }}</strong><span>Con enlace contextual</span></article>
        <article><strong>{{ data?.paginasSinEnlaceContextual || 0 }}</strong><span>Sin enlace contextual</span></article>
      </div>

      <p v-if="!data?.coberturaArticulosCompleta" class="aviso-cobertura-grafo" role="status">
        El análisis llegó al límite de {{ data?.limiteArticulos || 1000 }} artículos o un catálogo no respondió. La lista puede estar incompleta; vuelve a intentar cuando el catálogo esté disponible.
      </p>

      <section class="lista-huerfanas-grafo" aria-labelledby="titulo-lista-huerfanas">
        <header>
          <div>
            <h2 id="titulo-lista-huerfanas">Páginas sin enlaces contextuales</h2>
            <p>Hasta 200 resultados, ordenados por tipo y nombre.</p>
          </div>
          <span>{{ data?.paginas?.length || 0 }} mostradas</span>
        </header>

        <div v-if="estaActualizando" class="cargando-admin-grafo" role="status">
          <RefreshCw class="girando-grafo-admin" aria-hidden="true" /> Analizando entidades públicas…
        </div>
        <p v-else-if="!data?.paginas?.length" class="vacio-admin-grafo">
          No encontramos páginas indexables sin enlaces contextuales. El sitio mantiene una red conectada con la información disponible.
        </p>
        <ul v-else>
          <li v-for="pagina in data.paginas" :key="`${pagina.tipo}:${pagina.slug}`">
            <span>
              <small>{{ etiquetaTipo[pagina.tipo] }}</small>
              <strong>{{ pagina.nombre }}</strong>
              <code>{{ pagina.ruta }}</code>
            </span>
            <a :href="pagina.ruta" target="_blank" rel="noopener noreferrer">
              Abrir <ExternalLink aria-hidden="true" />
            </a>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.pagina-admin-grafo { display: grid; gap: 20px; max-width: 1240px; margin: 0 auto; color: #13253d; }
.cabecera-admin-grafo { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.cabecera-admin-grafo h1 { margin: 3px 0 6px; font-size: clamp(1.45rem, 3vw, 2rem); }
.cabecera-admin-grafo p:last-child { max-width: 760px; margin: 0; color: #586980; line-height: 1.55; }
.cabecera-admin-grafo button { flex: 0 0 auto; }
.cabecera-admin-grafo button svg { width: 16px; height: 16px; }
.nota-alcance-grafo, .aviso-cobertura-grafo { display: flex; align-items: flex-start; gap: 9px; margin: 0; border-radius: 7px; background: #fff8e8; padding: 13px 15px; color: #6c4b0c; font-size: .85rem; line-height: 1.5; }
.nota-alcance-grafo svg { flex: 0 0 17px; width: 17px; height: 17px; margin-top: 1px; }
.aviso-cobertura-grafo { display: block; background: #fff0f0; color: #922a36; }
.metricas-admin-grafo { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.metricas-admin-grafo article { display: grid; gap: 4px; min-height: 94px; align-content: center; border: 1px solid #dbe2ec; border-radius: 8px; background: #fff; padding: 16px; }
.metricas-admin-grafo strong { color: #145996; font-size: 1.55rem; }
.metricas-admin-grafo span { color: #586980; font-size: .83rem; }
.lista-huerfanas-grafo { display: grid; gap: 12px; border: 1px solid #dbe2ec; border-radius: 8px; background: #fff; padding: clamp(16px, 2.5vw, 24px); }
.lista-huerfanas-grafo > header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.lista-huerfanas-grafo h2 { margin: 0 0 4px; font-size: 1.1rem; }
.lista-huerfanas-grafo header p { margin: 0; color: #61738a; font-size: .82rem; }
.lista-huerfanas-grafo header > span { flex: 0 0 auto; border-radius: 999px; background: #edf4fb; padding: 6px 9px; color: #145996; font-size: .74rem; font-weight: 800; }
.lista-huerfanas-grafo ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.lista-huerfanas-grafo li { display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid #e2e8f0; border-radius: 7px; padding: 11px 13px; }
.lista-huerfanas-grafo li > span { display: grid; gap: 4px; min-width: 0; }
.lista-huerfanas-grafo small { color: #2476b8; font-size: .72rem; font-weight: 800; }
.lista-huerfanas-grafo strong { overflow-wrap: anywhere; font-size: .88rem; }
.lista-huerfanas-grafo code { color: #61738a; font-size: .75rem; overflow-wrap: anywhere; }
.lista-huerfanas-grafo li > a { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 6px; color: #145996; font-size: .78rem; font-weight: 800; text-decoration: none; }
.lista-huerfanas-grafo li > a svg { width: 14px; height: 14px; }
.cargando-admin-grafo, .vacio-admin-grafo, .error-admin-grafo { color: #586980; }
.cargando-admin-grafo { display: flex; align-items: center; gap: 8px; }
.cargando-admin-grafo svg, .girando-grafo-admin { width: 16px; height: 16px; animation: girar-admin-grafo 1s linear infinite; }
.error-admin-grafo { border: 1px solid #f0c9cd; border-radius: 8px; background: #fff5f5; padding: 18px; }
.error-admin-grafo h2, .error-admin-grafo p { margin-top: 0; }
@keyframes girar-admin-grafo { to { transform: rotate(360deg); } }

@media (max-width: 680px) {
  .cabecera-admin-grafo { display: grid; }
  .cabecera-admin-grafo button { width: fit-content; }
  .metricas-admin-grafo { grid-template-columns: minmax(0, 1fr); }
  .metricas-admin-grafo article { min-height: 76px; }
  .lista-huerfanas-grafo li { align-items: flex-start; }
}
</style>
