<script setup lang="ts">
import { ligasMexico } from '~/data/ligaMx'
import { respuestaLigaMxVacia, type RespuestaLigaMx } from '~/types/ligaMx'
import { agruparPorJornada, fasesDeTabla, filasDeTabla, proximosYRecientes, torneoActual } from '~/utils/ligaMxVista'

const { data: liga } = await useFetch<RespuestaLigaMx>('/api/liga-mx', {
  key: 'liga-mx-pagina', default: () => respuestaLigaMxVacia, ignoreResponseError: true
})
const datos = computed(() => liga.value || respuestaLigaMxVacia)
const ahora = Date.now()

const competencia = ref<string>(ligasMexico[0].slug)
const torneo = computed(() => torneoActual(datos.value.partidos.filter(p => p.competencia === competencia.value), datos.value.tabla, ahora))
const fases = computed(() => fasesDeTabla(datos.value.tabla, competencia.value, torneo.value))
const faseElegida = ref<string | null>(null)
const fase = computed(() => faseElegida.value && fases.value.includes(faseElegida.value) ? faseElegida.value : fases.value[0] ?? null)
const tabla = computed(() => filasDeTabla(datos.value.tabla, competencia.value, fase.value))
const partidosLiga = computed(() => datos.value.partidos.filter(p => p.competencia === competencia.value))
const { proximos, recientes } = (() => {
  const calculo = computed(() => proximosYRecientes(partidosLiga.value, ahora, 12))
  return { proximos: computed(() => calculo.value.proximos), recientes: computed(() => calculo.value.recientes) }
})()
const jornadas = computed(() => agruparPorJornada(partidosLiga.value.filter(p => !fase.value || p.torneo === fase.value)))
const nombreLiga = computed(() => ligasMexico.find(l => l.slug === competencia.value)?.nombre ?? 'Liga MX')
const hayDatos = computed(() => datos.value.estado === 'disponible')

const { sitio } = useSitio()

const actualizado = computed(() => datos.value.actualizadoEn
  ? new Intl.DateTimeFormat(sitio.value.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: sitio.value.zonaHoraria }).format(new Date(datos.value.actualizadoEn))
  : '')

useSeoPont3la10({
  titulo: 'Liga MX: tabla de posiciones, calendario y resultados | Pont3la10 México',
  descripcion: 'Tabla de posiciones, calendario, resultados y noticias de la Liga MX y la Liga MX Femenil en Pont3la10 México.',
  rutaCanonica: '/liga-mx',
  seccion: 'LIGA MX'
})
</script>

<template>
  <div class="pagina-liga-mx">
    <div class="contenedor-liga-mx">
      <header class="cabecera-liga-mx">
        <p class="antetitulo-liga-mx">LIGA MX</p>
        <h1>Liga MX: tabla, calendario y resultados</h1>
        <p>Posiciones, próximos partidos y últimos resultados de la Liga MX y la Liga MX Femenil.</p>
        <p v-if="actualizado" class="actualizado-liga-mx">Datos actualizados el {{ actualizado }} (hora de Ciudad de México).</p>
      </header>

      <div class="pestanas-liga-mx" role="group" aria-label="Competición">
        <button
          v-for="opcionLiga in ligasMexico"
          :key="opcionLiga.slug"
          type="button"
          :aria-pressed="competencia === opcionLiga.slug"
          :class="{ activa: competencia === opcionLiga.slug }"
          @click="competencia = opcionLiga.slug; faseElegida = null"
        >{{ opcionLiga.nombre }}</button>
      </div>

      <p v-if="!hayDatos" class="aviso-liga-mx">Estamos verificando los datos de la {{ nombreLiga }}. Vuelve pronto para ver la tabla y el calendario.</p>

      <template v-else>
        <section class="bloque-liga-mx" aria-labelledby="titulo-posiciones-mx">
          <div class="encabezado-liga-mx">
            <h2 id="titulo-posiciones-mx">Tabla de posiciones · {{ nombreLiga }}</h2>
            <div v-if="fases.length > 1" class="pestanas-liga-mx" role="group" aria-label="Torneo">
              <button v-for="opcion in fases" :key="opcion" type="button" :aria-pressed="fase === opcion" :class="{ activa: fase === opcion }" @click="faseElegida = opcion">{{ opcion }}</button>
            </div>
          </div>
          <PublicoTablaPosicionesMx v-if="tabla.length" :filas="tabla" :titulo="`Posiciones ${nombreLiga} ${fase || ''}`" />
          <p v-else class="aviso-liga-mx">Aún no hay tabla para esta competición.</p>
        </section>

        <section class="bloque-liga-mx dos-columnas" aria-label="Partidos">
          <PublicoListaPartidosMx :partidos="proximos" titulo="Próximos partidos" />
          <PublicoListaPartidosMx :partidos="recientes" titulo="Últimos resultados" />
        </section>

        <section v-if="jornadas.length" class="bloque-liga-mx" aria-labelledby="titulo-calendario-mx">
          <div class="encabezado-liga-mx"><h2 id="titulo-calendario-mx">Calendario por jornada</h2></div>
          <details v-for="grupo in jornadas" :key="grupo.jornada" class="jornada-liga-mx">
            <summary>{{ grupo.jornada }} <small>{{ grupo.partidos.length }} partidos</small></summary>
            <PublicoListaPartidosMx :partidos="grupo.partidos" :titulo="grupo.jornada" />
          </details>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pagina-liga-mx { min-height: 60vh; background: #07182f; color: #f5f8ff; padding: 24px 0 48px; }
.contenedor-liga-mx { width: min(1100px, calc(100% - 48px)); margin: 0 auto; }
.antetitulo-liga-mx { margin: 0; color: #ffd800; font-size: .7rem; font-weight: 800; letter-spacing: .1em; }
.cabecera-liga-mx h1 { margin: 6px 0 10px; color: #f5f8ff; font-size: clamp(1.7rem, 3vw, 2.5rem); font-weight: 850; letter-spacing: -.04em; }
.cabecera-liga-mx p { margin: 0 0 6px; color: #a8bbd5; line-height: 1.5; }
.cabecera-liga-mx .actualizado-liga-mx { color: #7f93b3; font-size: .78rem; }
.pestanas-liga-mx { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }
.pestanas-liga-mx button { min-height: 40px; padding: 0 16px; border: 1px solid rgba(255, 255, 255, .25); border-radius: 999px; background: transparent; color: #f5f8ff; font: inherit; font-weight: 700; cursor: pointer; }
.pestanas-liga-mx button.activa { border-color: #ffd800; background: #ffd800; color: #08204a; }
.bloque-liga-mx { margin-top: 28px; }
.bloque-liga-mx.dos-columnas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
.encabezado-liga-mx { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px 16px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #ffd800; }
.encabezado-liga-mx h2 { margin: 0; color: #f5f8ff; font-size: 1.2rem; font-weight: 850; }
.encabezado-liga-mx .pestanas-liga-mx { margin: 0; }
.aviso-liga-mx { margin: 22px 0; padding: 16px; border-radius: 8px; background: rgba(255, 255, 255, .06); color: #cbd8ee; line-height: 1.5; }
.jornada-liga-mx { border-bottom: 1px solid rgba(255, 255, 255, .12); padding: 6px 0; }
.jornada-liga-mx summary { cursor: pointer; padding: 8px 0; font-weight: 750; }
.jornada-liga-mx summary small { margin-left: 8px; color: #9eafc8; font-weight: 600; }
.pagina-liga-mx :focus-visible { outline: 3px solid #7ce6f5; outline-offset: 3px; }
@media (max-width: 760px) { .bloque-liga-mx.dos-columnas { grid-template-columns: minmax(0, 1fr); } .contenedor-liga-mx { width: calc(100% - 32px); } }
</style>
