<script setup lang="ts">
import { ArrowUpRight, Link2 } from '@lucide/vue'
import type { RelacionEntidadSeoPublica, TipoEntidadSeo } from '~/types/contenidoEditorial'
import type { EnlaceContextualSeo } from '~/types/navegacionContextualSeo'

const props = defineProps<{
  relaciones?: RelacionEntidadSeoPublica[]
  proximoPartido?: EnlaceContextualSeo | null
}>()

const etiquetas: Record<TipoEntidadSeo, string> = {
  article: 'Artículo',
  match: 'Partido',
  team: 'Equipo',
  player: 'Jugador',
  competition: 'Competición'
}

const entidadPrincipal = computed(() => props.relaciones?.find(relacion => relacion.relacion === 'about') || null)
const cluster = computed(() => (props.relaciones || [])
  .filter(relacion => relacion.tipo === 'article' && relacion.relacion === 'related')
  .slice(0, 4))
const relaciones = computed(() => (props.relaciones || [])
  .filter(relacion => relacion !== entidadPrincipal.value && !cluster.value.includes(relacion))
  .slice(0, 8))
const hayContexto = computed(() => Boolean(
  entidadPrincipal.value || cluster.value.length || relaciones.value.length || props.proximoPartido
))

function formatearFechaContextual(valor: string): string {
  const fecha = new Date(valor)
  if (!Number.isFinite(fecha.getTime())) return ''
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeZone: 'America/Bogota'
  }).format(fecha)
}
</script>

<template>
  <nav
    v-if="hayContexto"
    class="entidades-relacionadas-articulo"
    aria-labelledby="titulo-entidades-relacionadas"
  >
    <header>
      <span><Link2 aria-hidden="true" /> Contexto conectado</span>
      <h2 id="titulo-entidades-relacionadas">Sigue el contexto de esta historia</h2>
      <p>Entidad principal, lecturas del mismo tema y el próximo partido relacionado cuando hay uno verificado.</p>
    </header>
    <section v-if="entidadPrincipal" class="contexto-principal">
      <span>Entidad principal</span>
      <NuxtLink :to="entidadPrincipal.ruta">
        <strong>{{ entidadPrincipal.nombre }}</strong>
        <ArrowUpRight aria-hidden="true" />
      </NuxtLink>
    </section>
    <section v-if="proximoPartido" class="contexto-proximo-partido">
      <span>Próximo partido relacionado</span>
      <NuxtLink :to="proximoPartido.ruta">
        <strong>{{ proximoPartido.nombre }}</strong>
        <small v-if="proximoPartido.fechaIso">{{ formatearFechaContextual(proximoPartido.fechaIso) }}</small>
        <ArrowUpRight aria-hidden="true" />
      </NuxtLink>
    </section>
    <section v-if="cluster.length" class="cluster-articulos">
      <h3>Más del mismo tema</h3>
      <ul>
        <li v-for="entidad in cluster" :key="`${entidad.tipo}:${entidad.slug}`">
          <NuxtLink :to="entidad.ruta">{{ entidad.nombre }} <ArrowUpRight aria-hidden="true" /></NuxtLink>
        </li>
      </ul>
    </section>
    <ul>
      <li v-for="entidad in relaciones" :key="`${entidad.tipo}:${entidad.slug}`">
        <NuxtLink :to="entidad.ruta">
          <small>{{ etiquetas[entidad.tipo] }}</small>
          <strong>{{ entidad.nombre }}</strong>
          <ArrowUpRight aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.entidades-relacionadas-articulo {
  display: grid;
  gap: 16px;
  margin: 28px auto;
  max-width: 960px;
  border: 1px solid #294362;
  border-radius: 14px;
  background: #10243d;
  padding: clamp(18px, 3vw, 26px);
  color: #f4f7fb;
}

.entidades-relacionadas-articulo header > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #83dff6;
  font-size: .76rem;
  font-weight: 850;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.entidades-relacionadas-articulo header > span svg { width: 16px; height: 16px; }
.entidades-relacionadas-articulo h2 { margin: 8px 0 4px; font-size: clamp(1.25rem, 2vw, 1.65rem); }
.entidades-relacionadas-articulo header p { margin: 0; color: #afc2db; line-height: 1.55; }
.entidades-relacionadas-articulo ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.entidades-relacionadas-articulo li { min-width: 0; }
.entidades-relacionadas-articulo a { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 5px 10px; min-height: 68px; height: 100%; border: 1px solid #294362; border-radius: 10px; background: rgba(4, 18, 36, .45); padding: 12px; color: inherit; text-decoration: none; transition: border-color .15s ease, transform .15s ease; }
.entidades-relacionadas-articulo a:hover { border-color: #56c8e7; transform: translateY(-1px); }
.entidades-relacionadas-articulo a:focus-visible { outline: 3px solid #83dff6; outline-offset: 3px; }
.entidades-relacionadas-articulo small { grid-column: 1; color: #83dff6; font-size: .7rem; font-weight: 800; }
.entidades-relacionadas-articulo strong { grid-column: 1; overflow-wrap: anywhere; line-height: 1.35; }
.entidades-relacionadas-articulo a > svg { grid-column: 2; grid-row: 1 / span 2; width: 18px; height: 18px; color: #83dff6; }
.contexto-principal, .contexto-proximo-partido { display: grid; gap: 7px; }
.contexto-principal > span, .contexto-proximo-partido > span { color: #afc2db; font-size: .75rem; font-weight: 800; text-transform: uppercase; }
.contexto-principal a, .contexto-proximo-partido a { display: flex; min-height: 54px; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid #294362; border-radius: 10px; background: rgba(4, 18, 36, .45); padding: 12px; color: inherit; text-decoration: none; }
.contexto-proximo-partido small { margin-left: auto; color: #afc2db; }
.cluster-articulos h3 { margin: 0 0 8px; font-size: 1rem; }
.cluster-articulos ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
.cluster-articulos a { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid #294362; border-radius: 10px; background: rgba(4, 18, 36, .45); padding: 10px; color: inherit; text-decoration: none; }
.cluster-articulos a > svg, .contexto-principal a > svg, .contexto-proximo-partido a > svg { width: 18px; height: 18px; flex: 0 0 auto; color: #83dff6; }

body.tema-publico-blanco .entidades-relacionadas-articulo { border-color: #dce5f1; background: #fff; color: #13253d; }
body.tema-publico-blanco .entidades-relacionadas-articulo header p { color: #586980; }
body.tema-publico-blanco .entidades-relacionadas-articulo a, body.tema-publico-blanco .contexto-principal a, body.tema-publico-blanco .contexto-proximo-partido a, body.tema-publico-blanco .cluster-articulos a { border-color: #dce5f1; background: #f7f9fc; }
body.tema-publico-blanco .contexto-principal > span, body.tema-publico-blanco .contexto-proximo-partido > span, body.tema-publico-blanco .contexto-proximo-partido small { color: #586980; }
body.tema-publico-blanco .entidades-relacionadas-articulo header > span,
body.tema-publico-blanco .entidades-relacionadas-articulo small,
body.tema-publico-blanco .entidades-relacionadas-articulo a > svg { color: #145996; }
</style>
