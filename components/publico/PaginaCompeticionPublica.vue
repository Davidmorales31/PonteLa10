<script setup lang="ts">
import PartidoCompeticionCard from '~/components/publico/PartidoCompeticionCard.vue'

import type { EquipoCompeticionPublica, FichaCompeticionPublica, FilaTablaCompeticionPublica } from '~/server/utils/competicionesPublicas'
import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { construirUrlAbsoluta } from '~/utils/seo'
import { construirSportsEventSeo, etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

const props = defineProps<{ slug: string, temporada?: string }>()
const configuracion = useRuntimeConfig()
const endpoint = computed(() => {
  const base = `/api/competiciones/${encodeURIComponent(props.slug)}`
  return props.temporada ? `${base}?temporada=${encodeURIComponent(props.temporada)}` : base
})
const clave = computed(() => `competicion-${props.slug}-${props.temporada || 'actual'}`)
const { data: ficha, error } = await useFetch<FichaCompeticionPublica>(endpoint, { key: clave })

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 503,
    statusMessage: error.value.statusMessage || 'No fue posible cargar la competición.'
  })
}

if (props.temporada && ficha.value?.temporadaActual === props.temporada) {
  await navigateTo(`/competiciones/${encodeURIComponent(props.slug)}`, { redirectCode: 301, replace: true })
}

const temporadasIndexables = computed(() => ficha.value?.temporadas.filter(temporada => temporada.indexable) || [])
const partidosTemporada = computed(() => ficha.value?.temporadas.find(t => t.temporada === ficha.value?.temporada)?.partidosPublicos || 0)
const fasesTabla = computed(() => {
  const grupos = new Map<string, FilaTablaCompeticionPublica[]>()
  for (const fila of ficha.value?.tabla || []) {
    const grupo = grupos.get(fila.fase) || []
    grupo.push(fila)
    grupos.set(fila.fase, grupo)
  }
  return [...grupos.entries()].map(([fase, filas]) => ({ fase, filas }))
})
const partidosMarcador = computed(() => [
  ...(ficha.value?.partidosEnVivo || []),
  ...(ficha.value?.proximosPartidos || []),
  ...(ficha.value?.resultadosRecientes || [])
].slice(0, 12))
const tituloPagina = computed(() => ficha.value
  ? `${ficha.value.competencia.nombre} ${ficha.value.temporada}: calendario, tabla y resultados | Pont3la10`
  : 'Competición colombiana | Pont3la10')
const descripcionPagina = computed(() => ficha.value
  ? `Consulta el calendario, resultados, equipos${ficha.value.tablaDisponible ? ' y tabla de posiciones' : ''} de ${ficha.value.competencia.nombre} en la temporada ${ficha.value.temporada}.`
  : 'Calendario y actualidad de las competiciones del fútbol colombiano.')
const datosEstructurados = computed(() => {
  if (!ficha.value?.indexable) return undefined
  const ruta = rutaCanonica.value
  const url = construirUrlAbsoluta(String(configuracion.public.siteUrl), ruta)
  const partidos = partidosMarcador.value
  const listaPartidos = partidos.map((partido, indice) => ({
    '@type': 'ListItem',
    position: indice + 1,
    name: `${partido.local} vs ${partido.visitante}`,
    url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/partidos/${partido.slug}`)
  }))
  const listaEquipos = (ficha.value.equipos || []).map((equipo, indice) => ({
    '@type': 'ListItem',
    position: indice + 1,
    name: equipo.nombre,
    ...(rutaEquipo(equipo) ? { url: construirUrlAbsoluta(String(configuracion.public.siteUrl), rutaEquipo(equipo)!) } : {})
  }))
  const schemaPartidos = partidos.map(partido => construirSportsEventSeo({
    local: partido.local,
    visitante: partido.visitante,
    fechaIso: partido.fechaIso,
    verificadoEn: partido.verificadoEn,
    estado: partido.estado,
    golesLocal: partido.golesLocal,
    golesVisitante: partido.golesVisitante,
    estadio: partido.estadio,
    ciudad: partido.ciudad,
    urlCanonica: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/partidos/${partido.slug}`),
    descripcion: `${ficha.value!.competencia.nombre}, temporada ${ficha.value!.temporada}.`
  })).filter((schema): schema is Record<string, unknown> => schema !== null)

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${ficha.value.competencia.nombre} ${ficha.value.temporada}`,
      description: descripcionPagina.value,
      inLanguage: 'es-CO',
      url,
      mainEntity: { '@type': 'ItemList', itemListElement: listaPartidos }
    },
    ...(listaEquipos.length ? [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `Equipos de ${ficha.value.competencia.nombre}`, itemListElement: listaEquipos }] : []),
    ...schemaPartidos,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
        { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') },
        { '@type': 'ListItem', position: 3, name: ficha.value.competencia.nombre, item: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/competiciones/${ficha.value.competencia.slug}`) },
        ...(ficha.value.temporada === ficha.value.temporadaActual ? [] : [{
          '@type': 'ListItem', position: 4, name: `Temporada ${ficha.value.temporada}`, item: url
        }])
      ]
    }
  ]
})
const rutaCanonica = computed(() => props.temporada
  ? `/competiciones/${encodeURIComponent(props.slug)}/${encodeURIComponent(props.temporada)}`
  : `/competiciones/${encodeURIComponent(props.slug)}`)

useSeoPont3la10(() => ({
  titulo: tituloPagina.value,
  descripcion: descripcionPagina.value,
  rutaCanonica: rutaCanonica.value,
  seccion: 'Fútbol colombiano',
  robots: ficha.value?.indexable ? undefined : 'noindex, follow',
  datosEstructurados: datosEstructurados.value
}))

function nombreEquipo(partido: PartidoSeoPublico, local: boolean): string {
  return local ? partido.local : partido.visitante
}

function escudoEquipo(partido: PartidoSeoPublico, local: boolean): string | null {
  return local ? partido.escudoLocal : partido.escudoVisitante
}

function slugEquipo(partido: PartidoSeoPublico, local: boolean): string | undefined {
  return local ? partido.equipoLocalSlug : partido.equipoVisitanteSlug
}

function rutaEquipo(equipo: EquipoCompeticionPublica): string | null {
  return equipo.slug ? `/equipos/${encodeURIComponent(equipo.slug)}` : null
}

function rutaEquipoPartido(partido: PartidoSeoPublico, local: boolean): string | null {
  const slug = slugEquipo(partido, local)
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

function iniciales(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(palabra => palabra[0]).join('').toLocaleUpperCase('es-CO')
}

function fechaActualizacion(fecha: string | null): string {
  return fecha ? fechaPartido(fecha) : 'Sin registro de actualización'
}
</script>

<template>
  <main v-if="ficha" class="pagina-contenido pagina-publica-medio modulo-futbol-colombia pagina-competicion-publica">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><NuxtLink to="/liga-colombiana">Liga colombiana</NuxtLink></li>
        <li><span class="miga-actual" aria-current="page">{{ ficha.competencia.nombre }}</span></li>
        <li v-if="ficha.temporada !== ficha.temporadaActual"><span class="miga-actual" aria-current="page">{{ ficha.temporada }}</span></li>
      </ol>
    </nav>

    <header class="cabecera-pagina cabecera-noticias-medio cabecera-liga-colombia cabecera-competicion">
      <div>
        <p class="etiqueta-seccion">FÚTBOL COLOMBIANO · TEMPORADA {{ ficha.temporada }}</p>
        <h1>{{ ficha.competencia.nombre }} {{ ficha.temporada }}</h1>
        <p>Calendario, resultados, equipos y{{ ficha.tablaDisponible ? ' tabla de posiciones' : ' fases del torneo' }} con información pública confirmada.</p>
      </div>
      <nav class="navegacion-liga-colombia" aria-label="Secciones de la competición">
        <a v-if="ficha.tablaDisponible" href="#posiciones">Tabla</a>
        <a v-if="ficha.partidosEnVivo.length" href="#en-vivo">En vivo</a>
        <a href="#proximos">Próximos partidos</a>
        <a href="#resultados">Resultados</a>
        <a href="#jornadas">Jornadas</a>
        <a href="#equipos">Equipos</a>
        <a href="#noticias">Noticias</a>
      </nav>
    </header>

    <section class="selector-temporadas panel-competicion" aria-labelledby="titulo-temporadas">
      <div>
        <p class="etiqueta-seccion">ARCHIVO OFICIAL</p>
        <h2 id="titulo-temporadas">Temporadas</h2>
      </div>
      <nav aria-label="Temporadas disponibles">
        <NuxtLink
          v-for="opcionTemporada in temporadasIndexables"
          :key="opcionTemporada.temporada"
          :to="opcionTemporada.ruta"
          :aria-current="opcionTemporada.temporada === ficha.temporada ? 'page' : undefined"
        >
          {{ opcionTemporada.temporada }}<span v-if="opcionTemporada.esActual"> · Actual</span>
        </NuxtLink>
      </nav>
      <small v-if="ficha.actualizadaEn">Última verificación: {{ fechaActualizacion(ficha.actualizadaEn) }} (hora de Colombia)</small>
    </section>

    <div class="resumen-competicion" aria-label="Resumen de la temporada">
      <div><strong>{{ ficha.equipos.length }}</strong><span>equipos con partidos públicos</span></div>
      <div><strong>{{ ficha.jornadas.length }}</strong><span>jornadas o fases registradas</span></div>
      <div><strong>{{ partidosTemporada }}</strong><span>partidos en el calendario</span></div>
    </div>

    <section v-if="ficha.tablaDisponible" id="posiciones" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion">
        <div><p class="etiqueta-seccion">{{ ficha.temporada }}</p><h2>Tabla de posiciones</h2></div>
        <span class="sello-verificado">Datos públicos confirmados</span>
      </header>
      <div v-for="fase in fasesTabla" :key="fase.fase" class="fase-tabla-liga">
        <h3>{{ fase.fase }}</h3>
        <div class="tabla-liga-scroll">
          <table>
            <caption>{{ ficha.competencia.nombre }} · {{ fase.fase }} · temporada {{ ficha.temporada }}</caption>
            <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">G</th><th scope="col">E</th><th scope="col">P</th><th scope="col">DG</th><th scope="col">Pts</th></tr></thead>
            <tbody>
              <tr v-for="fila in fase.filas" :key="`${fila.temporada}-${fila.fase}-${fila.posicion}-${fila.competencia}`">
                <td>{{ fila.posicion }}</td>
                <td>
                  <NuxtLink :to="`/equipos/${encodeURIComponent(fila.equipoSlug)}`" class="equipo-tabla-liga">
                    <img v-if="fila.equipoEscudo" :src="fila.equipoEscudo" :alt="`Escudo de ${fila.equipoNombre}`" width="32" height="32" loading="lazy"><span v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(fila.equipoNombre) }}</span><strong>{{ fila.equipoNombre }}</strong>
                  </NuxtLink>
                </td>
                <td>{{ fila.jugados }}</td><td>{{ fila.ganados }}</td><td>{{ fila.empatados }}</td><td>{{ fila.perdidos }}</td><td>{{ fila.diferencia }}</td><td><strong>{{ fila.puntos }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section v-else-if="ficha.competencia.tipo === 'liga'" id="posiciones" class="bloque-liga-colombia panel-competicion estado-sin-tabla">
      <p class="etiqueta-seccion">TABLA DE POSICIONES</p>
      <h2>Clasificación pendiente de confirmación</h2>
      <p>No mostramos una tabla parcial como si fuera oficial. Consulta el calendario y los resultados mientras se publica una clasificación completa y confirmada para {{ ficha.temporada }}.</p>
      <NuxtLink to="/liga-colombiana">Volver al hub de Liga colombiana <span aria-hidden="true">→</span></NuxtLink>
    </section>

    <section v-if="ficha.partidosEnVivo.length" id="en-vivo" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">ACTUALIZACIÓN EN DIRECTO</p><h2>Partidos en vivo</h2></div><span class="senal-vivo-equipo">EN VIVO</span></header>
      <ul class="lista-partidos-competicion"><li v-for="partido in ficha.partidosEnVivo" :key="partido.slug"><PartidoCompeticionCard :partido="partido" :fecha-completa="fechaCompleta" :fecha-partido="fechaPartido" :etiqueta-estado="etiquetaEstado" :marcador="marcador" :ruta-equipo-partido="rutaEquipoPartido" :nombre-equipo="nombreEquipo" :escudo-equipo="escudoEquipo" :iniciales="iniciales" /></li></ul>
    </section>

    <section id="proximos" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">AGENDA</p><h2>Próximos partidos</h2></div><span>{{ ficha.proximosPartidos.length }} encuentros</span></header>
      <ul v-if="ficha.proximosPartidos.length" class="lista-partidos-competicion"><li v-for="partido in ficha.proximosPartidos" :key="partido.slug"><PartidoCompeticionCard :partido="partido" :fecha-completa="fechaCompleta" :fecha-partido="fechaPartido" :etiqueta-estado="etiquetaEstado" :marcador="marcador" :ruta-equipo-partido="rutaEquipoPartido" :nombre-equipo="nombreEquipo" :escudo-equipo="escudoEquipo" :iniciales="iniciales" /></li></ul>
      <p v-else class="estado-competicion-vacio">No hay próximos partidos confirmados en el calendario público de esta temporada.</p>
    </section>

    <section id="resultados" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">MARCADORES CONFIRMADOS</p><h2>Resultados recientes</h2></div><span>{{ ficha.resultadosRecientes.length }} encuentros</span></header>
      <ul v-if="ficha.resultadosRecientes.length" class="lista-partidos-competicion"><li v-for="partido in ficha.resultadosRecientes" :key="partido.slug"><PartidoCompeticionCard :partido="partido" :fecha-completa="fechaCompleta" :fecha-partido="fechaPartido" :etiqueta-estado="etiquetaEstado" :marcador="marcador" :ruta-equipo-partido="rutaEquipoPartido" :nombre-equipo="nombreEquipo" :escudo-equipo="escudoEquipo" :iniciales="iniciales" /></li></ul>
      <p v-else class="estado-competicion-vacio">Todavía no hay resultados finales confirmados para mostrar.</p>
    </section>

    <section id="jornadas" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">CALENDARIO COMPLETO</p><h2>Jornadas y fases</h2></div><span>{{ ficha.jornadas.length }} fechas o fases</span></header>
      <div v-if="ficha.jornadas.length" class="lista-jornadas-competicion">
        <details v-for="jornada in ficha.jornadas" :key="jornada.nombre">
          <summary><strong>{{ jornada.nombre }}</strong><span>{{ jornada.partidos.length }} partidos</span></summary>
          <NuxtLink v-if="jornada.ruta" :to="jornada.ruta" class="enlace-competicion enlace-jornada-completa">
            Ver calendario completo de {{ jornada.nombre }} <span aria-hidden="true">→</span>
          </NuxtLink>
          <ul class="lista-partidos-competicion"><li v-for="partido in jornada.partidos" :key="partido.slug">
            <article class="partido-jornada-compacto">
              <time :datetime="partido.fechaIso">{{ fechaPartido(partido.fechaIso) }}</time>
              <p><strong>{{ partido.local }}</strong> <span>{{ marcador(partido) }}</span> <strong>{{ partido.visitante }}</strong></p>
              <NuxtLink :to="`/partidos/${encodeURIComponent(partido.slug)}`">Ver partido <span class="solo-lectores">{{ partido.local }} vs {{ partido.visitante }}</span></NuxtLink>
            </article>
          </li></ul>
        </details>
      </div>
      <p v-else class="estado-competicion-vacio">El calendario oficial de jornadas aún no está disponible.</p>
    </section>

    <section id="equipos" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">CLUBES PARTICIPANTES</p><h2>Equipos</h2></div><span>{{ ficha.equipos.length }} equipos</span></header>
      <ul class="grilla-equipos-competicion">
        <li v-for="equipo in ficha.equipos" :key="equipo.nombre">
          <NuxtLink v-if="rutaEquipo(equipo)" :to="rutaEquipo(equipo)!">
            <img v-if="equipo.escudo" :src="equipo.escudo" :alt="`Escudo de ${equipo.nombre}`" width="42" height="42" loading="lazy">
            <span v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(equipo.nombre) }}</span><strong>{{ equipo.nombre }}</strong><span aria-hidden="true">→</span>
          </NuxtLink>
          <span v-else class="equipo-sin-ficha"><img v-if="equipo.escudo" :src="equipo.escudo" :alt="`Escudo de ${equipo.nombre}`" width="42" height="42" loading="lazy"><span v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(equipo.nombre) }}</span><strong>{{ equipo.nombre }}</strong></span>
        </li>
      </ul>
    </section>

    <section id="noticias" class="bloque-liga-colombia panel-competicion">
      <header class="encabezado-seccion-competicion"><div><p class="etiqueta-seccion">ACTUALIDAD</p><h2>Noticias de {{ ficha.competencia.nombre }}</h2></div></header>
      <div v-if="ficha.noticias.length" class="grilla-noticias-competicion">
        <article v-for="noticia in ficha.noticias" :key="noticia.slug">
          <NuxtLink v-if="noticia.imagen" :to="`/articulos/${noticia.slug}`" class="imagen-noticia-competicion" tabindex="-1" aria-hidden="true"><img :src="noticia.imagen" :alt="noticia.titulo" loading="lazy"></NuxtLink>
          <p class="etiqueta-seccion">{{ noticia.categoria }}</p>
          <h3><NuxtLink :to="`/articulos/${noticia.slug}`">{{ noticia.titulo }}</NuxtLink></h3>
          <p>{{ noticia.resumen }}</p>
          <NuxtLink :to="`/articulos/${noticia.slug}`" class="enlace-competicion">Leer noticia <span aria-hidden="true">→</span></NuxtLink>
        </article>
      </div>
      <p v-else class="estado-competicion-vacio">Aún no hay noticias publicadas relacionadas con {{ ficha.competencia.nombre }}.</p>
    </section>

    <p class="nota-fuente-competicion">Calendario, marcadores y clasificación basados únicamente en datos públicos confirmados. Última actualización: {{ fechaActualizacion(ficha.actualizadaEn) }}.</p>
  </main>
</template>

<style scoped>
.pagina-competicion-publica { max-width: 1220px; margin-inline: auto; }
.cabecera-competicion { position: relative; align-content: end; min-height: 210px; margin-bottom: 22px; overflow: hidden; border-radius: 12px; background: linear-gradient(125deg, #0b2341, #103c62 58%, #0b2341); padding: 28px; }
.cabecera-competicion h1, .cabecera-competicion p:not(.etiqueta-seccion) { color: #fff; }
.cabecera-competicion .etiqueta-seccion { color: #ffd343; }
.cabecera-competicion .navegacion-liga-colombia { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }
.cabecera-competicion .navegacion-liga-colombia a { padding: 8px 13px; border: 1px solid rgb(255 255 255 / 28%); border-radius: 999px; color: #fff; text-decoration: none; }
.cabecera-competicion .navegacion-liga-colombia a:hover, .cabecera-competicion .navegacion-liga-colombia a:focus-visible { outline: 2px solid #78dcf4; outline-offset: 2px; }
.panel-competicion { padding: clamp(18px, 3vw, 28px); color: #13243a; background: #fff; border: 1px solid #dce4ed; border-radius: 16px; box-shadow: 0 10px 30px rgb(16 36 61 / 5%); }
.selector-temporadas { display: grid; grid-template-columns: minmax(0, auto) 1fr; align-items: center; gap: 10px 24px; }
.selector-temporadas h2, .panel-competicion h2 { margin: 2px 0 0; color: #10233d; font-size: clamp(1.25rem, 2.4vw, 1.7rem); }
.selector-temporadas nav { display: flex; flex-wrap: wrap; gap: 9px; }
.selector-temporadas nav a { padding: 8px 13px; color: #145e99; border: 1px solid #d5e1ed; border-radius: 999px; text-decoration: none; }
.selector-temporadas nav a[aria-current="page"] { color: #fff; border-color: #145e99; background: #145e99; }
.selector-temporadas small { grid-column: 1 / -1; color: #65758a; }
.resumen-competicion { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 18px 0 22px; }
.resumen-competicion > div { display: grid; gap: 3px; padding: 16px 18px; border: 1px solid #dce4ed; border-radius: 14px; background: #f3f7fb; }
.resumen-competicion strong { color: #0d4d7e; font-size: 1.55rem; }
.resumen-competicion span, .encabezado-seccion-competicion > span, .sello-verificado, .estado-competicion-vacio, .nota-fuente-competicion { color: #586980; font-size: .88rem; }
.bloque-liga-colombia.panel-competicion { margin-top: 22px; }
.encabezado-seccion-competicion { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 17px; }
.encabezado-seccion-competicion h2 { margin-top: 3px; }
.sello-verificado { padding: 6px 10px; border-radius: 999px; background: #e7f5ed; color: #17613b; font-weight: 700; }
.fase-tabla-liga + .fase-tabla-liga { margin-top: 20px; }
.fase-tabla-liga h3 { margin: 0 0 8px; color: #173b60; }
.tabla-liga-scroll { overflow-x: auto; }
.tabla-liga-scroll table { width: 100%; border-collapse: collapse; font-size: .86rem; }
.tabla-liga-scroll caption { padding: 0 0 10px; color: #586980; text-align: left; }
.tabla-liga-scroll th, .tabla-liga-scroll td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap; }
.tabla-liga-scroll th:nth-child(2), .tabla-liga-scroll td:nth-child(2) { text-align: left; }
.equipo-tabla-liga { display: inline-flex; align-items: center; gap: 9px; color: #145e99; text-decoration: none; }
.equipo-tabla-liga:hover, .equipo-tabla-liga:focus-visible, .enlace-competicion:hover { text-decoration: underline; }
.lista-partidos-competicion { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.lista-partidos-competicion > li { min-width: 0; }
.lista-jornadas-competicion { display: grid; gap: 9px; }
.lista-jornadas-competicion details { border: 1px solid #dce4ed; border-radius: 12px; }
.lista-jornadas-competicion summary { display: flex; justify-content: space-between; gap: 12px; padding: 14px 16px; cursor: pointer; }
.lista-jornadas-competicion summary span, .partido-jornada-compacto time { color: #65758a; font-size: .86rem; }
.partido-jornada-compacto { display: grid; grid-template-columns: minmax(130px, .6fr) minmax(0, 1.6fr) auto; align-items: center; gap: 14px; padding: 12px 16px; border-top: 1px solid #e5eaf0; }
.partido-jornada-compacto p { display: flex; justify-content: center; gap: 10px; margin: 0; text-align: center; }
.partido-jornada-compacto p span { color: #0d5c96; font-weight: 900; white-space: nowrap; }
.partido-jornada-compacto > a, .enlace-competicion { color: #145e99; font-weight: 700; white-space: nowrap; }
.grilla-equipos-competicion { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.grilla-equipos-competicion li > a, .equipo-sin-ficha { display: flex; align-items: center; gap: 10px; min-height: 68px; padding: 10px; border: 1px solid #e1e8ef; border-radius: 12px; color: #17304d; text-decoration: none; }
.grilla-equipos-competicion li > a strong, .equipo-sin-ficha strong { flex: 1; }
.grilla-equipos-competicion img { width: 42px; height: 42px; object-fit: contain; }
.escudo-fallback { display: inline-grid; width: 36px; height: 36px; flex: 0 0 36px; place-items: center; border-radius: 50%; background: #17466b; color: #fff; font-size: .72rem; font-weight: 800; }
.grilla-noticias-competicion { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.grilla-noticias-competicion article { overflow: hidden; padding: 16px; border: 1px solid #e0e7ef; border-radius: 13px; }
.grilla-noticias-competicion h3 { margin: 8px 0; line-height: 1.35; }
.grilla-noticias-competicion h3 a { color: #142b48; text-decoration: none; }
.grilla-noticias-competicion article > p:not(.etiqueta-seccion) { color: #53657a; line-height: 1.55; }
.imagen-noticia-competicion { display: block; aspect-ratio: 16 / 8; margin: -16px -16px 14px; overflow: hidden; }
.imagen-noticia-competicion img { width: 100%; height: 100%; object-fit: cover; }
.nota-fuente-competicion { margin: 18px 4px; line-height: 1.6; }
.estado-sin-tabla a { color: #145e99; font-weight: 700; }
:global(body.tema-publico-azul) .panel-competicion { color: #e5efff; border-color: #294563; background: #102842; box-shadow: 0 12px 32px rgb(0 0 0 / 18%); }
:global(body.tema-publico-azul) .panel-competicion h2,
:global(body.tema-publico-azul) .fase-tabla-liga h3,
:global(body.tema-publico-azul) .grilla-noticias-competicion h3 a { color: #f1f6ff; }
:global(body.tema-publico-azul) .selector-temporadas small,
:global(body.tema-publico-azul) .resumen-competicion span,
:global(body.tema-publico-azul) .encabezado-seccion-competicion > span,
:global(body.tema-publico-azul) .estado-competicion-vacio,
:global(body.tema-publico-azul) .nota-fuente-competicion,
:global(body.tema-publico-azul) .tabla-liga-scroll caption,
:global(body.tema-publico-azul) .partido-jornada-compacto time { color: #b4c9df; }
:global(body.tema-publico-azul) .resumen-competicion > div { border-color: #294563; background: #132f4d; }
:global(body.tema-publico-azul) .resumen-competicion strong,
:global(body.tema-publico-azul) .partido-jornada-compacto p span { color: #8ce8ff; }
:global(body.tema-publico-azul) .selector-temporadas nav a,
:global(body.tema-publico-azul) .equipo-tabla-liga,
:global(body.tema-publico-azul) .partido-jornada-compacto > a,
:global(body.tema-publico-azul) .enlace-competicion,
:global(body.tema-publico-azul) .estado-sin-tabla a { color: #9aeaff; }
:global(body.tema-publico-azul) .selector-temporadas nav a[aria-current="page"] { color: #0b2440; background: #8ce8ff; }
:global(body.tema-publico-azul) .tabla-liga-scroll th,
:global(body.tema-publico-azul) .tabla-liga-scroll td,
:global(body.tema-publico-azul) .lista-jornadas-competicion details,
:global(body.tema-publico-azul) .partido-jornada-compacto,
:global(body.tema-publico-azul) .grilla-equipos-competicion li > a,
:global(body.tema-publico-azul) .equipo-sin-ficha,
:global(body.tema-publico-azul) .grilla-noticias-competicion article { border-color: #294563; }
:global(body.tema-publico-azul) .grilla-equipos-competicion li > a,
:global(body.tema-publico-azul) .equipo-sin-ficha,
:global(body.tema-publico-azul) .grilla-noticias-competicion article { color: #e5efff; background: #132f4d; }
:global(body.tema-publico-azul) .grilla-noticias-competicion article > p:not(.etiqueta-seccion) { color: #c1d1e2; }
:global(body.tema-publico-azul) .sello-verificado { color: #a6f0c1; background: #16472e; }
:global(body.tema-publico-azul) .selector-temporadas nav a[aria-current="page"] { color: #0b2440; }
.panel-competicion .etiqueta-seccion { margin: 0; color: #1769a6; font-size: .75rem; font-weight: 800; letter-spacing: .09em; }
:global(body.tema-publico-azul) .panel-competicion .etiqueta-seccion { color: #79dff7; }
.solo-lectores { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 860px) { .grilla-equipos-competicion { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grilla-noticias-competicion { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .selector-temporadas { grid-template-columns: minmax(0, 1fr); } .selector-temporadas small { grid-column: 1; } .resumen-competicion { grid-template-columns: 1fr; } .resumen-competicion > div { grid-template-columns: auto 1fr; align-items: center; } .grilla-equipos-competicion, .grilla-noticias-competicion { grid-template-columns: minmax(0, 1fr); } .partido-jornada-compacto { grid-template-columns: minmax(0, 1fr) auto; gap: 7px 12px; } .partido-jornada-compacto p { grid-column: 1 / -1; grid-row: 2; justify-content: flex-start; flex-wrap: wrap; } .partido-jornada-compacto > a { grid-column: 2; grid-row: 1; } }
</style>
