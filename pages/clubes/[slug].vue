<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { respuestaLigaMxVacia, type RespuestaLigaMx } from '~/types/ligaMx'
import { clubesDeLigaMx, estadioDelClub, fasesDeTabla, filasDeTabla, partidosDelClub, proximosYRecientes, torneoActual } from '~/utils/ligaMxVista'

const ruta = useRoute()
const slug = computed(() => String(ruta.params.slug || ''))
const hayFormatoValido = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.value) && slug.value.length <= 120
if (!hayFormatoValido) throw createError({ statusCode: 404, statusMessage: 'Club no encontrado', fatal: true })

const [{ data }, { data: noticias }] = await Promise.all([
  useFetch<RespuestaLigaMx>('/api/liga-mx', { key: 'liga-mx-clubes', default: () => respuestaLigaMxVacia, ignoreResponseError: true }),
  useFetch<ResumenArticuloPublico[]>(`/api/articulos/entidad/team/${slug.value}`, { key: `club-mx-noticias-${slug.value}`, default: () => [], ignoreResponseError: true })
])
const datos = computed(() => data.value || respuestaLigaMxVacia)
const ahora = Date.now()
const torneo = computed(() => torneoActual(datos.value.partidos, datos.value.tabla, ahora))
const club = computed(() => clubesDeLigaMx(datos.value.tabla, datos.value.partidos, torneo.value).find(c => c.clave === slug.value) ?? null)
if (datos.value.estado === 'disponible' && !club.value) throw createError({ statusCode: 404, statusMessage: 'Club no encontrado', fatal: true })

const partidos = computed(() => partidosDelClub(datos.value.partidos, slug.value))
const { proximos, recientes } = (() => {
  const calculo = computed(() => proximosYRecientes(partidos.value, ahora, 5))
  return { proximos: computed(() => calculo.value.proximos), recientes: computed(() => calculo.value.recientes) }
})()
const filaTabla = computed(() => filasDeTabla(datos.value.tabla, 'liga-mx', fasesDeTabla(datos.value.tabla, 'liga-mx', torneo.value)[0] ?? null).find(f => f.equipoClave === slug.value) ?? null)
const estadio = computed(() => estadioDelClub(datos.value.partidos, slug.value))
const nombre = computed(() => club.value?.nombre || slug.value.replace(/-/g, ' '))
const tarjetas = computed(() => (Array.isArray(noticias.value) ? noticias.value : []).filter(a => a && a.slug).map(a => ({
  slug: a.slug, titulo: a.titulo, tituloPortada: a.tituloPortada, categoria: a.categoria, imagen: a.imagen, imagenAncho: a.imagenAncho, bajada: a.resumen, publicadoEn: a.publicadoEn
})))

useSeoPont3la10(() => ({
  titulo: `${nombre.value}: posición, calendario y noticias | Pont3la10 México`,
  descripcion: `Posición en la Liga MX, próximos partidos, resultados y noticias de ${nombre.value}.`,
  rutaCanonica: `/clubes/${slug.value}`,
  seccion: 'LIGA MX'
}))
</script>

<template>
  <div class="pagina-club-mx">
    <div class="contenedor-club-mx">
      <nav class="migas-club-mx" aria-label="Migas de pan"><NuxtLink to="/liga-mx">Liga MX</NuxtLink> / <NuxtLink to="/clubes">Clubes</NuxtLink></nav>
      <header class="cabecera-club-mx">
        <b aria-hidden="true">{{ nombre.slice(0, 1) }}</b>
        <div>
          <h1>{{ nombre }}</h1>
          <p v-if="estadio">Estadio: {{ estadio }}</p>
        </div>
      </header>

      <p v-if="datos.estado !== 'disponible'" class="aviso-club-mx">Estamos verificando los datos de este club. Vuelve pronto.</p>

      <template v-else>
        <dl v-if="filaTabla" class="resumen-club-mx">
          <div><dt>Posición</dt><dd>{{ filaTabla.posicion }}</dd></div>
          <div><dt>Puntos</dt><dd>{{ filaTabla.puntos }}</dd></div>
          <div><dt>PJ</dt><dd>{{ filaTabla.jugados }}</dd></div>
          <div><dt>G-E-P</dt><dd>{{ filaTabla.ganados }}-{{ filaTabla.empatados }}-{{ filaTabla.perdidos }}</dd></div>
          <div><dt>Goles</dt><dd>{{ filaTabla.golesFavor }}:{{ filaTabla.golesContra }}</dd></div>
        </dl>
        <section class="dos-columnas-club-mx" aria-label="Partidos">
          <PublicoListaPartidosMx :partidos="proximos" titulo="Próximos partidos" />
          <PublicoListaPartidosMx :partidos="recientes" titulo="Últimos resultados" />
        </section>
      </template>

      <section v-if="tarjetas.length" class="noticias-club-mx" aria-labelledby="titulo-noticias-club">
        <h2 id="titulo-noticias-club">Noticias de {{ nombre }}</h2>
        <div class="rejilla-noticias-club-mx">
          <TarjetaNoticiaSecundaria v-for="articulo in tarjetas" :key="articulo.slug" :articulo="articulo" mostrar-resumen />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pagina-club-mx { min-height: 60vh; background: #07182f; color: #f5f8ff; padding: 20px 0 48px; }
.contenedor-club-mx { width: min(1100px, calc(100% - 48px)); margin: 0 auto; }
.migas-club-mx { color: #9eafc8; font-size: .8rem; }
.migas-club-mx a { color: #ffd800; text-decoration: none; }
.cabecera-club-mx { display: flex; align-items: center; gap: 16px; margin: 18px 0 20px; }
.cabecera-club-mx b { display: grid; flex: none; width: 64px; height: 64px; place-items: center; border-radius: 50%; background: #174ea6; color: #fff; font-size: 1.6rem; }
.cabecera-club-mx h1 { margin: 0; color: #f5f8ff; font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 850; letter-spacing: -.04em; }
.cabecera-club-mx p { margin: 4px 0 0; color: #a8bbd5; }
.aviso-club-mx { padding: 16px; border-radius: 8px; background: rgba(255, 255, 255, .06); color: #cbd8ee; }
.resumen-club-mx { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin: 0 0 24px; }
.resumen-club-mx div { padding: 12px; border: 1px solid rgba(255, 255, 255, .14); border-radius: 8px; background: rgba(255, 255, 255, .05); }
.resumen-club-mx dt { color: #9eafc8; font-size: .7rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.resumen-club-mx dd { margin: 4px 0 0; color: #ffd800; font-size: 1.3rem; font-weight: 850; }
.dos-columnas-club-mx { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
.noticias-club-mx { margin-top: 32px; }
.noticias-club-mx h2 { margin: 0 0 14px; padding-bottom: 8px; border-bottom: 2px solid #ffd800; color: #f5f8ff; font-size: 1.2rem; font-weight: 850; }
.rejilla-noticias-club-mx { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.pagina-club-mx :focus-visible { outline: 3px solid #7ce6f5; outline-offset: 3px; }
@media (max-width: 760px) { .dos-columnas-club-mx { grid-template-columns: minmax(0, 1fr); } .contenedor-club-mx { width: calc(100% - 32px); } }
</style>
