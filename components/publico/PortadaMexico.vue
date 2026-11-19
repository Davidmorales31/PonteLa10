<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { respuestaLigaMxVacia, type RespuestaLigaMx } from '~/types/ligaMx'
import { fasesDeTabla, filasDeTabla, proximosYRecientes, torneoActual } from '~/utils/ligaMxVista'
import { categoriasDe } from '~/data/sitioPublico'

const { sitio, id: idSitio } = useSitio()

const consultar = (clave: string, query: Record<string, string | number>) => useFetch<ResumenArticuloPublico[]>('/api/articulos', {
  key: `portada-mx-${clave}`, query, default: () => [], ignoreResponseError: true
})
const [recientes, ligaNoticias, seleccionNoticias, exteriorNoticias, liga] = await Promise.all([
  consultar('recientes', { limite: 13 }),
  consultar('liga-mx', { tema: 'liga-mx', limite: 4 }),
  consultar('seleccion-mexicana', { tema: 'seleccion-mexicana', limite: 4 }),
  consultar('exterior', { tema: 'mexicanos-en-el-exterior', limite: 4 }),
  useFetch<RespuestaLigaMx>('/api/liga-mx', { key: 'portada-mx-liga', default: () => respuestaLigaMxVacia, ignoreResponseError: true })
])

const lista = (datos: ResumenArticuloPublico[] | null) => (Array.isArray(datos) ? datos : []).filter(articulo => articulo && articulo.slug)
const tarjeta = (articulo: ResumenArticuloPublico) => ({
  slug: articulo.slug, titulo: articulo.titulo, tituloPortada: articulo.tituloPortada, categoria: articulo.categoria,
  imagen: articulo.imagen, imagenAncho: articulo.imagenAncho, bajada: articulo.resumen, publicadoEn: articulo.publicadoEn
})
const noticias = computed(() => lista(recientes.data.value).map(tarjeta))
const principal = computed(() => noticias.value[0] || null)
const secundarias = computed(() => noticias.value.slice(1, 4))
const masNoticias = computed(() => noticias.value.slice(4, 13))
const secciones = computed(() => [
  { clave: 'liga-mx', titulo: 'Liga MX', ruta: '/articulos?tema=liga-mx', noticias: lista(ligaNoticias.data.value).map(tarjeta) },
  { clave: 'seleccion', titulo: 'Selección Mexicana', ruta: '/articulos?tema=seleccion-mexicana', noticias: lista(seleccionNoticias.data.value).map(tarjeta) },
  { clave: 'exterior', titulo: 'Mexicanos en el exterior', ruta: '/articulos?tema=mexicanos-en-el-exterior', noticias: lista(exteriorNoticias.data.value).map(tarjeta) }
].filter(seccion => seccion.noticias.length))

const datosLiga = computed(() => liga.data.value || respuestaLigaMxVacia)
const ahora = Date.now()
const torneo = computed(() => torneoActual(datosLiga.value.partidos, datosLiga.value.tabla, ahora))
const faseTabla = computed(() => fasesDeTabla(datosLiga.value.tabla, 'liga-mx', torneo.value)[0] ?? null)
const tablaLiga = computed(() => filasDeTabla(datosLiga.value.tabla, 'liga-mx', faseTabla.value))
const partidosLiga = computed(() => proximosYRecientes(datosLiga.value.partidos.filter(partido => partido.competencia === 'liga-mx'), ahora, 5))

useSeoPont3la10({
  titulo: 'Fútbol mexicano: Liga MX, Selección Mexicana y más | Pont3la10 México',
  descripcion: 'Noticias de Liga MX, Selección Mexicana y mexicanos en el exterior. Tabla de posiciones, calendario y resultados en Pont3la10 México.',
  rutaCanonica: '/',
  imagenAlt: 'Pont3la10 México, la jugada clara'
})
</script>

<template>
  <div class="portada-mx">
    <div class="contenedor-mx">
      <div class="edicion-mx"><span>LA JUGADA CLARA</span><span>Fútbol mexicano · Actualidad deportiva</span></div>

      <section class="apertura-mx" aria-labelledby="titulo-portada-mx">
        <div class="introduccion-mx">
          <p class="antetitulo-mx">LA JUGADA CLARA · FÚTBOL MEXICANO</p>
          <h1 id="titulo-portada-mx">Noticias de Liga MX y Selección Mexicana</h1>
          <p>Liga MX, Selección Mexicana, mexicanos en el exterior, partidos de hoy, resultados y actualidad deportiva.</p>
        </div>
        <TarjetaNoticiaPrincipal v-if="principal" :articulo="principal" nivel-titulo="h2" prioridad-alta />
        <div v-if="secundarias.length" class="secundarias-mx">
          <TarjetaNoticiaSecundaria v-for="articulo in secundarias" :key="articulo.slug" :articulo="articulo" />
        </div>
        <p v-if="!principal" class="sin-noticias-mx">Estamos preparando las primeras noticias de México. Mientras tanto, revisa la tabla y el calendario de la Liga MX.</p>
      </section>

      <section class="liga-mx-portada" aria-labelledby="titulo-liga-mx-portada">
        <div class="encabezado-mx">
          <h2 id="titulo-liga-mx-portada">Liga MX{{ torneo ? ` · ${torneo}` : '' }}</h2>
          <NuxtLink to="/liga-mx">Tabla y calendario completos <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div v-if="tablaLiga.length || partidosLiga.proximos.length || partidosLiga.recientes.length" class="liga-mx-columnas">
          <PublicoTablaPosicionesMx v-if="tablaLiga.length" :filas="tablaLiga" :limite="8" compacta :titulo="`Posiciones ${faseTabla || ''}`" />
          <div class="partidos-columna-mx">
            <PublicoListaPartidosMx :partidos="partidosLiga.proximos" titulo="Próximos partidos" />
            <PublicoListaPartidosMx v-if="partidosLiga.recientes.length" :partidos="partidosLiga.recientes" titulo="Últimos resultados" />
          </div>
        </div>
        <p v-else class="sin-noticias-mx">Estamos verificando los datos de la Liga MX. Pronto verás aquí la tabla y el calendario.</p>
      </section>

      <section v-for="seccion in secciones" :key="seccion.clave" class="seccion-tema-mx" :aria-label="seccion.titulo">
        <div class="encabezado-mx">
          <h2>{{ seccion.titulo }}</h2>
          <NuxtLink :to="seccion.ruta">Ver todas <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="rejilla-mx">
          <TarjetaNoticiaSecundaria v-for="articulo in seccion.noticias" :key="articulo.slug" :articulo="articulo" mostrar-resumen />
        </div>
      </section>

      <section v-if="masNoticias.length" class="seccion-tema-mx" aria-labelledby="titulo-ultimas-mx">
        <div class="encabezado-mx">
          <h2 id="titulo-ultimas-mx">Últimas noticias</h2>
          <NuxtLink to="/articulos">Ver archivo completo <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="rejilla-mx">
          <TarjetaNoticiaSecundaria v-for="articulo in masNoticias" :key="articulo.slug" :articulo="articulo" mostrar-resumen />
        </div>
      </section>

      <nav class="categorias-mx" aria-label="Más secciones">
        <NuxtLink v-for="categoria in categoriasDe(idSitio)" :key="categoria.ruta" :to="categoria.ruta">{{ categoria.etiqueta }} <span aria-hidden="true">↗</span></NuxtLink>
      </nav>
      <p class="nota-sitio-mx">{{ sitio.lema }}</p>
    </div>
  </div>
</template>

<style scoped>
.portada-mx { background: #07182f; color: #f5f8ff; padding-bottom: 32px; }
.contenedor-mx { width: min(1240px, calc(100% - 48px)); margin: 0 auto; }
.edicion-mx { display: flex; justify-content: space-between; gap: 16px; padding: 18px 0 14px; color: #9eafc8; font-size: .62rem; letter-spacing: .12em; }
.edicion-mx span:first-child { color: #ffd800; font-weight: 800; }
.apertura-mx { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: stretch; }
.introduccion-mx { align-self: center; padding: 12px 8px 12px 0; }
.antetitulo-mx { margin: 0; color: #ffd800; font-size: .65rem; font-weight: 800; letter-spacing: .09em; line-height: 1.5; }
.introduccion-mx h1 { margin: 8px 0 12px; color: #f5f8ff; font-size: clamp(1.8rem, 2.8vw, 2.65rem); font-weight: 850; line-height: 1.06; letter-spacing: -.045em; text-wrap: balance; }
.introduccion-mx > p:last-child { margin: 0; color: #a8bbd5; font-size: clamp(.86rem, 1.05vw, .98rem); line-height: 1.55; }
.secundarias-mx { display: grid; gap: 12px; align-content: start; }
.sin-noticias-mx { grid-column: 2 / -1; align-self: center; margin: 0; color: #a8bbd5; line-height: 1.55; }
.liga-mx-portada, .seccion-tema-mx { margin-top: 28px; }
.encabezado-mx { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #ffd800; }
.encabezado-mx h2 { margin: 0; color: #f5f8ff; font-size: 1.25rem; font-weight: 850; letter-spacing: -.02em; }
.encabezado-mx a { color: #ffd800; font-size: .84rem; font-weight: 750; text-decoration: none; }
.liga-mx-columnas { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 28px; }
.partidos-columna-mx { display: grid; gap: 18px; align-content: start; }
.rejilla-mx { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.categorias-mx { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 32px; }
.categorias-mx a { padding: 8px 14px; border: 1px solid rgba(255, 255, 255, .22); border-radius: 999px; color: #f5f8ff; font-size: .84rem; font-weight: 700; text-decoration: none; }
.nota-sitio-mx { margin: 18px 0 0; color: #7f93b3; font-size: .78rem; }
.portada-mx a:focus-visible { outline: 3px solid #7ce6f5; outline-offset: 3px; }
@media (max-width: 900px) {
  .apertura-mx, .liga-mx-columnas { grid-template-columns: minmax(0, 1fr); }
  .sin-noticias-mx { grid-column: auto; }
}
@media (max-width: 640px) { .contenedor-mx { width: calc(100% - 32px); } }
</style>
