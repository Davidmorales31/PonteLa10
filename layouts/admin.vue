<script setup lang="ts">
import {
  Activity,
  ClipboardCheck,
  ExternalLink,
  Files,
  Images,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  ShieldCheck,
  Tags,
  X
} from '@lucide/vue'
import type { PermisoEditorial } from '~/types/editorial'
import {
  etiquetasRolesEditoriales,
  obtenerRolPrincipal
} from '~/utils/editorial/permisos'

interface EntradaPanel {
  etiqueta: string
  ruta: string
  icono: typeof LayoutDashboard
  permiso?: PermisoEditorial
}

const route = useRoute()
const menuAbierto = ref(false)
const { cerrarSesion } = useAutenticacionEditorial()
const {
  contextoEditorial,
  tienePermiso,
  limpiarContextoEditorial
} = useContextoEditorial()

const entradasPanel: EntradaPanel[] = [
  {
    etiqueta: 'Centro editorial',
    ruta: '/admin',
    icono: LayoutDashboard
  },
  {
    etiqueta: 'Contenidos',
    ruta: '/admin/contenidos',
    icono: Files,
    permiso: 'contenido.verBorradores'
  },
  {
    etiqueta: 'Revisión',
    ruta: '/admin/revision',
    icono: ClipboardCheck,
    permiso: 'contenido.revisar'
  },
  {
    etiqueta: 'Multimedia',
    ruta: '/admin/media',
    icono: Images,
    permiso: 'media.ver'
  },
  {
    etiqueta: 'Taxonomías',
    ruta: '/admin/taxonomias',
    icono: Tags,
    permiso: 'taxonomia.ver'
  },
  {
    etiqueta: 'Seguridad',
    ruta: '/admin/seguridad',
    icono: ShieldCheck
  },
  {
    etiqueta: 'Auditoría',
    ruta: '/admin/auditoria',
    icono: Activity,
    permiso: 'auditoria.ver'
  }
]

const entradasVisibles = computed(() =>
  entradasPanel.filter(entrada => !entrada.permiso || tienePermiso(entrada.permiso))
)

const rolPrincipal = computed(() => {
  const rol = obtenerRolPrincipal(contextoEditorial.value?.roles || [])
  return rol ? etiquetasRolesEditoriales[rol] : 'Equipo editorial'
})

watch(() => route.fullPath, () => {
  menuAbierto.value = false
})

function esRutaActiva(ruta: string): boolean {
  return ruta === '/admin'
    ? route.path === ruta
    : route.path.startsWith(ruta)
}

async function salirPanel() {
  limpiarContextoEditorial()
  await cerrarSesion()
  await navigateTo('/')
}
</script>

<template>
  <div class="panel-editorial">
    <aside
      id="navegacion-panel"
      class="panel-editorial-lateral"
      :class="{ abierto: menuAbierto }"
    >
      <div class="marca-panel-editorial">
        <NuxtLink to="/admin" aria-label="Pont3la10, centro editorial">
          <img
            src="/brand/pont3la10_logo_login_blanco.png"
            alt="Pont3la10"
            width="598"
            height="115"
          >
        </NuxtLink>
        <span>Panel editorial</span>
      </div>

      <nav class="navegacion-panel-editorial" aria-label="Navegación editorial">
        <NuxtLink
          v-for="entrada in entradasVisibles"
          :key="entrada.ruta"
          :to="entrada.ruta"
          :class="{ activo: esRutaActiva(entrada.ruta) }"
        >
          <component :is="entrada.icono" aria-hidden="true" />
          <span>{{ entrada.etiqueta }}</span>
        </NuxtLink>
      </nav>

      <div class="pie-panel-editorial">
        <NuxtLink to="/" target="_blank">
          <ExternalLink aria-hidden="true" />
          <span>Ver sitio público</span>
        </NuxtLink>
        <button type="button" @click="salirPanel">
          <LogOut aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <button
      v-if="menuAbierto"
      class="fondo-menu-panel"
      type="button"
      aria-label="Cerrar navegación"
      @click="menuAbierto = false"
    />

    <section class="panel-editorial-superficie">
      <header class="cabecera-panel-editorial">
        <button
          class="boton-menu-panel"
          type="button"
          :aria-expanded="menuAbierto"
          aria-controls="navegacion-panel"
          :title="menuAbierto ? 'Cerrar menú' : 'Abrir menú'"
          @click="menuAbierto = !menuAbierto"
        >
          <X v-if="menuAbierto" aria-hidden="true" />
          <Menu v-else aria-hidden="true" />
          <span class="solo-lectores-pantalla">
            {{ menuAbierto ? 'Cerrar menú' : 'Abrir menú' }}
          </span>
        </button>

        <div class="sesion-panel-editorial">
          <span class="avatar-panel">{{ contextoEditorial?.usuario.nombre.charAt(0) || 'P' }}</span>
          <span>
            <strong>{{ contextoEditorial?.usuario.nombre || 'Pont3la10' }}</strong>
            <small>{{ rolPrincipal }}</small>
          </span>
          <LockKeyhole
            v-if="contextoEditorial?.nivelAal === 'aal2'"
            class="estado-mfa-panel"
            aria-label="Sesión con MFA"
          />
        </div>
      </header>

      <main class="contenido-panel-editorial">
        <slot />
      </main>
    </section>
  </div>
</template>
