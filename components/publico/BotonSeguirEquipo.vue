<script setup lang="ts">
import { MAX_EQUIPOS_SEGUIDOS } from '~/utils/seguimientoEquipos'

const props = withDefaults(defineProps<{
  slug: string
  nombre: string
  compacto?: boolean
}>(), { compacto: false })

const { estaSiguiendo, alternarSeguimiento } = useSeguimientoEquipos()
const estaActivo = computed(() => estaSiguiendo(props.slug))
const avisoLimite = ref(false)

function cambiarSeguimiento() {
  const siguiendoAntes = estaActivo.value
  const actualizado = alternarSeguimiento(props.slug)
  avisoLimite.value = !siguiendoAntes && !actualizado
}
</script>

<template>
  <div class="control-seguimiento-equipo">
    <button
      class="boton-seguimiento-equipo"
      :class="{ compacto }"
      type="button"
      :aria-label="`${estaActivo ? 'Dejar de seguir' : 'Seguir'} a ${nombre}`"
      :aria-pressed="estaActivo"
      @click="cambiarSeguimiento"
    >
      <span aria-hidden="true">{{ estaActivo ? '★' : '☆' }}</span>
      {{ estaActivo ? 'Siguiendo' : 'Seguir equipo' }}
    </button>
    <span v-if="avisoLimite" class="aviso-limite-seguimiento" role="status">
      Puedes seguir hasta {{ MAX_EQUIPOS_SEGUIDOS }} equipos en este dispositivo.
    </span>
  </div>
</template>

<style scoped>
.control-seguimiento-equipo { display: grid; justify-items: start; gap: 5px; }
.boton-seguimiento-equipo { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 8px; border: 1px solid #b9cee4; border-radius: 999px; background: #f2f7fc; color: #145e99; padding: 8px 14px; font: inherit; font-size: .82rem; font-weight: 750; cursor: pointer; transition: background .15s ease, border-color .15s ease, color .15s ease; }
.boton-seguimiento-equipo:hover, .boton-seguimiento-equipo:focus-visible { border-color: #1689cb; background: #e5f3ff; outline: 2px solid #1689cb; outline-offset: 2px; }
.boton-seguimiento-equipo[aria-pressed="true"] { border-color: #0e3154; background: #0e3154; color: #fff; }
.boton-seguimiento-equipo.compacto { min-height: 34px; padding: 6px 11px; font-size: .74rem; }
.aviso-limite-seguimiento { color: #8a4c00; font-size: .76rem; line-height: 1.4; }
:global(body.tema-publico-azul) .boton-seguimiento-equipo { border-color: #365875; background: #132f4d; color: #a4eaff; }
:global(body.tema-publico-azul) .boton-seguimiento-equipo:hover,
:global(body.tema-publico-azul) .boton-seguimiento-equipo:focus-visible { border-color: #59d9ff; background: #1a4164; color: #fff; }
:global(body.tema-publico-azul) .boton-seguimiento-equipo[aria-pressed="true"] { border-color: #59d9ff; background: #17476b; color: #fff; }
:global(body.tema-publico-azul) .aviso-limite-seguimiento { color: #ffe2a6; }
@media (prefers-reduced-motion: reduce) { .boton-seguimiento-equipo { transition: none; } }
</style>
