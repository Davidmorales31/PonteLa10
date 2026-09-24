<script setup lang="ts">
import { ChevronDown, Menu, Moon, Search, Sun, X } from '@lucide/vue'
import { navegacionMasSitio, navegacionSitio } from '~/data/sitioPublico'
import { useTemaPublico } from '~/composables/useTemaPublico'

const rutaActual = useRoute()
const menuAbierto = ref(false)
const busquedaAbierta = ref(false)
const terminoBusqueda = ref('')
const menuMas = ref<HTMLDetailsElement | null>(null)
const { modoBlancoActivo, etiquetaAlternarTema, alternarTema } = useTemaPublico()
const { autenticacionConfigurada, usuarioActual, obtenerSesionActual } = useAutenticacionEditorial()
const { contextoEditorial, cargarContextoEditorial } = useContextoEditorial()
const logoCabecera = computed(() => modoBlancoActivo.value
  ? '/brand/pont3la10_logo_06_horizontal_sobre_blanco.png'
  : '/brand/pont3la10_logo_login_blanco.png'
)

const accionCuenta = computed(() => {
  if (contextoEditorial.value) return { etiqueta: 'Panel editorial', ruta: '/admin' }
  if (usuarioActual.value) return { etiqueta: 'Mi cuenta', ruta: '/cuenta' }
  return { etiqueta: 'Entrar', ruta: '/login' }
})

if (autenticacionConfigurada.value) {
  if (!usuarioActual.value && import.meta.client) {
    await obtenerSesionActual()
  }

  if (usuarioActual.value) {
    await cargarContextoEditorial()
  }
}

watch(() => rutaActual.fullPath, () => {
  menuAbierto.value = false
  busquedaAbierta.value = false
  if (menuMas.value) menuMas.value.open = false
})

function esRutaActiva(ruta: string, exacta = false): boolean {
  const [rutaBase, consulta] = ruta.split('?')
  if (exacta) {
    return rutaActual.path === rutaBase
  }

  if (!consulta) {
    return rutaActual.path === rutaBase && !rutaActual.query.categoria
  }

  return rutaActual.path === rutaBase
    && [...new URLSearchParams(consulta).entries()].every(([clave, valor]) =>
      String(rutaActual.query[clave] || '') === valor
    )
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
          :src="logoCabecera"
          alt="Pont3la10"
          width="598"
          height="115"
          decoding="async"
        >
      </NuxtLink>

      <nav class="navegacion-landing-escritorio" aria-label="Navegación principal">
        <NuxtLink
          v-for="item in navegacionSitio"
          :key="item.etiqueta"
          :to="item.ruta"
          :class="{ activo: esRutaActiva(item.ruta, item.exacta) }"
        >
          {{ item.etiqueta }}
        </NuxtLink>
        <details ref="menuMas" class="menu-mas-landing">
          <summary :class="{ activo: navegacionMasSitio.some(item => esRutaActiva(item.ruta, item.exacta)) }">
            Más
            <ChevronDown aria-hidden="true" />
          </summary>
          <div class="menu-mas-desplegable">
            <NuxtLink v-for="item in navegacionMasSitio" :key="item.etiqueta" :to="item.ruta">
              {{ item.etiqueta }}
            </NuxtLink>
          </div>
        </details>
      </nav>

      <div class="acciones-cabecera-landing">
        <button
          class="boton-icono-cabecera boton-tema-publico"
          type="button"
          :aria-pressed="modoBlancoActivo"
          :title="etiquetaAlternarTema"
          @click="alternarTema"
        >
          <Sun v-if="modoBlancoActivo" aria-hidden="true" />
          <Moon v-else aria-hidden="true" />
          <span class="solo-lectores-pantalla">{{ etiquetaAlternarTema }}</span>
        </button>
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
      <label for="termino-busqueda">Buscar noticias</label>
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
        v-for="item in navegacionSitio"
        :key="item.etiqueta"
        :to="item.ruta"
        :class="{ activo: esRutaActiva(item.ruta, item.exacta) }"
      >
        {{ item.etiqueta }}
      </NuxtLink>
      <p class="titulo-seccion-menu-movil">Más</p>
      <NuxtLink
        v-for="item in navegacionMasSitio"
        :key="item.etiqueta"
        :to="item.ruta"
        :class="{ activo: esRutaActiva(item.ruta, item.exacta) }"
      >
        {{ item.etiqueta }}
      </NuxtLink>
    </nav>
  </header>
</template>
