<script setup lang="ts">
import { Menu, Search, X } from '@lucide/vue'
import { navegacionLanding } from '~/data/landing.mock'

const rutaActual = useRoute()
const menuAbierto = ref(false)
const busquedaAbierta = ref(false)
const terminoBusqueda = ref('')
const { autenticacionConfigurada, usuarioActual, obtenerSesionActual } = useAutenticacionEditorial()

const accionCuenta = computed(() => ({
  etiqueta: usuarioActual.value ? 'Panel' : 'Entrar',
  ruta: usuarioActual.value ? '/admin' : '/login'
}))

onMounted(async () => {
  if (autenticacionConfigurada.value) {
    await obtenerSesionActual()
  }
})

watch(() => rutaActual.fullPath, () => {
  menuAbierto.value = false
  busquedaAbierta.value = false
})

function esRutaActiva(ruta: string, exacta = false): boolean {
  if (exacta) {
    return rutaActual.path === ruta
  }

  return rutaActual.fullPath === ruta || rutaActual.path === ruta
}

function alternarBusqueda() {
  busquedaAbierta.value = !busquedaAbierta.value
  if (busquedaAbierta.value) {
    menuAbierto.value = false
  }
}

function alternarMenu() {
  menuAbierto.value = !menuAbierto.value
  if (menuAbierto.value) {
    busquedaAbierta.value = false
  }
}

async function buscarContenido() {
  const termino = terminoBusqueda.value.trim()
  if (!termino) {
    return
  }

  await navigateTo({ path: '/articulos', query: { buscar: termino } })
}
</script>

<template>
  <header class="cabecera-landing">
    <div class="cabecera-landing-contenido">
      <NuxtLink class="marca-cabecera-landing" to="/" aria-label="Pont3la10, ir al inicio">
        <img
          src="/brand/pont3la10_logo_login_blanco.png"
          alt="Pont3la10"
          width="598"
          height="115"
          decoding="async"
        >
      </NuxtLink>

      <nav class="navegacion-landing-escritorio" aria-label="Navegación principal">
        <NuxtLink
          v-for="item in navegacionLanding"
          :key="item.etiqueta"
          :to="item.ruta"
          :class="{ activo: esRutaActiva(item.ruta, item.exacta) }"
        >
          {{ item.etiqueta }}
        </NuxtLink>
      </nav>

      <div class="acciones-cabecera-landing">
        <button
          class="boton-icono-cabecera"
          type="button"
          :aria-expanded="busquedaAbierta"
          aria-controls="busqueda-cabecera"
          title="Buscar contenido"
          @click="alternarBusqueda"
        >
          <Search aria-hidden="true" />
          <span class="solo-lectores-pantalla">Buscar contenido</span>
        </button>
        <BotonBase :accion="accionCuenta" icono="usuario" />
        <button
          class="boton-icono-cabecera boton-menu-movil"
          type="button"
          :aria-expanded="menuAbierto"
          aria-controls="menu-principal-movil"
          title="Abrir menú"
          @click="alternarMenu"
        >
          <X v-if="menuAbierto" aria-hidden="true" />
          <Menu v-else aria-hidden="true" />
          <span class="solo-lectores-pantalla">{{ menuAbierto ? 'Cerrar menú' : 'Abrir menú' }}</span>
        </button>
      </div>
    </div>

    <form
      v-if="busquedaAbierta"
      id="busqueda-cabecera"
      class="busqueda-cabecera-landing"
      role="search"
      @submit.prevent="buscarContenido"
    >
      <label for="termino-busqueda">¿Qué jugada estás buscando?</label>
      <div>
        <input
          id="termino-busqueda"
          v-model="terminoBusqueda"
          type="search"
          maxlength="120"
          placeholder="Mundial, Colombia, tecnología..."
          autofocus
        >
        <button type="submit" aria-label="Buscar" title="Buscar">
          <Search aria-hidden="true" />
        </button>
      </div>
    </form>

    <nav v-if="menuAbierto" id="menu-principal-movil" class="navegacion-landing-movil" aria-label="Menú móvil">
      <NuxtLink
        v-for="item in navegacionLanding"
        :key="item.etiqueta"
        :to="item.ruta"
        :class="{ activo: esRutaActiva(item.ruta, item.exacta) }"
      >
        {{ item.etiqueta }}
      </NuxtLink>
    </nav>
  </header>
</template>
