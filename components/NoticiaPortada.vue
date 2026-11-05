<script setup lang="ts">
import type { ArticuloResumen } from '~/types/editorial'

defineProps<{
  articulo: ArticuloResumen
  principal?: boolean
  nivelTitulo?: 'h1' | 'h2' | 'h3'
}>()
</script>

<template>
  <TarjetaNoticiaPrincipal
    v-if="principal"
    :articulo="articulo"
    :nivel-titulo="nivelTitulo"
    prioridad-alta
  />
  <TarjetaNoticiaSecundaria
    v-else
    :articulo="articulo"
    :nivel-titulo="nivelTitulo === 'h1' ? 'h2' : nivelTitulo"
  />
</template>
