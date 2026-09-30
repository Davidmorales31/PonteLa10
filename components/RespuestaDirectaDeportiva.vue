<script setup lang="ts">
import { computed, watch } from 'vue'
import type { PartidoResultado } from '~/types/resultados'
import { construirRutaPartido } from '~/utils/rutasPartidos'
import { crearDatosRespuestaDirectaDeportiva } from '~/utils/respuestaDirectaDeportiva'
import { zonaHorariaColombia } from '~/utils/zonasHorarias'

const propiedades = withDefaults(defineProps<{
  partido: PartidoResultado
  zonaHoraria?: string
  titulo?: string
  mostrarEnlaceDetalle?: boolean
}>(), {
  zonaHoraria: zonaHorariaColombia,
  titulo: 'Respuesta directa del encuentro',
  mostrarEnlaceDetalle: false
})

const analitica = useAnaliticaPublica()
const datos = computed(() => crearDatosRespuestaDirectaDeportiva(propiedades.partido, propiedades.zonaHoraria))

watch(() => propiedades.partido.id, (id) => {
  if (id) void analitica.registrarEvento('direct_answer_view')
}, { immediate: true })

function registrarAccion() {
  void analitica.registrarEvento('direct_answer_action')
}
</script>

<template>
  <article class="partido-destacado-resultados respuesta-directa-deportiva" :aria-label="titulo">
    <header>
      <div>
        <h2>{{ titulo }}</h2>
        <small v-if="datos.competencia">{{ datos.competencia }}</small>
      </div>
      <span class="estado-respuesta-directa">{{ datos.estado }}</span>
    </header>

    <div class="marcador-destacado">
      <div class="equipo-destacado equipo-local">
        <EscudoEquipo :equipo="partido.equipoLocal" tamano="grande" />
        <strong>{{ partido.equipoLocal.nombre }}</strong>
      </div>
      <div class="resultado-destacado">
        <b v-if="datos.resultado">{{ datos.resultado }}</b>
        <strong v-else>{{ datos.descripcionMarcador }}</strong>
        <small v-if="partido.estado === 'en-vivo' && partido.minuto">Minuto {{ partido.minuto }}</small>
      </div>
      <div class="equipo-destacado equipo-visitante">
        <EscudoEquipo :equipo="partido.equipoVisitante" tamano="grande" />
        <strong>{{ partido.equipoVisitante.nombre }}</strong>
      </div>
    </div>

    <dl class="datos-clave-respuesta-directa">
      <div v-if="datos.fecha">
        <dt>Fecha</dt>
        <dd>{{ datos.fecha }}</dd>
      </div>
      <div v-if="datos.hora">
        <dt>Hora local</dt>
        <dd>
          {{ datos.hora }}
          <small>{{ datos.referenciaZonaHoraria }}</small>
        </dd>
      </div>
      <div v-if="datos.estadio">
        <dt>Estadio</dt>
        <dd>{{ datos.estadio }}</dd>
      </div>
    </dl>

    <NuxtLink
      v-if="mostrarEnlaceDetalle"
      class="enlace-detalle-partido"
      :to="construirRutaPartido(partido)"
      @click="registrarAccion"
    >Ver detalles del partido</NuxtLink>
  </article>
</template>
