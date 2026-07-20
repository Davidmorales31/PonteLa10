<script setup lang="ts">
const beneficiosLogin = [
  'Guarda tus noticias y especiales favoritos en un solo lugar.',
  'Recibe una experiencia pensada para seguir la jugada a tu ritmo.',
  'Prepara tu perfil para rankings, compras y funciones interactivas.',
  'Entra rapido y mantente conectado con lo que viene en Pont3la10.'
]

const indiceBeneficio = ref(0)
let intervaloBeneficios: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  intervaloBeneficios = setInterval(() => {
    indiceBeneficio.value = (indiceBeneficio.value + 1) % beneficiosLogin.length
  }, 2000)
})

onBeforeUnmount(() => {
  if (intervaloBeneficios) {
    clearInterval(intervaloBeneficios)
  }
})
</script>

<template>
  <aside class="panel-login-editorial" aria-label="Presentacion de cuenta Pont3la10">
    <div class="panel-login-imagen">
      <img src="/editorial/login_pont3la10_estadio.png" alt="Jugadores celebrando en un estadio internacional">
    </div>
    <div class="beneficio-login-carrusel" aria-live="polite">
      <span aria-hidden="true" />
      <Transition name="beneficio-login" mode="out-in">
        <p :key="indiceBeneficio">{{ beneficiosLogin[indiceBeneficio] }}</p>
      </Transition>
    </div>
  </aside>
</template>
