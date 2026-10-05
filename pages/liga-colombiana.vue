<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { construirUrlAbsoluta } from '~/utils/seo'

interface PartidoLiga {
  slug: string
  competencia: string
  temporada: string
  jornada: string | null
  fechaIso: string
  local: string
  visitante: string
  estado: string
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  ciudad: string | null
  escudoLocal: string | null
  escudoVisitante: string | null
  verificadoEn: string
}

interface PosicionLiga {
  competencia: string
  temporada: string
  fase: string
  equipoClave: string
  equipo: string
  posicion: number
  jugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferencia: number
  puntos: number
  escudo: string | null
  verificadoEn: string
}

interface RespuestaLiga {
  estado: 'disponible' | 'sin_datos'
  partidos: PartidoLiga[]
  tabla: PosicionLiga[]
  actualizadoEn: string | null
  consultadoEn: string
}

const configuracion = useRuntimeConfig()
const respuestaLigaVacia: RespuestaLiga = {
  estado: 'sin_datos',
  partidos: [],
  tabla: [],
  actualizadoEn: null,
  consultadoEn: ''
}
const { data: datosLiga } = await useFetch<RespuestaLiga>('/api/liga-colombiana', {
  default: (): RespuestaLiga => respuestaLigaVacia,
  key: 'liga-colombiana-hub'
})
const { data: noticias } = await useFetch<ResumenArticuloPublico[]>(
  '/api/articulos?tema=liga-betplay&limite=16',
  { default: () => [], key: 'noticias-liga-betplay' }
)

const escudosFallidos = ref<string[]>([])
const liga = computed(() => datosLiga.value || respuestaLigaVacia)
const noticiaPrincipal = computed(() => noticias.value?.[0] || null)
const ultimasNoticias = computed(() => noticias.value?.slice(1) || [])
const tablaLiga = computed(() => liga.value.tabla.filter(fila => fila.competencia === 'liga-betplay'))
const tablaTorneo = computed(() => liga.value.tabla.filter(fila => fila.competencia === 'torneo-betplay'))
const ahora = computed(() => Date.parse(liga.value.consultadoEn) || 0)
const partidosProximos = computed(() => liga.value.partidos
  .filter(partido => Date.parse(partido.fechaIso) >= ahora.value - 12 * 60 * 60 * 1000)
  .slice(0, 12))
const partidosRecientes = computed(() => liga.value.partidos
  .filter(partido => Date.parse(partido.fechaIso) < ahora.value - 12 * 60 * 60 * 1000)
  .slice(-6)
  .reverse())

function fechaPartido(valor: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date(valor))
}

function etiquetaCompetencia(slug: string) {
  if (slug === 'torneo-betplay') return 'Torneo BetPlay'
  if (slug === 'copa-colombia') return 'Copa Colombia'
  return 'Liga BetPlay'
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toLocaleUpperCase('es-CO')
}

function hayEscudo(url: string | null) {
  return Boolean(url && !escudosFallidos.value.includes(url))
}

function escudoFallido(url: string | null) {
  if (url && !escudosFallidos.value.includes(url)) escudosFallidos.value = [...escudosFallidos.value, url]
}

useSeoPont3la10(() => ({
  titulo: 'Liga Colombiana: Liga BetPlay, Torneo y Copa Colombia | Pont3la10',
  descripcion: 'Sigue la Liga BetPlay y el fútbol colombiano: tabla de posiciones, calendario, resultados y noticias actualizadas de Liga A, Torneo B y Copa Colombia.',
  rutaCanonica: '/liga-colombiana',
  seccion: 'Fútbol colombiano',
  datosEstructurados: [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Liga Colombiana',
    description: 'Noticias, tabla de posiciones, resultados y próximos partidos del fútbol profesional colombiano.',
    inLanguage: 'es-CO',
    url: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: (noticias.value || []).map((noticia, indice) => ({
        '@type': 'ListItem',
        position: indice + 1,
        name: noticia.titulo,
        url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/articulos/${noticia.slug}`)
      }))
    }
  }, {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/') },
      { '@type': 'ListItem', position: 2, name: 'Liga colombiana', item: construirUrlAbsoluta(String(configuracion.public.siteUrl), '/liga-colombiana') }
    ]
  }]
}))
</script>

<template>
  <main class="pagina-contenido pagina-publica-medio modulo-futbol-colombia">
    <nav class="migas-navegacion" aria-label="Migas de pan">
      <ol>
        <li><NuxtLink to="/">Inicio</NuxtLink></li>
        <li><span class="miga-actual" aria-current="page">Liga colombiana</span></li>
      </ol>
    </nav>

    <header class="cabecera-pagina cabecera-noticias-medio cabecera-liga-colombia">
      <img class="liga-colombia-ambiente" src="/editorial/liga-betplay-ambiente.gif" alt="" aria-hidden="true">
      <div>
        <p class="etiqueta-seccion">FÚTBOL COLOMBIANO</p>
        <h1>Liga Colombiana</h1>
        <p>Noticias, posiciones, resultados y próximos partidos de la Liga BetPlay, el Torneo BetPlay y la Copa Colombia.</p>
      </div>
      <nav class="navegacion-liga-colombia" aria-label="Secciones de fútbol colombiano">
        <a href="#liga-betplay">Liga BetPlay</a>
        <a href="#torneo-betplay">Torneo BetPlay</a>
        <a href="#partidos">Partidos</a>
        <a href="#posiciones">Tabla</a>
        <a href="#noticias">Noticias</a>
      </nav>
    </header>

    <div class="grilla-principal-liga">
      <section class="columna-editorial-liga" aria-label="Actualidad de la Liga Colombiana">
        <article v-if="noticiaPrincipal" class="noticia-destacada-medio">
          <NuxtLink
            v-if="noticiaPrincipal.imagen"
            :to="`/articulos/${noticiaPrincipal.slug}`"
            class="imagen-noticia-destacada"
            tabindex="-1"
            aria-hidden="true"
          >
            <img :src="noticiaPrincipal.imagen" :alt="noticiaPrincipal.titulo">
          </NuxtLink>
          <div class="contenido-noticia-destacada">
            <p class="etiqueta-seccion">{{ noticiaPrincipal.categoria }} · ÚLTIMA HORA</p>
            <h2><NuxtLink :to="`/articulos/${noticiaPrincipal.slug}`">{{ noticiaPrincipal.titulo }}</NuxtLink></h2>
            <p>{{ noticiaPrincipal.resumen }}</p>
            <NuxtLink class="boton-leer-noticia" :to="`/articulos/${noticiaPrincipal.slug}`">Leer noticia <span aria-hidden="true">→</span></NuxtLink>
          </div>
        </article>
        <section v-else class="estado-vacio-articulos">
          <h2>Actualidad del fútbol colombiano</h2>
          <p>Las noticias de Liga A, Torneo B y Copa Colombia aparecerán aquí cuando sean publicadas por el equipo editorial.</p>
          <NuxtLink class="boton-primario" to="/articulos?categoria=futbol-colombiano">Ver fútbol colombiano</NuxtLink>
        </section>

        <PublicidadAdsterraSlot formato="leaderboard" contexto="liga colombiana" />

        <section id="partidos" class="bloque-liga-colombia" aria-labelledby="titulo-partidos-liga">
          <div class="encabezado-noticias-listado">
            <div>
              <p class="etiqueta-seccion">CALENDARIO Y MARCADORES</p>
              <h2 id="titulo-partidos-liga">Próximos partidos</h2>
            </div>
            <NuxtLink to="/partidos-hoy">Partidos de hoy <span aria-hidden="true">→</span></NuxtLink>
          </div>
          <div v-if="partidosProximos.length" class="lista-partidos-liga">
            <article v-for="partido in partidosProximos" :key="`${partido.competencia}-${partido.local}-${partido.fechaIso}`" class="tarjeta-partido-liga">
              <div class="meta-partido-liga">
                <span>{{ etiquetaCompetencia(partido.competencia) }}</span>
                <span v-if="partido.jornada">{{ partido.jornada }}</span>
              </div>
              <p class="fecha-partido-liga">{{ fechaPartido(partido.fechaIso) }}</p>
              <div class="equipos-partido-liga">
                <span class="equipo-liga">
                  <NuxtLink v-if="hayEscudo(partido.escudoLocal)" :to="`/donde-ver/${partido.slug}`" :aria-label="`Dónde ver ${partido.local} vs ${partido.visitante}`">
                    <img :src="partido.escudoLocal || ''" :alt="`Escudo de ${partido.local}`" @error="escudoFallido(partido.escudoLocal)">
                  </NuxtLink>
                  <b v-if="!hayEscudo(partido.escudoLocal)" class="escudo-fallback" aria-hidden="true">{{ iniciales(partido.local) }}</b>
                  <strong>{{ partido.local }}</strong>
                </span>
                <span class="versus-liga">{{ partido.golesLocal !== null && partido.golesVisitante !== null ? `${partido.golesLocal}–${partido.golesVisitante}` : 'vs' }}</span>
                <span class="equipo-liga visitante">
                  <NuxtLink v-if="hayEscudo(partido.escudoVisitante)" :to="`/donde-ver/${partido.slug}`" :aria-label="`Dónde ver ${partido.local} vs ${partido.visitante}`">
                    <img :src="partido.escudoVisitante || ''" :alt="`Escudo de ${partido.visitante}`" @error="escudoFallido(partido.escudoVisitante)">
                  </NuxtLink>
                  <b v-if="!hayEscudo(partido.escudoVisitante)" class="escudo-fallback" aria-hidden="true">{{ iniciales(partido.visitante) }}</b>
                  <strong>{{ partido.visitante }}</strong>
                </span>
              </div>
              <nav class="enlaces-partido-liga" :aria-label="`Páginas de ${partido.local} vs ${partido.visitante}`">
                <NuxtLink :to="`/donde-ver/${partido.slug}`">Dónde ver</NuxtLink>
                <NuxtLink :to="`/como-quedo/${partido.slug}`">Cómo quedó</NuxtLink>
              </nav>
              <p v-if="partido.estadio || partido.ciudad" class="sede-partido-liga">{{ [partido.estadio, partido.ciudad].filter(Boolean).join(' · ') }}</p>
            </article>
          </div>
          <div v-else class="estado-vacio-articulos">
            <h3>Calendario en actualización</h3>
            <p>No hay partidos verificados en el rango publicado. Consulta el <a href="https://dimayor.com.co/" target="_blank" rel="noopener noreferrer">calendario oficial de DIMAYOR</a>.</p>
          </div>
        </section>

        <section v-if="partidosRecientes.length" class="bloque-liga-colombia">
          <div class="encabezado-noticias-listado"><h2>Resultados recientes</h2></div>
          <div class="lista-partidos-liga">
            <article v-for="partido in partidosRecientes" :key="`${partido.competencia}-${partido.visitante}-${partido.fechaIso}`" class="tarjeta-partido-liga resultado-reciente-liga">
              <span>{{ etiquetaCompetencia(partido.competencia) }} · {{ fechaPartido(partido.fechaIso) }}</span>
              <strong>{{ partido.local }} <b>{{ partido.golesLocal ?? '—' }}–{{ partido.golesVisitante ?? '—' }}</b> {{ partido.visitante }}</strong>
            </article>
          </div>
        </section>
      </section>

      <aside class="columna-tabla-liga" aria-label="Posiciones de la Liga Colombiana">
        <section id="posiciones" class="panel-noticias-lateral panel-tabla-liga">
          <div class="encabezado-panel-lateral">
            <div><p class="etiqueta-seccion">{{ tablaLiga[0]?.temporada || 'Liga BetPlay' }}</p><h2>Tabla de posiciones</h2></div>
          </div>
          <div v-if="tablaLiga.length" class="tabla-liga-scroll">
            <table>
              <caption>Posiciones de la Liga BetPlay, {{ tablaLiga[0]?.temporada }}</caption>
              <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">DG</th><th scope="col">Pts</th></tr></thead>
              <tbody>
                <tr v-for="fila in tablaLiga" :key="fila.equipoClave">
                  <td>{{ fila.posicion }}</td>
                  <th scope="row"><span class="equipo-tabla-liga"><img v-if="hayEscudo(fila.escudo)" :src="fila.escudo || ''" :alt="`Escudo de ${fila.equipo}`" loading="lazy" @error="escudoFallido(fila.escudo)"><b v-else class="escudo-fallback" aria-hidden="true">{{ iniciales(fila.equipo) }}</b>{{ fila.equipo }}</span></th>
                  <td>{{ fila.jugados }}</td><td>{{ fila.diferencia > 0 ? `+${fila.diferencia}` : fila.diferencia }}</td><td><strong>{{ fila.puntos }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="estado-tabla-liga">La clasificación verificada de Liga BetPlay todavía no está disponible.</p>
          <NuxtLink class="enlace-tabla-liga" to="/resultados/futbol">Ver resultados de fútbol <span aria-hidden="true">→</span></NuxtLink>
        </section>

        <PublicidadAdsterraSlot formato="nativo" contexto="tabla liga colombiana" />

        <section id="torneo-betplay" class="panel-noticias-lateral panel-tabla-liga">
          <div class="encabezado-panel-lateral"><div><p class="etiqueta-seccion">{{ tablaTorneo[0]?.temporada || 'Segunda división' }}</p><h2>Torneo BetPlay</h2></div></div>
          <div v-if="tablaTorneo.length" class="tabla-liga-scroll">
            <table>
              <caption>Posiciones del Torneo BetPlay, {{ tablaTorneo[0]?.temporada }}</caption>
              <thead><tr><th scope="col">Pos.</th><th scope="col">Equipo</th><th scope="col">PJ</th><th scope="col">DG</th><th scope="col">Pts</th></tr></thead>
              <tbody><tr v-for="fila in tablaTorneo" :key="fila.equipoClave"><td>{{ fila.posicion }}</td><th scope="row">{{ fila.equipo }}</th><td>{{ fila.jugados }}</td><td>{{ fila.diferencia > 0 ? `+${fila.diferencia}` : fila.diferencia }}</td><td><strong>{{ fila.puntos }}</strong></td></tr></tbody>
            </table>
          </div>
          <p v-else class="estado-tabla-liga">La tabla del Torneo BetPlay aparecerá aquí cuando haya datos públicos verificados.</p>
        </section>
      </aside>
    </div>

    <section id="liga-betplay" class="bloque-liga-colombia seccion-noticias-liga">
      <div class="encabezado-noticias-listado"><div><p class="etiqueta-seccion">ACTUALIDAD</p><h2 id="noticias">Últimas noticias de Liga BetPlay y Copa Colombia</h2></div><NuxtLink to="/articulos?categoria=futbol-colombiano">Ver fútbol colombiano <span aria-hidden="true">→</span></NuxtLink></div>
      <div v-if="ultimasNoticias.length" class="grilla-noticias-medio">
        <article v-for="articulo in ultimasNoticias" :key="articulo.slug" class="tarjeta-noticia-medio">
          <NuxtLink v-if="articulo.imagen" :to="`/articulos/${articulo.slug}`" class="imagen-tarjeta-noticia-medio" tabindex="-1" aria-hidden="true"><img :src="articulo.imagen" :alt="articulo.titulo" loading="lazy"></NuxtLink>
          <div><p class="etiqueta-seccion">{{ articulo.categoria }}</p><h3><NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink></h3><p class="meta-noticia-medio">{{ new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(articulo.publicadoEn)) }}</p></div>
        </article>
      </div>
      <p v-else class="estado-vacio-articulos">Aún no hay noticias publicadas bajo la etiqueta Liga BetPlay.</p>
      <p class="contenido-seo-liga">Consulta la actualidad de la Liga BetPlay Dimayor, la tabla de posiciones, las fechas del campeonato y los resultados del fútbol profesional colombiano. También encontrarás noticias de Copa Colombia y del Torneo BetPlay, con información que se actualiza cuando hay datos oficiales publicados.</p>
    </section>
  </main>
</template>

<style scoped>
.cabecera-liga-colombia { position: relative; overflow: hidden; min-height: 210px; align-content: end; border-radius: 12px; background: #0b2341; padding: 28px; }
.liga-colombia-ambiente { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .32; }
.cabecera-liga-colombia > div, .navegacion-liga-colombia { position: relative; z-index: 1; }
.cabecera-liga-colombia h1, .cabecera-liga-colombia p:not(.etiqueta-seccion) { color: #fff; }
.cabecera-liga-colombia .etiqueta-seccion { color: #ffd343; }
body.tema-publico-azul main.modulo-futbol-colombia :is(h2, h3) { color: #edf3ff; }
body.tema-publico-blanco main.modulo-futbol-colombia :is(h2, h3) { color: #08204a; }
body.tema-publico-azul main.modulo-futbol-colombia .etiqueta-seccion { color: #78dcf4; }
body.tema-publico-blanco main.modulo-futbol-colombia .etiqueta-seccion { color: #145996; }
body.tema-publico-blanco main.modulo-futbol-colombia .cabecera-liga-colombia .etiqueta-seccion { color: #ffd343; }
main.modulo-futbol-colombia .encabezado-noticias-listado h2 { color: #08204a; }
main.modulo-futbol-colombia .encabezado-noticias-listado p { color: #145996; }
body.tema-publico-azul main.modulo-futbol-colombia .encabezado-noticias-listado h2 { color: #edf3ff; }
body.tema-publico-azul main.modulo-futbol-colombia .encabezado-noticias-listado p { color: #78dcf4; }
body.tema-publico-blanco main.modulo-futbol-colombia .encabezado-noticias-listado h2 { color: #08204a; }
body.tema-publico-blanco main.modulo-futbol-colombia .encabezado-noticias-listado p { color: #145996; }
.navegacion-liga-colombia { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 18px; }
.navegacion-liga-colombia a { border: 1px solid rgba(255,255,255,.28); border-radius: 999px; color: #fff; padding: 8px 13px; text-decoration: none; }
.grilla-principal-liga { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .85fr); gap: 24px; margin-top: 24px; }
.columna-editorial-liga, .columna-tabla-liga { display: grid; align-content: start; gap: 22px; min-width: 0; }
.bloque-liga-colombia { margin-top: 32px; }
.encabezado-noticias-listado h2, .encabezado-panel-lateral h2 { margin: 0; }
.lista-partidos-liga { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.tarjeta-partido-liga, .panel-tabla-liga { border: 1px solid #294362; border-radius: 12px; background: #10243d; padding: 16px; }
.meta-partido-liga, .tarjeta-partido-liga > span, .fecha-partido-liga, .sede-partido-liga { color: #afc2db; font-size: .82rem; }
.meta-partido-liga { display: flex; justify-content: space-between; gap: 10px; color: #78dcf4; font-weight: 800; }
.fecha-partido-liga { margin: 10px 0; }
.equipos-partido-liga { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 8px; }
.equipo-liga { display: flex; align-items: center; gap: 8px; min-width: 0; }
.equipo-liga strong { overflow-wrap: anywhere; }
.equipo-liga img, .equipo-tabla-liga img { width: 30px; height: 30px; object-fit: contain; flex: 0 0 auto; }
.equipo-liga.visitante { justify-content: flex-end; text-align: right; }
.versus-liga { color: #ffd343; font-weight: 900; }
.escudo-fallback { display: inline-grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; border-radius: 50%; background: #17466b; color: #fff; font-size: .65rem; }
.sede-partido-liga { margin: 12px 0 0; }
.enlaces-partido-liga { display: flex; gap: 14px; margin-top: 12px; }
.enlaces-partido-liga a { color: #78dcf4; font-size: .82rem; font-weight: 800; }
.tabla-liga-scroll { overflow-x: auto; }
.tabla-liga-scroll table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.tabla-liga-scroll caption { text-align: left; padding: 0 0 10px; color: #afc2db; }
.tabla-liga-scroll th, .tabla-liga-scroll td { border-bottom: 1px solid rgba(157,176,201,.2); padding: 9px 5px; text-align: right; white-space: nowrap; }
.tabla-liga-scroll th:nth-child(2), .tabla-liga-scroll td:nth-child(2) { text-align: left; }
.equipo-tabla-liga { display: inline-flex; align-items: center; gap: 8px; white-space: normal; }
.estado-tabla-liga, .contenido-seo-liga { color: #afc2db; line-height: 1.7; }
.enlace-tabla-liga { display: inline-block; margin-top: 12px; color: #78dcf4; font-weight: 800; }
.resultado-reciente-liga strong { display: block; margin-top: 8px; }
.resultado-reciente-liga strong b { color: #ffd343; padding: 0 5px; }
.seccion-noticias-liga { margin-top: 36px; }
.contenido-seo-liga { max-width: 920px; margin-top: 24px; }
body.tema-publico-blanco .tarjeta-partido-liga, body.tema-publico-blanco .panel-tabla-liga { border-color: #dce5f1; background: #fff; color: #13253d; }
body.tema-publico-blanco .meta-partido-liga, body.tema-publico-blanco .tarjeta-partido-liga > span, body.tema-publico-blanco .fecha-partido-liga, body.tema-publico-blanco .sede-partido-liga, body.tema-publico-blanco .tabla-liga-scroll caption, body.tema-publico-blanco .estado-tabla-liga, body.tema-publico-blanco .contenido-seo-liga { color: #586980; }
body.tema-publico-blanco .enlaces-partido-liga a { color: #145996; }
body.tema-publico-blanco .tabla-liga-scroll th, body.tema-publico-blanco .tabla-liga-scroll td { border-color: #e2e8f0; }
@media (max-width: 820px) { .grilla-principal-liga { grid-template-columns: minmax(0, 1fr); } .lista-partidos-liga { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .cabecera-liga-colombia { padding: 20px; } .pagina-publica-medio.modulo-futbol-colombia { width: min(100% - 24px, 1240px); } }
</style>
