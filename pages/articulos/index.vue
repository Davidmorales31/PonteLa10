<script setup lang="ts">
import {
  ArrowDown,
  ChevronDown,
  Cpu,
  Flame,
  Flag,
  Globe2,
  LayoutGrid,
  LoaderCircle,
  Mail,
  MessageCircle,
  Trophy
} from '@lucide/vue'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { ArticuloResumen } from '~/types/editorial'
import type { RespuestaResultados } from '~/types/resultados'
import {
  aumentarNoticiasVisibles,
  combinarArticulosPublicos,
  construirFiltrosConsultaArticulos,
  normalizarTextoBusqueda,
  obtenerEtiquetaCategoria
} from '~/utils/articulosLanding'
import { construirUrlAbsoluta, robotsNoIndex } from '~/utils/seo'

type ArticuloListado = ArticuloResumen & { fechaPublicacion: string }
type PaginaArticulosPublicos = {
  articulos: ResumenArticuloPublico[]
  hayMas: boolean
}

const limitePaginaArticulos = 20
const incrementoNoticiasVisibles = 6

const rutaActual = useRoute()
const filtrosConsulta = computed(() => construirFiltrosConsultaArticulos(
  rutaActual.query as Record<string, unknown>
))
const parametrosPaginaInicial = computed(() => ({
  paginado: 'true',
  limite: limitePaginaArticulos,
  ...filtrosConsulta.value
}))
const { data: resultados, status: estadoResultados } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'resultados-noticias',
  lazy: true
})
const {
  data: paginaInicial,
  refresh: recargarPaginaInicial,
  status: estadoPaginaInicial
} = await useFetch<PaginaArticulosPublicos>('/api/articulos', {
  key: 'pagina-articulos-publicos',
  query: parametrosPaginaInicial,
  watch: false,
  default: () => ({ articulos: [], hayMas: false }),
})

const articulosCargados = ref(paginaInicial.value?.articulos || [])
const hayMasDesdeServidor = ref(paginaInicial.value?.hayMas || false)
const desplazamientoSiguiente = ref(articulosCargados.value.length)
const cantidadNoticiasVisibles = ref(incrementoNoticiasVisibles)
const cargandoMasNoticias = ref(false)
const mensajeCargaNoticias = ref('')
const errorCargaNoticias = ref('')
const imagenesFallidas = ref<string[]>([])
let generacionFiltros = 0

watch(filtrosConsulta, () => {
  generacionFiltros += 1
  articulosCargados.value = []
  hayMasDesdeServidor.value = false
  desplazamientoSiguiente.value = 0
  cantidadNoticiasVisibles.value = incrementoNoticiasVisibles
  mensajeCargaNoticias.value = ''
  errorCargaNoticias.value = ''
  void recargarPaginaInicial()
}, { deep: true })

watch([estadoPaginaInicial, paginaInicial], ([estado, pagina]) => {
  if (estado === 'pending') return

  if (estado === 'error') {
    articulosCargados.value = []
    hayMasDesdeServidor.value = false
    desplazamientoSiguiente.value = 0
    errorCargaNoticias.value = 'No se pudieron cargar las noticias. Inténtalo de nuevo.'
    return
  }

  articulosCargados.value = pagina?.articulos || []
  hayMasDesdeServidor.value = pagina?.hayMas || false
  desplazamientoSiguiente.value = articulosCargados.value.length
}, { immediate: true })

const articulosPublicados = computed<ArticuloListado[]>(() =>
  articulosCargados.value.map(articulo => ({
    slug: articulo.slug,
    titulo: articulo.titulo,
    bajada: articulo.resumen,
    categoria: articulo.categoria,
    autor: articulo.autorNombre,
    publicadoHace: new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium'
    }).format(new Date(articulo.publicadoEn)),
    fechaPublicacion: articulo.publicadoEn,
    lecturaMinutos: articulo.lecturaMinutos,
    imagen: articulo.imagen
  }))
)

const articulosDisponibles = computed(() => articulosPublicados.value)

const terminoBusqueda = computed(() => String(rutaActual.query.buscar || '').trim())
const categoriaBusqueda = computed(() => normalizarTextoBusqueda(String(rutaActual.query.categoria || '')))
const temaBusqueda = computed(() => String(rutaActual.query.tema || '').trim())
const filtrosActivos = computed(() => Boolean(
  filtrosConsulta.value.categoria || filtrosConsulta.value.tema || filtrosConsulta.value.buscar
))
const articulosFiltrados = computed(() => articulosDisponibles.value)

const tituloListado = computed(() => {
  if (rutaActual.query.buscar) {
    return `Resultados para “${String(rutaActual.query.buscar)}”`
  }

  if (rutaActual.query.categoria) {
    return `Noticias de ${obtenerEtiquetaCategoria(String(rutaActual.query.categoria))}`
  }

  return 'Noticias'
})
const configuracion = useRuntimeConfig()
const esBusquedaInterna = computed(() => Boolean(terminoBusqueda.value || temaBusqueda.value))
const rutaCanonica = computed(() => rutaActual.query.categoria && !esBusquedaInterna.value
  ? `/articulos?categoria=${encodeURIComponent(String(rutaActual.query.categoria))}`
  : '/articulos')
const filtrosRapidos = [
  { etiqueta: 'Todos', ruta: '/articulos', categoria: '', icono: LayoutGrid },
  { etiqueta: 'Selección Colombia', ruta: '/articulos?categoria=colombia', categoria: 'colombia', icono: Flag },
  { etiqueta: 'Liga BetPlay', ruta: '/articulos?categoria=futbol-colombiano', categoria: 'futbol-colombiano', icono: Trophy },
  { etiqueta: 'Internacional', ruta: '/articulos?categoria=futbol-mundial', categoria: 'futbol-mundial', icono: Globe2 },
  { etiqueta: 'Opinión', ruta: '/articulos?categoria=opinion', categoria: 'opinion', icono: MessageCircle },
  { etiqueta: 'Tech', ruta: '/articulos?categoria=tecnologia', categoria: 'tecnologia', icono: Cpu }
]
const noticiaPrincipal = computed(() => articulosFiltrados.value[0] || null)
const todasUltimasNoticias = computed(() => articulosFiltrados.value
  .filter(articulo => articulo.slug !== noticiaPrincipal.value?.slug)
)
const ultimasNoticias = computed(() => todasUltimasNoticias.value
  .slice(0, cantidadNoticiasVisibles.value)
)
const hayMasNoticias = computed(() =>
  cantidadNoticiasVisibles.value < todasUltimasNoticias.value.length || hayMasDesdeServidor.value
)
const noticiasTendencia = computed(() => articulosFiltrados.value
  .filter(articulo => articulo.slug !== noticiaPrincipal.value?.slug)
  .slice(0, 5)
)
const noticiaLateral = computed(() => noticiasTendencia.value.find(tieneImagen) || noticiasTendencia.value[0] || null)

async function cargarMasNoticias() {
  if (cargandoMasNoticias.value || !hayMasNoticias.value) return

  mensajeCargaNoticias.value = ''
  errorCargaNoticias.value = ''
  const objetivoVisibles = cantidadNoticiasVisibles.value + incrementoNoticiasVisibles

  if (cantidadNoticiasVisibles.value < todasUltimasNoticias.value.length) {
    cantidadNoticiasVisibles.value = aumentarNoticiasVisibles(
      cantidadNoticiasVisibles.value,
      todasUltimasNoticias.value.length,
      incrementoNoticiasVisibles
    )
    return
  }

  cargandoMasNoticias.value = true
  const generacionSolicitud = generacionFiltros

  try {
    let paginasConsultadas = 0

    while (
      hayMasDesdeServidor.value
      && todasUltimasNoticias.value.length < objetivoVisibles
      && paginasConsultadas < 3
    ) {
      const pagina = await $fetch<PaginaArticulosPublicos>('/api/articulos', {
        query: {
          ...parametrosPaginaInicial.value,
          desplazamiento: desplazamientoSiguiente.value
        }
      })

      if (generacionSolicitud !== generacionFiltros) return

      articulosCargados.value = combinarArticulosPublicos(
        articulosCargados.value,
        pagina.articulos
      )
      desplazamientoSiguiente.value += pagina.articulos.length
      hayMasDesdeServidor.value = pagina.hayMas
      paginasConsultadas += 1
    }

    if (todasUltimasNoticias.value.length > cantidadNoticiasVisibles.value) {
      cantidadNoticiasVisibles.value = aumentarNoticiasVisibles(
        cantidadNoticiasVisibles.value,
        todasUltimasNoticias.value.length,
        incrementoNoticiasVisibles
      )
      return
    }

    mensajeCargaNoticias.value = hayMasDesdeServidor.value
      ? 'No encontramos más noticias de este filtro en los últimos resultados consultados. Puedes seguir buscando.'
      : 'Llegaste al final de las noticias disponibles para este filtro.'
  } catch {
    errorCargaNoticias.value = 'No se pudieron cargar más noticias. Inténtalo de nuevo.'
  } finally {
    cargandoMasNoticias.value = false
  }
}

function filtroActivo(categoria: string) {
  if (!categoria) return !categoriaBusqueda.value
  return categoriaBusqueda.value === categoria
}

function tieneImagen(articulo: ArticuloResumen) {
  const imagen = articulo.imagen?.trim()
  return Boolean(imagen && !imagenesFallidas.value.includes(imagen))
}

function registrarImagenFallida(imagen?: string) {
  if (!imagen || imagenesFallidas.value.includes(imagen)) return
  imagenesFallidas.value = [...imagenesFallidas.value, imagen]
}

useSeoPont3la10(() => {
  const titulo = rutaActual.query.categoria && !esBusquedaInterna.value
    ? `${tituloListado.value} | Pont3la10`
    : 'Noticias y análisis deportivo | Pont3la10'
  const descripcion = rutaActual.query.categoria && !esBusquedaInterna.value
    ? `Noticias, análisis y actualidad de ${obtenerEtiquetaCategoria(String(rutaActual.query.categoria))} en Pont3la10.`
    : 'Noticias y análisis de fútbol, tecnología deportiva, gaming y tendencias con contexto claro y criterio editorial.'

  return {
    titulo,
    descripcion,
    rutaCanonica: rutaCanonica.value,
    robots: esBusquedaInterna.value ? robotsNoIndex : undefined,
    datosEstructurados: esBusquedaInterna.value
      ? undefined
      : {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: tituloListado.value,
          description: descripcion,
          inLanguage: 'es-CO',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: articulosFiltrados.value.map((articulo, indice) => ({
              '@type': 'ListItem',
              position: indice + 1,
              name: articulo.titulo,
              url: construirUrlAbsoluta(
                String(configuracion.public.siteUrl),
                `/articulos/${articulo.slug}`
              )
            }))
          }
        }
  }
})
</script>

<template>
  <div class="pagina-noticias-shell">
    <EsqueletoResultados v-if="estadoResultados === 'pending'" tipo="franja" />
    <FranjaMarcadores v-else-if="resultados?.partidos.length" :partidos="resultados.partidos" />

    <section class="pagina-contenido pagina-publica-medio pagina-noticias-medio">
      <div class="cabecera-pagina cabecera-noticias-medio">
        <h1>{{ tituloListado }}</h1>
        <p>Todo el fútbol, en un solo lugar. Análisis, historias, fichajes y la actualidad del deporte que nos mueve.</p>
      </div>

      <nav class="filtros-rapidos-noticias filtros-noticias-medio" aria-label="Filtrar noticias">
        <NuxtLink
          v-for="filtro in filtrosRapidos"
          :key="filtro.etiqueta"
          :to="filtro.ruta"
          :class="{ activo: filtroActivo(filtro.categoria) }"
        >
          <component :is="filtro.icono" class="filtro-noticias-icono" aria-hidden="true" />
          {{ filtro.etiqueta }}
        </NuxtLink>
      </nav>
      <p v-if="terminoBusqueda && estadoPaginaInicial !== 'pending' && !errorCargaNoticias" class="contador-resultados">{{ articulosFiltrados.length }} {{ articulosFiltrados.length === 1 ? 'resultado' : 'resultados' }}</p>

      <p
        v-if="estadoPaginaInicial === 'pending' && filtrosActivos"
        class="estado-carga-noticias"
        role="status"
        aria-busy="true"
      >
        Buscando noticias con esos criterios…
      </p>
      <div v-else-if="noticiaPrincipal" class="noticias-medio-grid">
        <main class="noticias-medio-principal">
          <article class="noticia-destacada-medio" :class="{ 'sin-imagen': !tieneImagen(noticiaPrincipal) }">
            <NuxtLink v-if="tieneImagen(noticiaPrincipal)" :to="`/articulos/${noticiaPrincipal.slug}`" class="imagen-noticia-destacada" tabindex="-1" aria-hidden="true">
              <img :src="noticiaPrincipal.imagen" :alt="noticiaPrincipal.titulo" @error="registrarImagenFallida(noticiaPrincipal.imagen)">
            </NuxtLink>
            <div class="contenido-noticia-destacada">
              <p class="etiqueta-seccion">{{ noticiaPrincipal.categoria }}</p>
              <h2>
                <NuxtLink :to="`/articulos/${noticiaPrincipal.slug}`">{{ noticiaPrincipal.titulo }}</NuxtLink>
              </h2>
              <p>{{ noticiaPrincipal.bajada }}</p>
              <NuxtLink class="boton-leer-noticia" :to="`/articulos/${noticiaPrincipal.slug}`">Leer noticia <span aria-hidden="true">→</span></NuxtLink>
            </div>
          </article>

          <section class="bloque-ultimas-noticias-medio" aria-labelledby="titulo-ultimas-noticias-listado">
            <div class="encabezado-noticias-listado">
              <h2 id="titulo-ultimas-noticias-listado">Últimas noticias</h2>
              <p>Ordenar por: <strong>Más recientes</strong> <ChevronDown aria-hidden="true" /></p>
            </div>
            <div v-if="ultimasNoticias.length" id="lista-ultimas-noticias" class="grilla-noticias-medio">
              <article
                v-for="articulo in ultimasNoticias"
                :key="articulo.slug"
                class="tarjeta-noticia-medio"
                :class="{ 'sin-imagen': !tieneImagen(articulo) }"
              >
                <NuxtLink v-if="tieneImagen(articulo)" :to="`/articulos/${articulo.slug}`" class="imagen-tarjeta-noticia-medio" tabindex="-1" aria-hidden="true">
                  <img :src="articulo.imagen" :alt="articulo.titulo" loading="lazy" @error="registrarImagenFallida(articulo.imagen)">
                </NuxtLink>
                <div>
                  <p class="etiqueta-seccion">{{ articulo.categoria }}</p>
                  <h3>
                    <NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink>
                  </h3>
                  <p class="meta-noticia-medio">
                    {{ articulo.publicadoHace }}<template v-if="articulo.lecturaMinutos"> · {{ articulo.lecturaMinutos }} min</template>
                  </p>
                </div>
              </article>
            </div>
            <button
              v-if="hayMasNoticias"
              class="boton-cargar-noticias"
              type="button"
              aria-controls="lista-ultimas-noticias"
              :disabled="cargandoMasNoticias"
              :aria-busy="cargandoMasNoticias"
              @click="cargarMasNoticias"
            >
              <LoaderCircle v-if="cargandoMasNoticias" class="icono-carga-noticias girando" aria-hidden="true" />
              <ArrowDown v-else class="icono-carga-noticias" aria-hidden="true" />
              <span>{{ cargandoMasNoticias ? 'Buscando noticias…' : 'Cargar más noticias' }}</span>
            </button>
            <p v-if="errorCargaNoticias" class="estado-carga-noticias error" role="alert">{{ errorCargaNoticias }}</p>
            <p v-else-if="mensajeCargaNoticias" class="estado-carga-noticias" role="status">{{ mensajeCargaNoticias }}</p>
          </section>
        </main>

        <aside class="noticias-medio-lateral" aria-label="Noticias complementarias">
          <section class="panel-noticias-lateral">
            <div class="encabezado-panel-lateral">
              <h2><Flame aria-hidden="true" /> Noticias en tendencia</h2>
              <NuxtLink to="/articulos">Ver todas <span aria-hidden="true">→</span></NuxtLink>
            </div>
            <ol class="lista-tendencias-medio">
              <li
                v-for="(articulo, indice) in noticiasTendencia"
                :key="articulo.slug"
                :class="{ 'sin-imagen': !tieneImagen(articulo) }"
              >
                <span>{{ indice + 1 }}</span>
                <NuxtLink v-if="tieneImagen(articulo)" :to="`/articulos/${articulo.slug}`" class="imagen-tendencia-medio" tabindex="-1" aria-hidden="true">
                  <img :src="articulo.imagen" :alt="articulo.titulo" loading="lazy" @error="registrarImagenFallida(articulo.imagen)">
                </NuxtLink>
                <div>
                  <NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink>
                  <p>{{ articulo.publicadoHace }} · {{ articulo.categoria }}</p>
                </div>
              </li>
            </ol>
          </section>

          <section class="boletin-noticias-medio">
            <div>
              <p>Boletín Pont3la10</p>
              <h2>Recibe las noticias más importantes en tu correo</h2>
              <span>Análisis, resultados, fichajes y mucho más. Sin spam.</span>
            </div>
            <form @submit.prevent>
              <label for="correo-boletin-noticias" class="solo-lectores-pantalla">Tu correo electrónico</label>
              <input id="correo-boletin-noticias" type="email" placeholder="Tu correo electrónico">
              <button type="submit">Suscribirme <Mail aria-hidden="true" /></button>
            </form>
          </section>

          <section v-if="noticiaLateral" class="panel-noticias-lateral panel-seleccion-editorial">
            <div class="encabezado-panel-lateral">
              <h2><Trophy aria-hidden="true" /> Selección editorial</h2>
              <NuxtLink :to="`/articulos/${noticiaLateral.slug}`">Leer <span aria-hidden="true">→</span></NuxtLink>
            </div>
            <NuxtLink v-if="tieneImagen(noticiaLateral)" :to="`/articulos/${noticiaLateral.slug}`" class="imagen-seleccion-editorial">
              <img :src="noticiaLateral.imagen" :alt="noticiaLateral.titulo" loading="lazy" @error="registrarImagenFallida(noticiaLateral.imagen)">
            </NuxtLink>
            <h3>
              <NuxtLink :to="`/articulos/${noticiaLateral.slug}`">{{ noticiaLateral.titulo }}</NuxtLink>
            </h3>
            <p>{{ noticiaLateral.bajada }}</p>
          </section>
        </aside>
      </div>
      <div v-else class="estado-vacio-articulos">
        <h2>{{ errorCargaNoticias ? 'No se pudo cargar el listado' : filtrosActivos ? 'No encontramos noticias con esos criterios' : 'Aún no hay noticias publicadas' }}</h2>
        <p v-if="errorCargaNoticias" role="alert">{{ errorCargaNoticias }}</p>
        <p v-else>{{ filtrosActivos ? 'Prueba con otra palabra, tema o categoría, o vuelve a todas las noticias.' : 'Las historias aparecerán aquí cuando el equipo editorial las publique.' }}</p>
        <NuxtLink class="boton-primario" to="/articulos">Ver todas las noticias</NuxtLink>
      </div>
    </section>
  </div>
</template>
