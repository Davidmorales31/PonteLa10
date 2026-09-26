<script setup lang="ts">
import type { RespuestaResultados } from '~/types/resultados'
import { construirUrlAbsoluta } from '~/utils/seo'

const configuracion = useRuntimeConfig()
const { data: respuesta, error, refresh } = await useFetch<RespuestaResultados>('/api/resultados', {
  key: 'seo-resultados-en-vivo'
})
const partidosEnVivo = computed(() => (respuesta.value?.partidos || []).filter(partido => partido.estado === 'en-vivo'))

useSeoPont3la10(() => ({
  titulo: 'Resultados en vivo de fútbol y marcadores | Pont3la10',
  descripcion: 'Sigue resultados en vivo, marcadores y minuto de los partidos disponibles en Pont3la10.',
  rutaCanonica: '/resultados/en-vivo',
  datosEstructurados: {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Resultados en vivo',
    mainEntity: { '@type': 'ItemList', itemListElement: partidosEnVivo.value.map((partido, posicion) => ({
      '@type': 'ListItem', position: posicion + 1, name: `${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre}`,
      url: construirUrlAbsoluta(String(configuracion.public.siteUrl), `/resultados/${partido.id}`)
    })) }
  }
}))
</script>

<template>
  <main class="pagina-resultados pagina-publica-medio pagina-seo-resultados">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Resultados', ruta: '/resultados' }, { etiqueta: 'En vivo' }]" />
    <header class="cabecera-resultados"><div><p>Marcadores en directo</p><h1>Resultados en vivo</h1><span>Partidos que se están jugando ahora, con marcador y acceso al detalle disponible.</span></div></header>
    <EstadoDatosResultados v-if="error" descripcion="No fue posible actualizar los resultados en vivo." :permitir-reintento="true" @reintentar="refresh" />
    <EstadoDatosResultados v-else-if="!partidosEnVivo.length" titulo="No hay partidos en vivo en este momento" descripcion="Consulta los partidos de hoy para ver próximos encuentros y resultados finalizados." />
    <section v-else class="seccion-lista-resultados" aria-labelledby="titulo-en-vivo">
      <div class="titulo-panel-resultados"><h2 id="titulo-en-vivo">Partidos en juego</h2><span>Actualización según el proveedor</span></div>
      <div class="grilla-marcadores-resultados"><TarjetaMarcadorCompacto v-for="partido in partidosEnVivo" :key="partido.id" :partido="partido" /></div>
    </section>
    <NuxtLink class="enlace-regreso-seo" to="/partidos-hoy">Ver todos los partidos de hoy</NuxtLink>
  </main>
</template>
