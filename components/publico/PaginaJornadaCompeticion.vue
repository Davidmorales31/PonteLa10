<script setup lang="ts">
import PartidoCompeticionCard from '~/components/publico/PartidoCompeticionCard.vue'
import PublicidadAdsterraSlot from '~/components/publicidad/AdsterraSlot.vue'
import type { FichaJornadaCompeticionPublica } from '~/server/utils/competicionesPublicas'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { construirUrlAbsoluta } from '~/utils/seo'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

const propiedades = defineProps<{ slug: string, temporada: string, jornada: string }>()
const configuracion = useRuntimeConfig()
const endpoint = computed(() => `/api/jornadas/${encodeURIComponent(propiedades.slug)}/${encodeURIComponent(propiedades.temporada)}/${encodeURIComponent(propiedades.jornada)}`)
const clave = computed(() => `jornada-${propiedades.slug}-${propiedades.temporada}-${propiedades.jornada}`)
const { data: ficha, error } = await useFetch<FichaJornadaCompeticionPublica>(endpoint, { key: clave })

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 503,
    statusMessage: error.value.statusMessage || 'No fue posible cargar la jornada.'
  })
}

const tituloPagina = computed(() => ficha.value
  ? `${ficha.value.jornada.nombre} de ${ficha.value.competencia.nombre} ${ficha.value.temporada}: partidos y resultados | Pont3la10`
  : 'Jornada de fútbol colombiano | Pont3la10')
const descripcionPagina = computed(() => ficha.value
  ? `Consulta los ${ficha.value.partidos.length} partidos completos de ${ficha.value.jornada.nombre} en ${ficha.value.competencia.nombre} ${ficha.value.temporada}, con horarios de Colombia y resultados confirmados.`
  : 'Calendario y resultados de las jornadas del fútbol colombiano.')
const rutaCanonica = computed(() => ficha.value?.ruta || `/jornadas/${encodeURIComponent(propiedades.slug)}/${encodeURIComponent(propiedades.temporada)}/${encodeURIComponent(propiedades.jornada)}`)
const urlCompeticion = computed(() => `/competiciones/${encodeURIComponent(propiedades.slug)}`)
const urlTemporada = computed(() => ficha.value?.rutaCompeticionTemporada
  || `/competiciones/${encodeURIComponent(propiedades.slug)}/${encodeURIComponent(propiedades.temporada)}`)
const datosEstructurados = computed(() => {
  if (!ficha.value) return undefined
  const url = construirUrlAbsoluta(String(configuracion.public.siteUrl), rutaCanonica.value)
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${ficha.value.jornada.nombre} · ${ficha.value.competencia.nombre} ${ficha.value.temporada}`,
      description: descripcionPagina.value,
      inLanguage: 'es-CO',
      url,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: ficha.value.partidos.length,
        itemListElement: ficha.value.partidos.map((partido, indice) => ({
          '@type': 'ListItem',
          position: indice + 1,
          name: `${partido.local} vs ${partido.visitante}`,
          url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/partidos/${partido.slug}`)
        }))
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
        { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') },
        { '@type': 'ListItem', position: 3, name: ficha.value.competencia.nombre, item: construirUrlAbsoluta(String(configuracion.public.siteUrl), urlCompeticion.value) },
        { '@type': 'ListItem', position: 4, name: `Temporada ${ficha.value.temporada}`, item: construirUrlAbsoluta(String(configuracion.public.siteUrl), urlTemporada.value) },
        { '@type': 'ListItem', position: 5, name: ficha.value.jornada.nombre, item: url }
      ]
    }
  ]
})

useSeoPont3la10(() => ({
  titulo: tituloPagina.value,
  descripcion: descripcionPagina.value,
  rutaCanonica: rutaCanonica.value,
  seccion: 'Fútbol colombiano',
  datosEstructurados: datosEstructurados.value
}))

function rutaEquipoPartido(partido: PartidoSeoPublico, local: boolean): string | null {
  const slug = local ? partido.equipoLocalSlug : partido.equipoVisitanteSlug
  return slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? `/equipos/${encodeURIComponent(slug)}` : null
}

function fechaPartido(fecha: string, hora = true): string {
  if (!Number.isFinite(Date.parse(fecha))) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', ...(hora ? { timeStyle: 'short' as const } : {}), timeZone: 'America/Bogota'
  }).format(new Date(fecha))
}

function fechaCompleta(fecha: string): string {
  if (!Number.isFinite(Date.parse(fecha))) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(new Date(fecha))
}

function etiquetaEstado(estado: string | null): string {
  return etiquetaEstadoSeoPartido(estado)
}

function marcador(partido: PartidoSeoPublico): string {
  return partido.golesLocal !== null && partido.golesVisitante !== null
    ? `${partido.golesLocal}–${partido.golesVisitante}`
    : 'vs'
}

function nombreEquipo(partido: PartidoSeoPublico, local: boolean): string {
  return local ? partido.local : partido.visitante
}

function escudoEquipo(partido: PartidoSeoPublico, local: boolean): string | null {
  return local ? partido.escudoLocal : partido.escudoVisitante
}

function iniciales(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(palabra => palabra[0]).join('').toLocaleUpperCase('es-CO')
}

function fechaActualizacion(fecha: string): string {
  return fechaPartido(fecha)
}
</script>

<template>
  <main v-if="ficha" class="pagina-contenido pagina-publica-medio modulo-futbol-colombia pagina-jornada-competicion">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><NuxtLink to="/liga-colombiana">Liga colombiana</NuxtLink></li>
        <li><NuxtLink :to="urlCompeticion">{{ ficha.competencia.nombre }}</NuxtLink></li>
        <li><NuxtLink :to="urlTemporada">Temporada {{ ficha.temporada }}</NuxtLink></li>
        <li><span class="miga-actual" aria-current="page">{{ ficha.jornada.nombre }}</span></li>
      </ol>
    </nav>

    <header class="cabecera-pagina cabecera-noticias-medio cabecera-jornada">
      <p class="etiqueta-seccion">FÚTBOL COLOMBIANO · {{ ficha.competencia.nombre }} · {{ ficha.temporada }}</p>
      <h1>{{ ficha.jornada.nombre }} de {{ ficha.competencia.nombre }} {{ ficha.temporada }}</h1>
      <p>Calendario completo de {{ ficha.partidos.length }} encuentros, con fecha y hora de Colombia, estado y marcador cuando está confirmado.</p>
      <NuxtLink class="enlace-regreso-jornada" :to="urlTemporada">Ver calendario completo de la temporada <span aria-hidden="true">→</span></NuxtLink>
    </header>

    <section class="resumen-jornada" aria-label="Resumen de la jornada">
      <div><strong>{{ ficha.partidos.length }}</strong><span>partidos programados</span></div>
      <div><strong>{{ ficha.equipos }}</strong><span>equipos participantes</span></div>
      <div><strong>{{ fechaPartido(ficha.desde, false) }}</strong><span>primer día de competencia</span></div>
    </section>

    <section class="bloque-jornada panel-jornada" aria-labelledby="titulo-partidos-jornada">
      <header class="encabezado-jornada">
        <div><p class="etiqueta-seccion">FIXTURES VERIFICADOS</p><h2 id="titulo-partidos-jornada">Partidos de {{ ficha.jornada.nombre }}</h2></div>
        <span>{{ fechaPartido(ficha.desde, false) }}<template v-if="fechaPartido(ficha.desde, false) !== fechaPartido(ficha.hasta, false)"> – {{ fechaPartido(ficha.hasta, false) }}</template></span>
      </header>
      <ul class="lista-partidos-jornada">
        <li v-for="partido in ficha.partidos" :key="partido.slug">
          <PartidoCompeticionCard
            :partido="partido"
            :fecha-completa="fechaCompleta"
            :fecha-partido="fechaPartido"
            :etiqueta-estado="etiquetaEstado"
            :marcador="marcador"
            :ruta-equipo-partido="rutaEquipoPartido"
            :nombre-equipo="nombreEquipo"
            :escudo-equipo="escudoEquipo"
            :iniciales="iniciales"
          />
        </li>
      </ul>
    </section>

    <PublicidadAdsterraSlot formato="leaderboard" :contexto="`${ficha.jornada.nombre} de ${ficha.competencia.nombre}`" />

    <p class="fuente-jornada">La agenda y los resultados se muestran con la información pública verificada de DIMAYOR. Última actualización: {{ fechaActualizacion(ficha.actualizadaEn) }} (hora de Colombia).</p>
  </main>
</template>

<style scoped>
.pagina-jornada-competicion { max-width: 1180px; margin-inline: auto; }
.cabecera-jornada { margin-bottom: 20px; padding: clamp(22px, 4vw, 38px); border-radius: 16px; background: linear-gradient(125deg, #0b2341, #103c62 58%, #0b2341); }
.cabecera-jornada .etiqueta-seccion { color: #ffd343; }
.cabecera-jornada h1, .cabecera-jornada > p:not(.etiqueta-seccion) { color: #fff; }
.cabecera-jornada h1 { max-width: 900px; }
.enlace-regreso-jornada { display: inline-flex; gap: 8px; margin-top: 8px; color: #9aeaff; font-weight: 800; text-underline-offset: 4px; }
.resumen-jornada { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 18px 0 22px; }
.resumen-jornada > div { display: grid; gap: 4px; min-width: 0; padding: 16px 18px; border: 1px solid #dce4ed; border-radius: 14px; background: #f3f7fb; }
.resumen-jornada strong { color: #0d4d7e; font-size: 1.25rem; }
.resumen-jornada span, .encabezado-jornada > span, .fuente-jornada { color: #586980; font-size: .88rem; }
.panel-jornada { padding: clamp(18px, 3vw, 28px); color: #13243a; border: 1px solid #dce4ed; border-radius: 16px; background: #fff; box-shadow: 0 10px 30px rgb(16 36 61 / 5%); }
.encabezado-jornada { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 17px; }
.encabezado-jornada h2 { margin: 2px 0 0; color: #10233d; font-size: clamp(1.25rem, 2.4vw, 1.7rem); }
.lista-partidos-jornada { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.lista-partidos-jornada > li { min-width: 0; }
.fuente-jornada { margin: 18px 4px; line-height: 1.6; }
:global(body.tema-publico-azul) .panel-jornada { color: #e5efff; border-color: #294563; background: #102842; }
:global(body.tema-publico-azul) .encabezado-jornada h2 { color: #f1f6ff; }
:global(body.tema-publico-azul) .resumen-jornada > div { border-color: #294563; background: #132f4d; }
:global(body.tema-publico-azul) .resumen-jornada strong { color: #8ce8ff; }
:global(body.tema-publico-azul) .resumen-jornada span,
:global(body.tema-publico-azul) .encabezado-jornada > span,
:global(body.tema-publico-azul) .fuente-jornada { color: #b4c9df; }
@media (max-width: 700px) { .lista-partidos-jornada { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 540px) { .resumen-jornada { grid-template-columns: minmax(0, 1fr); } .encabezado-jornada { align-items: flex-start; flex-direction: column; } }
</style>
