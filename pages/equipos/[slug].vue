<script setup lang="ts">
import type { FichaEquipoLigaPublica } from '~/server/utils/equiposLigaPublicos'
import { construirUrlAbsoluta } from '~/utils/seo'

const configuracion = useRuntimeConfig()
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const { data: ficha, error } = await useFetch<FichaEquipoLigaPublica>(
  () => `/api/equipos/${encodeURIComponent(slug.value)}`,
  { key: computed(() => `ficha-equipo-${slug.value}`) }
)

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 503,
    statusMessage: error.value.statusMessage || 'No fue posible cargar la ficha del equipo.'
  })
}
useCachePublica('equipo')

const equipo = computed(() => ficha.value?.equipo || null)
const clasificacion = computed(() => equipo.value?.clasificaciones[0] || null)
const clasificaciones = computed(() => equipo.value?.clasificaciones || [])
const tituloPagina = computed(() => equipo.value
  ? `${equipo.value.nombre}: partidos, resultados y posición | Pont3la10`
  : 'Ficha de equipo | Pont3la10')
const descripcionPagina = computed(() => {
  const nombre = equipo.value?.nombre || 'el equipo'
  const posicion = clasificacion.value
    ? ` Consulta su posición (${clasificacion.value.puntos} puntos), próximos partidos, resultados y noticias.`
    : ' Consulta sus partidos, resultados y noticias verificadas.'
  return `Calendario y actualidad de ${nombre} en el fútbol colombiano.${posicion}`
})
const structuredData = computed(() => {
  if (!equipo.value || !ficha.value?.indexable) return undefined
  const url = construirUrlAbsoluta(String(configuracion.public.siteUrl), `/equipos/${equipo.value.slug}`)
  return [{
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: equipo.value.nombre,
    sport: 'Soccer',
    url,
    logo: equipo.value.escudo
      ? construirUrlAbsoluta(String(configuracion.public.siteUrl), equipo.value.escudo)
      : undefined,
    memberOf: {
      '@type': 'SportsOrganization',
      name: nombreCompetencia(clasificacion.value?.competencia || '')
    }
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
      { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') },
      { '@type': 'ListItem', position: 3, name: equipo.value.nombre, item: url }
    ]
  }]
})

useSeoPont3la10(() => ({
  titulo: tituloPagina.value,
  descripcion: descripcionPagina.value,
  rutaCanonica: `/equipos/${slug.value}`,
  ...(equipo.value?.escudo ? { imagen: equipo.value.escudo, imagenAlt: `Escudo de ${equipo.value.nombre}` } : {}),
  seccion: 'Fútbol colombiano',
  robots: ficha.value?.indexable ? undefined : 'noindex, follow',
  datosEstructurados: structuredData.value
}))

function nombreCompetencia(competencia: string) {
  if (competencia === 'copa-colombia') return 'Copa Colombia'
  return competencia === 'torneo-betplay' ? 'Torneo BetPlay' : 'Liga BetPlay'
}

function fechaPartido(valor: string, incluirHora = true) {
  if (!Number.isFinite(Date.parse(valor))) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    ...(incluirHora ? { timeStyle: 'short' as const } : {}),
    timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function fechaBreve(valor: string) {
  if (!Number.isFinite(Date.parse(valor))) return 'Actualización verificada'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function horaPartido(valor: string) {
  if (!Number.isFinite(Date.parse(valor))) return 'Hora por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    timeStyle: 'short', timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function rutaPartido(slugPartido: string) {
  return `/partidos/${encodeURIComponent(slugPartido)}`
}

function marcador(partido: FichaEquipoLigaPublica['proximosPartidos'][number]) {
  return partido.golesLocal !== null && partido.golesVisitante !== null
    ? `${partido.golesLocal}–${partido.golesVisitante}`
    : 'vs'
}

function puntajeDeMiEquipo(partido: FichaEquipoLigaPublica['proximosPartidos'][number]) {
  return partido.golesLocal !== null && partido.golesVisitante !== null
    ? marcador(partido)
    : 'Por jugar'
}
</script>

<template>
  <main v-if="equipo && ficha" class="pagina-contenido pagina-publica-medio pagina-equipo-publico">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><NuxtLink to="/liga-colombiana">Liga colombiana</NuxtLink></li>
        <li><span aria-current="page">{{ equipo.nombre }}</span></li>
      </ol>
    </nav>

    <header class="equipo-hero panel-equipo-publico">
      <div class="equipo-identidad">
        <div class="escudo-equipo-hero">
          <EscudoEquipoPublico v-if="equipo.escudo" :src="equipo.escudo" :alt="`Escudo de ${equipo.nombre}`" :width="104" :height="104" sizes="104px" loading="eager" prioridad-alta />
          <span v-else aria-hidden="true">{{ equipo.nombre.slice(0, 1) }}</span>
        </div>
        <div>
          <p class="etiqueta-seccion">FÚTBOL COLOMBIANO · {{ nombreCompetencia(clasificacion?.competencia || '') }}</p>
          <h1>{{ equipo.nombre }}</h1>
          <p class="temporada-equipo">Temporada {{ clasificacion?.temporada || 'actual' }}<template v-if="clasificacion?.fase"> · {{ clasificacion.fase }}</template></p>
        </div>
      </div>
      <div v-if="clasificacion" class="resumen-posicion-equipo" aria-label="Posición verificada">
        <span>POSICIÓN</span>
        <strong>#{{ clasificacion.posicion }}</strong>
        <small>{{ clasificacion.puntos }} puntos · {{ clasificacion.jugados }} PJ</small>
      </div>
      <nav class="navegacion-equipo" aria-label="Secciones de la ficha">
        <a href="#calendario">Calendario</a>
        <a href="#resultados">Resultados</a>
        <a href="#noticias-equipo">Noticias</a>
        <NuxtLink to="/liga-colombiana">Tabla de la liga <span aria-hidden="true">→</span></NuxtLink>
      </nav>
    </header>

    <p class="nota-verificacion-equipo">Datos públicos de clasificación y fixtures; última verificación {{ fechaBreve(equipo.actualizadoEn) }}.</p>

    <div class="contenido-equipo-grid">
      <div class="columna-principal-equipo">
        <section v-if="ficha.partidosEnVivo.length" class="seccion-equipo panel-equipo-publico seccion-vivo-equipo" aria-labelledby="partidos-vivo-equipo">
          <div class="encabezado-seccion-equipo"><div><p class="etiqueta-seccion">AHORA</p><h2 id="partidos-vivo-equipo">En vivo</h2></div><span class="senal-vivo-equipo">EN VIVO</span></div>
          <article v-for="partido in ficha.partidosEnVivo" :key="partido.slug" class="fila-partido-equipo">
            <div><p>{{ nombreCompetencia(partido.competencia) }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></p><strong>{{ partido.local }} <span>{{ marcador(partido) }}</span> {{ partido.visitante }}</strong><small>{{ fechaPartido(partido.fechaIso) }} · marcador según datos publicados</small></div>
            <NuxtLink :to="rutaPartido(partido.slug)">Ver partido <span aria-hidden="true">→</span></NuxtLink>
          </article>
        </section>

        <section id="calendario" class="seccion-equipo panel-equipo-publico" aria-labelledby="proximos-equipo">
          <div class="encabezado-seccion-equipo"><div><p class="etiqueta-seccion">AGENDA</p><h2 id="proximos-equipo">Próximos partidos</h2></div><NuxtLink to="/partidos-hoy">Todos los partidos <span aria-hidden="true">→</span></NuxtLink></div>
          <ol v-if="ficha.proximosPartidos.length" class="lista-partidos-equipo">
            <li v-for="partido in ficha.proximosPartidos" :key="partido.slug">
              <time :datetime="partido.fechaIso"><strong>{{ fechaBreve(partido.fechaIso) }}</strong><span>{{ horaPartido(partido.fechaIso) }}</span></time>
              <div class="duelo-equipo"><span><EscudoEquipoPublico v-if="partido.escudoLocal" :src="partido.escudoLocal" :alt="`Escudo de ${partido.local}`" :width="30" :height="30" sizes="30px" loading="lazy" /><strong>{{ partido.local }}</strong></span><b>{{ marcador(partido) }}</b><span><EscudoEquipoPublico v-if="partido.escudoVisitante" :src="partido.escudoVisitante" :alt="`Escudo de ${partido.visitante}`" :width="30" :height="30" sizes="30px" loading="lazy" /><strong>{{ partido.visitante }}</strong></span></div>
              <small>{{ nombreCompetencia(partido.competencia) }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></small>
              <NuxtLink class="enlace-partido-equipo" :to="rutaPartido(partido.slug)" :aria-label="`Ver ficha de ${partido.local} contra ${partido.visitante}`">Ver ficha <span aria-hidden="true">→</span></NuxtLink>
            </li>
          </ol>
          <p v-else class="estado-equipo-vacio">No hay próximos partidos publicados para este equipo.</p>
        </section>

        <section id="resultados" class="seccion-equipo panel-equipo-publico" aria-labelledby="resultados-equipo">
          <div class="encabezado-seccion-equipo"><div><p class="etiqueta-seccion">MARCADORES</p><h2 id="resultados-equipo">Resultados recientes</h2></div></div>
          <ol v-if="ficha.resultadosRecientes.length" class="lista-partidos-equipo lista-resultados-equipo">
            <li v-for="partido in ficha.resultadosRecientes" :key="partido.slug">
              <time :datetime="partido.fechaIso"><strong>{{ fechaBreve(partido.fechaIso) }}</strong></time>
              <div class="duelo-equipo"><span><EscudoEquipoPublico v-if="partido.escudoLocal" :src="partido.escudoLocal" :alt="`Escudo de ${partido.local}`" :width="30" :height="30" sizes="30px" loading="lazy" /><strong>{{ partido.local }}</strong></span><b>{{ puntajeDeMiEquipo(partido) }}</b><span><EscudoEquipoPublico v-if="partido.escudoVisitante" :src="partido.escudoVisitante" :alt="`Escudo de ${partido.visitante}`" :width="30" :height="30" sizes="30px" loading="lazy" /><strong>{{ partido.visitante }}</strong></span></div>
              <small>{{ nombreCompetencia(partido.competencia) }}<template v-if="partido.jornada"> · {{ partido.jornada }}</template></small>
              <NuxtLink class="enlace-partido-equipo" :to="rutaPartido(partido.slug)" :aria-label="`Ver resultado de ${partido.local} contra ${partido.visitante}`">Resultado <span aria-hidden="true">→</span></NuxtLink>
            </li>
          </ol>
          <p v-else class="estado-equipo-vacio">Todavía no hay resultados recientes verificados.</p>
        </section>
      </div>

      <aside class="columna-secundaria-equipo">
        <section class="panel-equipo-publico panel-clasificacion-equipo" aria-labelledby="tabla-equipo">
          <p class="etiqueta-seccion">{{ clasificacion?.temporada || 'Liga colombiana' }}</p>
          <h2 id="tabla-equipo">Posición en la tabla</h2>
          <div v-if="clasificacion" class="estadisticas-clasificacion-equipo">
            <div><span>Posición</span><strong>#{{ clasificacion.posicion }}</strong></div>
            <div><span>Puntos</span><strong>{{ clasificacion.puntos }}</strong></div>
            <div><span>Partidos</span><strong>{{ clasificacion.jugados }}</strong></div>
            <div><span>Goles</span><strong>{{ clasificacion.golesFavor }}–{{ clasificacion.golesContra }}</strong></div>
          </div>
          <p v-else class="estado-equipo-vacio">La tabla verificada aún no está disponible.</p>
          <small v-if="clasificacion">Verificada {{ fechaBreve(clasificacion.verificadoEn) }} · {{ clasificacion.fase }}</small>
          <NuxtLink class="enlace-panel-equipo" to="/liga-colombiana#posiciones">Consultar tablas completas <span aria-hidden="true">→</span></NuxtLink>
        </section>

        <PublicidadAdsterraSlot formato="nativo" contexto="ficha pública de equipo colombiano" />

        <section v-if="ficha.sedeVerificada" class="panel-equipo-publico panel-sede-equipo">
          <p class="etiqueta-seccion">SEDE PUBLICADA</p>
          <h2>Estadio</h2>
          <p><strong>{{ ficha.sedeVerificada.estadio }}</strong><template v-if="ficha.sedeVerificada.ciudad"> · {{ ficha.sedeVerificada.ciudad }}</template></p>
          <small>Tomado de <a :href="ficha.sedeVerificada.fuenteOficialUrl" target="_blank" rel="noopener noreferrer">programación oficial</a> · {{ fechaBreve(ficha.sedeVerificada.verificadoEn) }}</small>
        </section>

        <section class="panel-equipo-publico enlaces-liga-equipo">
          <p class="etiqueta-seccion">MÁS FÚTBOL COLOMBIANO</p>
          <NuxtLink to="/liga-colombiana">Liga BetPlay y Torneo BetPlay</NuxtLink>
          <NuxtLink to="/partidos-hoy">Partidos de hoy</NuxtLink>
          <NuxtLink to="/articulos?categoria=futbol-colombiano">Noticias de fútbol colombiano</NuxtLink>
        </section>
      </aside>
    </div>

    <section id="noticias-equipo" class="seccion-equipo panel-equipo-publico noticias-equipo" aria-labelledby="noticias-del-equipo">
      <div class="encabezado-seccion-equipo"><div><p class="etiqueta-seccion">ACTUALIDAD</p><h2 id="noticias-del-equipo">Noticias de {{ equipo.nombre }}</h2></div><NuxtLink to="/articulos?categoria=futbol-colombiano">Fútbol colombiano <span aria-hidden="true">→</span></NuxtLink></div>
      <div v-if="ficha.noticias.length" class="grilla-noticias-equipo">
        <article v-for="noticia in ficha.noticias" :key="noticia.slug">
          <NuxtLink v-if="noticia.imagen" class="imagen-noticia-equipo" :to="`/articulos/${noticia.slug}`" tabindex="-1" aria-hidden="true">
            <ImagenEditorialPublica
              :src="noticia.imagen"
              :alt="noticia.titulo"
              width="640"
              height="360"
              :ancho-original="noticia.imagenAncho"
              sizes="(max-width: 760px) 100vw, 640px"
            />
          </NuxtLink>
          <p class="etiqueta-seccion">{{ noticia.categoria }}</p>
          <h3><NuxtLink :to="`/articulos/${noticia.slug}`">{{ noticia.titulo }}</NuxtLink></h3>
          <p v-if="noticia.resumen">{{ noticia.resumen }}</p>
          <small>{{ fechaBreve(noticia.publicadoEn) }}</small>
        </article>
      </div>
      <p v-else class="estado-equipo-vacio">Cuando haya artículos públicos relacionados aparecerán aquí.</p>
    </section>

    <p v-if="clasificaciones.length" class="nota-verificacion-equipo">La clasificación se ofrece con fines informativos y refleja la última tabla pública confirmada. <NuxtLink to="/liga-colombiana">Ver Liga colombiana <span aria-hidden="true">→</span></NuxtLink></p>
  </main>
</template>

<style scoped>
.pagina-equipo-publico { max-width: 1220px; margin-inline: auto; }
.equipo-hero, .panel-equipo-publico { color: #13243a; background: #fff; border: 1px solid #dce4ed; border-radius: 18px; box-shadow: 0 12px 34px rgb(16 36 61 / 6%); }
.equipo-hero { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 22px; padding: clamp(22px, 4vw, 42px); background: linear-gradient(120deg, #f4f8fd, #fff 64%); }
.equipo-identidad { display: flex; align-items: center; gap: 22px; min-width: 0; }
.escudo-equipo-hero { display: grid; flex: 0 0 104px; width: 104px; height: 104px; place-items: center; overflow: hidden; border: 1px solid #e1e8ef; border-radius: 22px; background: #fff; }
.escudo-equipo-hero img { width: 82%; height: 82%; object-fit: contain; }
.equipo-hero h1 { margin: 4px 0 8px; color: #0d2039; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1.05; }
.equipo-hero .etiqueta-seccion, .etiqueta-seccion { margin: 0; color: #1769a6; font-size: .75rem; font-weight: 800; letter-spacing: .09em; }
.temporada-equipo { margin: 0; color: #53657a; }
.resumen-posicion-equipo { display: grid; min-width: 156px; padding: 18px; border-radius: 16px; background: #0e3154; color: #fff; text-align: center; }
.resumen-posicion-equipo span { color: #8ce8ff; font-size: .72rem; font-weight: 800; letter-spacing: .1em; }
.resumen-posicion-equipo strong { font-size: 2.8rem; line-height: 1.15; }
.resumen-posicion-equipo small { color: #d5e5f3; }
.navegacion-equipo { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 10px; padding-top: 16px; border-top: 1px solid #dce4ed; }
.navegacion-equipo a, .encabezado-seccion-equipo > a, .enlace-panel-equipo, .enlace-partido-equipo { color: #145e99; font-weight: 700; text-decoration: none; }
.navegacion-equipo a { padding: 9px 13px; border: 1px solid #d5e1ed; border-radius: 999px; background: #fff; }
.navegacion-equipo a:hover, .navegacion-equipo a:focus-visible { background: #eaf5ff; outline: 2px solid #1689cb; outline-offset: 2px; }
.nota-verificacion-equipo { margin: 14px 2px 22px; color: #65758a; font-size: .86rem; }
.contenido-equipo-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(270px, .8fr); align-items: start; gap: 22px; }
.columna-principal-equipo, .columna-secundaria-equipo { display: grid; gap: 20px; min-width: 0; }
.seccion-equipo, .panel-clasificacion-equipo, .panel-sede-equipo, .enlaces-liga-equipo { padding: clamp(18px, 3vw, 26px); }
.encabezado-seccion-equipo { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.encabezado-seccion-equipo h2, .panel-equipo-publico h2 { margin: 3px 0 0; color: #10233d; font-size: clamp(1.25rem, 2.4vw, 1.7rem); }
.senal-vivo-equipo { padding: 6px 10px; border-radius: 999px; background: #ffe5e7; color: #ae1a2a; font-size: .72rem; font-weight: 900; }
.fila-partido-equipo { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0; border-top: 1px solid #e5eaf0; }
.fila-partido-equipo p, .fila-partido-equipo small { display: block; margin: 0 0 5px; color: #65758a; }
.fila-partido-equipo strong span { padding-inline: 7px; color: #0c5da1; }
.fila-partido-equipo > a { white-space: nowrap; color: #145e99; font-weight: 700; }
.lista-partidos-equipo { margin: 0; padding: 0; list-style: none; }
.lista-partidos-equipo li { display: grid; grid-template-columns: minmax(92px, .55fr) minmax(0, 1.65fr) minmax(100px, .8fr) auto; align-items: center; gap: 12px; padding: 15px 0; border-top: 1px solid #e5eaf0; }
.lista-partidos-equipo time, .lista-partidos-equipo li > small { color: #64748a; font-size: .84rem; }
.lista-partidos-equipo time strong, .lista-partidos-equipo time span { display: block; }
.lista-partidos-equipo time span { margin-top: 3px; }
.duelo-equipo { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; }
.duelo-equipo > span { display: flex; align-items: center; gap: 8px; min-width: 0; }
.duelo-equipo > span:last-child { justify-content: flex-end; text-align: right; }
.duelo-equipo img { width: 30px; height: 30px; flex: 0 0 30px; object-fit: contain; }
.duelo-equipo strong { overflow: hidden; text-overflow: ellipsis; }
.duelo-equipo > b { color: #0f4f80; white-space: nowrap; }
.lista-partidos-equipo li > small { grid-column: 2 / 4; }
.enlace-partido-equipo { white-space: nowrap; }
.estadisticas-clasificacion-equipo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 18px 0; }
.estadisticas-clasificacion-equipo > div { display: grid; gap: 5px; padding: 13px; border-radius: 12px; background: #f1f6fb; }
.estadisticas-clasificacion-equipo span, .panel-equipo-publico > small { color: #65758a; font-size: .8rem; }
.estadisticas-clasificacion-equipo strong { color: #0b3156; font-size: 1.25rem; }
.enlace-panel-equipo { display: block; margin-top: 17px; padding-top: 14px; border-top: 1px solid #e5eaf0; }
.panel-sede-equipo p:not(.etiqueta-seccion) { margin-bottom: 6px; }
.panel-sede-equipo small { color: #65758a; }
.enlaces-liga-equipo { display: grid; gap: 11px; }
.enlaces-liga-equipo > a { color: #145e99; font-weight: 700; text-decoration: none; }
.enlaces-liga-equipo > a:hover, .enlaces-liga-equipo > a:focus-visible, .encabezado-seccion-equipo a:hover, .enlace-partido-equipo:hover { text-decoration: underline; }
.noticias-equipo { margin-top: 22px; }
.grilla-noticias-equipo { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.grilla-noticias-equipo article { overflow: hidden; border: 1px solid #e0e7ef; border-radius: 14px; padding: 16px; }
.grilla-noticias-equipo h3 { margin: 7px 0; font-size: 1.08rem; line-height: 1.35; }
.grilla-noticias-equipo h3 a { color: #142b48; text-decoration: none; }
.grilla-noticias-equipo article > p:not(.etiqueta-seccion) { color: #53657a; }
.grilla-noticias-equipo small, .estado-equipo-vacio { color: #65758a; }
.imagen-noticia-equipo { display: block; margin: -16px -16px 14px; aspect-ratio: 16 / 8; overflow: hidden; }
.imagen-noticia-equipo img { width: 100%; height: 100%; object-fit: cover; }
.estado-equipo-vacio { margin-bottom: 0; }

:global(body.tema-publico-azul) .panel-equipo-publico { color: #e5efff; border-color: #294563; background: #102842; box-shadow: 0 12px 32px rgb(0 0 0 / 18%); }
:global(body.tema-publico-azul) .equipo-hero { background: linear-gradient(120deg, #102a46, #0c2037 64%); }
:global(body.tema-publico-azul) .equipo-hero h1,
:global(body.tema-publico-azul) .panel-equipo-publico h2,
:global(body.tema-publico-azul) .grilla-noticias-equipo h3 a { color: #f1f6ff; }
:global(body.tema-publico-azul) .equipo-hero .etiqueta-seccion,
:global(body.tema-publico-azul) .etiqueta-seccion { color: #79dff7; }
:global(body.tema-publico-azul) .temporada-equipo,
:global(body.tema-publico-azul) .nota-verificacion-equipo,
:global(body.tema-publico-azul) .fila-partido-equipo p,
:global(body.tema-publico-azul) .fila-partido-equipo small,
:global(body.tema-publico-azul) .lista-partidos-equipo time,
:global(body.tema-publico-azul) .lista-partidos-equipo li > small,
:global(body.tema-publico-azul) .estado-equipo-vacio,
:global(body.tema-publico-azul) .panel-equipo-publico > small,
:global(body.tema-publico-azul) .panel-sede-equipo small { color: #b4c9df; }
:global(body.tema-publico-azul) .navegacion-equipo { border-color: #294563; }
:global(body.tema-publico-azul) .navegacion-equipo a,
:global(body.tema-publico-azul) .estadisticas-clasificacion-equipo > div,
:global(body.tema-publico-azul) .grilla-noticias-equipo article { color: #e5efff; border-color: #294563; background: #132f4d; }
:global(body.tema-publico-azul) .navegacion-equipo a { color: #9aeaff; }
:global(body.tema-publico-azul) .estadisticas-clasificacion-equipo strong,
:global(body.tema-publico-azul) .duelo-equipo > b { color: #8ce8ff; }
:global(body.tema-publico-azul) .grilla-noticias-equipo article > p:not(.etiqueta-seccion) { color: #c1d1e2; }
:global(body.tema-publico-azul) .fila-partido-equipo,
:global(body.tema-publico-azul) .lista-partidos-equipo li,
:global(body.tema-publico-azul) .enlace-panel-equipo { border-color: #294563; }
:global(body.tema-publico-azul) .navegacion-equipo a:hover,
:global(body.tema-publico-azul) .navegacion-equipo a:focus-visible { background: #1a4164; }

@media (max-width: 800px) {
  .contenido-equipo-grid { grid-template-columns: minmax(0, 1fr); }
  .columna-secundaria-equipo { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
  .columna-secundaria-equipo :deep(.slot-publicidad) { grid-column: 1 / -1; }
}
@media (max-width: 560px) {
  .equipo-hero { grid-template-columns: minmax(0, 1fr); }
  .equipo-identidad { align-items: flex-start; gap: 14px; }
  .escudo-equipo-hero { flex-basis: 76px; width: 76px; height: 76px; border-radius: 16px; }
  .resumen-posicion-equipo { grid-template-columns: auto auto 1fr; align-items: center; gap: 10px; text-align: left; }
  .resumen-posicion-equipo strong { font-size: 1.8rem; }
  .navegacion-equipo { grid-column: 1; }
  .lista-partidos-equipo li { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; }
  .lista-partidos-equipo time { grid-column: 1; }
  .duelo-equipo { grid-column: 1 / -1; grid-row: 2; }
  .lista-partidos-equipo li > small { grid-column: 1 / -1; }
  .enlace-partido-equipo { grid-column: 2; grid-row: 1; }
  .columna-secundaria-equipo, .grilla-noticias-equipo { grid-template-columns: minmax(0, 1fr); }
}
</style>
