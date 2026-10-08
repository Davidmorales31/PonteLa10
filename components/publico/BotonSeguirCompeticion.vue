<script setup lang="ts">
import { MAX_COMPETICIONES_SEGUIDAS } from '~/utils/seguimientoCompeticiones'

const props = withDefaults(defineProps<{
  slug: string
  nombre: string
  compacto?: boolean
}>(), { compacto: false })

const { estaSiguiendo, alternarSeguimiento } = useSeguimientoCompeticiones()
const estaActiva = computed(() => estaSiguiendo(props.slug))
const avisoLimite = ref(false)

function cambiarSeguimiento() {
  const siguiendoAntes = estaActiva.value
  const actualizado = alternarSeguimiento(props.slug)
  avisoLimite.value = !siguiendoAntes && !actualizado
}
</script>

<template>
  <div class="control-seguimiento-competicion">
    <button
      class="boton-seguimiento-competicion"
      :class="{ compacto }"
      type="button"
      :aria-label="`${estaActiva ? 'Dejar de seguir' : 'Seguir'} ${nombre}`"
      :aria-pressed="estaActiva"
      @click="cambiarSeguimiento"
    >
      <span aria-hidden="true">{{ estaActiva ? '★' : '☆' }}</span>
      {{ estaActiva ? 'Siguiendo' : 'Seguir competición' }}
    </button>
    <span v-if="avisoLimite" class="aviso-limite-seguimiento-competicion" role="status">
      Puedes seguir hasta {{ MAX_COMPETICIONES_SEGUIDAS }} competiciones disponibles en este dispositivo.
    </span>
  </div>
</template>

<style scoped>
.control-seguimiento-competicion { display: grid; justify-items: start; gap: 5px; }
.boton-seguimiento-competicion { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 8px; border: 1px solid #b9cee4; border-radius: 999px; background: #f2f7fc; color: #145e99; padding: 8px 14px; font: inherit; font-size: .82rem; font-weight: 750; cursor: pointer; transition: background .15s ease, border-color .15s ease, color .15s ease; }
.boton-seguimiento-competicion:hover, .boton-seguimiento-competicion:focus-visible { border-color: #1689cb; background: #e5f3ff; outline: 2px solid #1689cb; outline-offset: 2px; }
.boton-seguimiento-competicion[aria-pressed="true"] { border-color: #0e3154; background: #0e3154; color: #fff; }
.boton-seguimiento-competicion.compacto { min-height: 34px; padding: 6px 11px; font-size: .74rem; }
.aviso-limite-seguimiento-competicion { color: #8a4c00; font-size: .76rem; line-height: 1.4; }
:global(body.tema-publico-azul) .boton-seguimiento-competicion { border-color: #365875; background: #132f4d; color: #a4eaff; }
:global(body.tema-publico-azul) .boton-seguimiento-competicion:hover,
:global(body.tema-publico-azul) .boton-seguimiento-competicion:focus-visible { border-color: #59d9ff; background: #1a4164; color: #fff; }
:global(body.tema-publico-azul) .boton-seguimiento-competicion[aria-pressed="true"] { border-color: #59d9ff; background: #17476b; color: #fff; }
:global(body.tema-publico-azul) .aviso-limite-seguimiento-competicion { color: #ffe2a6; }
@media (prefers-reduced-motion: reduce) { .boton-seguimiento-competicion { transition: none; } }
</style>
