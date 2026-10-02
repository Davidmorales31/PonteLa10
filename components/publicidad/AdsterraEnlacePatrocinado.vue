<script setup lang="ts">
const { publicidadAutorizada } = useAnaliticaPublica()
const enlacePatrocinado = 'https://budgetezy.org/4/ea2fc1af1fb9d19f8a8abcfdf7309692'
</script>

<template>
  <aside v-if="publicidadAutorizada" class="enlace-adsterra" aria-label="Enlace patrocinado externo">
    <p>Enlace patrocinado</p>
    <h2>Una oferta para explorar</h2>
    <p>Contenido de un anunciante externo seleccionado por Adsterra. Al abrirlo, se aplican las políticas del sitio de destino.</p>
    <a
      :href="enlacePatrocinado"
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      referrerpolicy="no-referrer"
    >
      Ver oferta externa <span aria-hidden="true">↗</span>
    </a>
  </aside>
</template>

<style scoped>
.enlace-adsterra {
  display: grid;
  gap: .6rem;
  margin: 1.5rem 0;
  padding: 1rem 1.15rem;
  color: #edf5ff;
  border: 1px solid #446287;
  border-left: 3px solid #ffd800;
  border-radius: 10px;
  background: #0c2443;
}

.enlace-adsterra p { margin: 0; color: #c2d0e2; font-size: .8rem; line-height: 1.5; }
.enlace-adsterra p:first-child { color: #ffd800; font-size: .65rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.enlace-adsterra h2 { margin: 0; font-size: 1rem; }
.enlace-adsterra a { justify-self: start; color: #fff; font-weight: 750; text-underline-offset: 3px; }
.enlace-adsterra a:focus-visible { outline: 3px solid #ffd800; outline-offset: 3px; }
</style>
