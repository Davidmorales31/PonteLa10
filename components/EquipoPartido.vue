<script setup lang="ts">
const propiedades = defineProps<{
  nombre: string
  escudo: string | null
  slug?: string
  alineacion: 'local' | 'visitante' | 'fila'
}>()

const escudoNoDisponible = ref(false)
const inicialesEquipo = computed(() => propiedades.nombre
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map(parte => parte[0])
  .join('')
  .toLocaleUpperCase('es-CO'))
const rutaEquipo = computed(() => propiedades.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(propiedades.slug)
  ? `/equipos/${propiedades.slug}`
  : null)

function marcarEscudoFallido() {
  escudoNoDisponible.value = true
}
</script>

<template>
  <div class="identidad-equipo-partido" :class="`identidad-equipo-partido--${alineacion}`">
    <NuxtLink v-if="rutaEquipo && escudo && !escudoNoDisponible" class="escudo-enlace-partido" :to="rutaEquipo" :aria-label="`Ver equipo ${nombre}`">
      <EscudoEquipoPublico :src="escudo" :alt="`Escudo de ${nombre}`" :width="52" :height="52" sizes="52px" loading="lazy" @error="marcarEscudoFallido" />
    </NuxtLink>
    <EscudoEquipoPublico v-else-if="escudo && !escudoNoDisponible" :src="escudo" :alt="`Escudo de ${nombre}`" :width="52" :height="52" sizes="52px" loading="lazy" @error="marcarEscudoFallido" />
    <b v-else class="escudo-fallback-partido" aria-hidden="true">{{ inicialesEquipo }}</b>
    <strong>
      <NuxtLink v-if="rutaEquipo" :to="rutaEquipo">{{ nombre }}</NuxtLink>
      <span v-else>{{ nombre }}</span>
    </strong>
  </div>
</template>

<style scoped>
.identidad-equipo-partido {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.identidad-equipo-partido--visitante {
  justify-content: flex-end;
  text-align: right;
}

.identidad-equipo-partido strong {
  min-width: 0;
  font-size: .84rem;
  font-weight: 800;
  line-height: 1.22;
  overflow-wrap: anywhere;
}

.identidad-equipo-partido strong a {
  color: inherit;
  text-decoration: none;
}

.identidad-equipo-partido strong a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.identidad-equipo-partido--fila strong {
  font-size: clamp(.86rem, 1vw, 1rem);
}

.identidad-equipo-partido :deep(img) {
  display: block;
  width: 38px;
  height: 42px;
  flex: 0 0 auto;
  object-fit: contain;
}

.escudo-enlace-partido {
  display: block;
  flex: 0 0 auto;
}

.escudo-fallback-partido {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--liga-borde, #d8e0e8);
  border-radius: 50%;
  background: var(--liga-superficie-secundaria, #f3f6fa);
  color: var(--liga-acento, #07528c);
  font-size: .65rem;
  font-weight: 900;
}

@media (max-width: 620px) {
  .identidad-equipo-partido {
    gap: 6px;
  }

  .identidad-equipo-partido :deep(img),
  .escudo-fallback-partido {
    width: 32px;
    height: 34px;
  }

  .identidad-equipo-partido strong,
  .identidad-equipo-partido--fila strong {
    font-size: .76rem;
  }
}
</style>
