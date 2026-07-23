<script setup lang="ts">
import type { HeroLanding } from '~/types/landing'

defineProps<{
  datos: HeroLanding
}>()
</script>

<template>
  <section class="hero-landing" aria-labelledby="titulo-hero-landing">
    <div class="hero-imagen">
      <img
        :src="datos.imagen"
        :alt="datos.descripcionImagen"
        width="1024"
        height="1536"
        fetchpriority="high"
        decoding="async"
      >
    </div>
    <div class="contenedor-landing hero-contenido">
      <div class="hero-copy">
        <h1 id="titulo-hero-landing">
          <template v-for="(segmento, indice) in datos.titulo" :key="`${segmento.texto}-${indice}`">
            <mark v-if="segmento.destacado">{{ segmento.texto }}</mark>
            <template v-else>{{ segmento.texto }}</template>
          </template>
        </h1>
        <p>{{ datos.descripcion }}</p>
        <div class="acciones-hero">
          <BotonBase :accion="datos.accionPrincipal" />
          <BotonBase :accion="datos.accionSecundaria" variante="secundario" />
        </div>
        <EstadisticasHero :estadisticas="datos.estadisticas" />
      </div>

      <div class="tarjetas-flotantes-hero" aria-label="Destacados">
        <TarjetaDestacadaFlotante
          v-for="tarjeta in datos.tarjetasFlotantes"
          :key="tarjeta.titulo"
          :tarjeta="tarjeta"
        />
      </div>
    </div>
  </section>
</template>
