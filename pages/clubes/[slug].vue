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
// El instante se comparte entre servidor y navegador para que las listas hidraten igual.
const ahora = useState<number>('club-mx-ahora', () => Date.now()).value
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
  <main class="pagina-contenido pagina-publica-medio pagina-club-mx">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Liga MX', ruta: '/liga-mx' }, { etiqueta: 'Clubes', ruta: '/clubes' }, { etiqueta: nombre }]" />
    <header class="cabecera-club-mx">
      <b aria-hidden="true">{{ nombre.slice(0, 1) }}</b>
      <div>
        <p class="etiqueta-seccion">LIGA MX</p>
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
        <div class="panel-club-mx"><PublicoListaPartidosMx :partidos="proximos" titulo="Próximos partidos" /></div>
        <div class="panel-club-mx"><PublicoListaPartidosMx :partidos="recientes" titulo="Últimos resultados" /></div>
      </section>
    </template>

    <section v-if="tarjetas.length" class="noticias-club-mx" aria-labelledby="titulo-noticias-club">
      <div class="encabezado-noticias-listado"><div><p class="etiqueta-seccion">ACTUALIDAD VERIFICADA</p><h2 id="titulo-noticias-club">Noticias de {{ nombre }}</h2></div></div>
      <div class="grilla-noticias-medio">
        <TarjetaNoticiaSecundaria v-for="articulo in tarjetas" :key="articulo.slug" :articulo="articulo" mostrar-resumen />
      </div>
    </section>
  </main>
</template>

<style scoped>
.cabecera-club-mx { display: flex; align-items: center; gap: 16px; margin: 6px 0 20px; padding-bottom: 14px; border-bottom: 3px solid #f1c744; }
.cabecera-club-mx b { display: grid; flex: none; width: 64px; height: 64px; place-items: center; border-radius: 50%; background: #174ea6; color: #fff; font-size: 1.6rem; }
.cabecera-club-mx h1 { margin: 0; color: #08204a; font-size: clamp(1.7rem, 3vw, 2.5rem); font-weight: 850; letter-spacing: -.04em; }
.cabecera-club-mx p:not(.etiqueta-seccion) { margin: 4px 0 0; color: #45566e; }
.aviso-club-mx { padding: 16px; border: 1px solid #dbe2ee; border-radius: 8px; background: #f4f7fb; color: #45566e; }
.resumen-club-mx { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin: 0 0 22px; }
.resumen-club-mx div { padding: 12px; border: 1px solid #dbe2ee; border-radius: 8px; background: #fff; }
.resumen-club-mx dt { color: #5f6878; font-size: .7rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.resumen-club-mx dd { margin: 4px 0 0; color: #145996; font-size: 1.3rem; font-weight: 850; }
.dos-columnas-club-mx { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.panel-club-mx { padding: 18px; border: 1px solid #dbe2ee; border-radius: 8px; background: #fff; box-shadow: 0 18px 46px rgba(8, 32, 74, .06); }
.noticias-club-mx { margin-top: 32px; }
.pagina-club-mx :focus-visible { outline: 3px solid #145996; outline-offset: 3px; }
@media (max-width: 760px) { .dos-columnas-club-mx { grid-template-columns: minmax(0, 1fr); } }
</style>
