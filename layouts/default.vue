<script setup lang="ts">
import { categoriasPrincipales } from '~/data/editorial'
</script>

<template>
  <div class="sitio-editorial">
    <header class="cabecera-principal">
      <div class="franja-superior">
        <span>Viernes editorial</span>
        <strong>La jugada clara, sin humo.</strong>
        <NuxtLink to="/admin">Panel interno</NuxtLink>
      </div>

      <div class="marca-editorial">
        <NuxtLink class="logo-principal" to="/" aria-label="Pont3la10 inicio">
          <img src="/brand/pont3la10_logo_06_horizontal_sobre_blanco.png" alt="Pont3la10">
        </NuxtLink>
        <div class="acciones-cabecera">
          <NuxtLink class="boton-secundario" to="/especiales">Especiales</NuxtLink>
          <NuxtLink class="boton-primario" to="/articulos">Ultimas noticias</NuxtLink>
        </div>
      </div>

      <nav class="navegacion-categorias" aria-label="Categorias principales">
        <NuxtLink to="/">Portada</NuxtLink>
        <NuxtLink v-for="categoria in categoriasPrincipales" :key="categoria" to="/articulos">
          {{ categoria }}
        </NuxtLink>
      </nav>
    </header>

    <main class="superficie-principal">
      <slot />
    </main>

    <nav class="navegacion-movil" aria-label="Navegacion movil">
      <NuxtLink to="/">Portada</NuxtLink>
      <NuxtLink to="/articulos">Noticias</NuxtLink>
      <NuxtLink to="/especiales">Especiales</NuxtLink>
      <NuxtLink to="/admin">Panel</NuxtLink>
    </nav>
  </div>
</template>
