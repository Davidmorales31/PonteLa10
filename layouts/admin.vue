<script setup lang="ts">
import {
  Activity,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  ExternalLink,
  FileSpreadsheet,
  Files,
  Images,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  LogOut,
  Menu,
  NotebookPen,
  RadioTower,
  Search,
  Send,
  Tv,
  Server,
  ShieldCheck,
  Tags,
  X
} from '@lucide/vue'
import PanelPaleta from '~/components/admin/ui/PanelPaleta.vue'
import PanelPopover from '~/components/admin/ui/PanelPopover.vue'
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
const { sitioPanel, opciones: opcionesSitio, cambiarSitio, origen: origenSitioPanel } = useSitioPanel()
const menuAbierto = ref(false)
const { cerrarSesion } = useAutenticacionEditorial()
const {
  contextoEditorial,
  tienePermiso,
  limpiarContextoEditorial
} = useContextoEditorial()

const gruposPanel: Array<{ titulo: string, entradas: EntradaPanel[] }> = [
  {
    titulo: '',
    entradas: [
      { etiqueta: 'Centro editorial', ruta: '/admin', icono: LayoutDashboard }
    ]
  },
  {
    titulo: 'Contenido',
    entradas: [
      { etiqueta: 'Contenidos', ruta: '/admin/contenidos', icono: Files, permiso: 'contenido.verBorradores' },
      { etiqueta: 'Revisión', ruta: '/admin/revision', icono: ClipboardCheck, permiso: 'contenido.revisar' },
      { etiqueta: 'Multimedia', ruta: '/admin/media', icono: Images, permiso: 'media.ver' },
      { etiqueta: 'Taxonomías', ruta: '/admin/taxonomias', icono: Tags, permiso: 'taxonomia.ver' },
      { etiqueta: 'Ingestas', ruta: '/admin/ingestas', icono: RadioTower, permiso: 'ingestas.ver' }
    ]
  },
  {
    titulo: 'Distribución',
    entradas: [
      { etiqueta: 'Redes sociales', ruta: '/admin/redes', icono: Send, permiso: 'contenido.verBorradores' },
      { etiqueta: 'Programación de partidos', ruta: '/admin/programacion', icono: Tv, permiso: 'partidos.programacion.gestionar' }
    ]
  },
  {
    titulo: 'SEO y datos',
    entradas: [
      { etiqueta: 'Search Console', ruta: '/admin/search-console', icono: FileSpreadsheet, permiso: 'contenido.verBorradores' },
      { etiqueta: 'Grafo de entidades', ruta: '/admin/seo-entidades', icono: Link2, permiso: 'contenido.verBorradores' },
      { etiqueta: 'Poda de contenido', ruta: '/admin/poda-contenido', icono: NotebookPen, permiso: 'contenido.revisar' }
    ]
  },
  {
    titulo: 'Sistema',
    entradas: [
      { etiqueta: 'Operación', ruta: '/admin/operacion', icono: Server, permiso: 'configuracion.ver' },
      { etiqueta: 'Auditoría', ruta: '/admin/auditoria', icono: Activity, permiso: 'auditoria.ver' },
      { etiqueta: 'Seguridad', ruta: '/admin/seguridad', icono: ShieldCheck }
    ]
  }
]

const gruposVisibles = computed(() => gruposPanel
  .map(grupo => ({ ...grupo, entradas: grupo.entradas.filter(entrada => !entrada.permiso || tienePermiso(entrada.permiso)) }))
  .filter(grupo => grupo.entradas.length))

const entradasPaleta = computed(() => gruposVisibles.value.flatMap(grupo => grupo.entradas.map(entrada => ({
  etiqueta: entrada.etiqueta,
  ruta: entrada.ruta,
  grupo: grupo.titulo || 'Inicio',
  icono: entrada.icono
}))).concat(tienePermiso('contenido.crear')
  ? [{ etiqueta: 'Nuevo borrador', ruta: '/admin/contenidos?nuevo=1', grupo: 'Acción', icono: Files }]
  : []))

const lateralCompacto = useCookie<boolean>('panel-lateral-compacto', { default: () => false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
const paletaAbierta = ref(false)

function alPulsarTecla(evento: KeyboardEvent) {
  if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
    evento.preventDefault()
    paletaAbierta.value = !paletaAbierta.value
  }
}

onMounted(() => document.addEventListener('keydown', alPulsarTecla))
onBeforeUnmount(() => document.removeEventListener('keydown', alPulsarTecla))

const rolPrincipal = computed(() => {
  const rol = obtenerRolPrincipal(contextoEditorial.value?.roles || [])
  return rol ? etiquetasRolesEditoriales[rol] : 'Equipo editorial'
})

watch(() => route.fullPath, () => {
  menuAbierto.value = false
})

function esRutaActiva(ruta: string): boolean {
  if (ruta === '/admin/operacion') return route.path === ruta
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
  <div class="pn-app" :class="{ 'pn-app--compacto': lateralCompacto }">
    <aside
      id="navegacion-panel"
      class="pn-lateral"
      :class="{ abierto: menuAbierto }"
    >
      <div class="pn-marca">
        <NuxtLink to="/admin" aria-label="Ponte la 10, centro editorial">
          <img
            src="/brand/pont3la10_logo_login_blanco.png"
            alt="Ponte la 10"
            width="598"
            height="115"
          >
        </NuxtLink>
      </div>

      <nav class="pn-navegacion" aria-label="Navegación editorial">
        <section v-for="grupo in gruposVisibles" :key="grupo.titulo || 'inicio'" class="pn-grupo">
          <h2 v-if="grupo.titulo">{{ grupo.titulo }}</h2>
          <NuxtLink
            v-for="entrada in grupo.entradas"
            :key="entrada.ruta"
            :to="entrada.ruta"
            :class="{ activo: esRutaActiva(entrada.ruta) }"
            :title="lateralCompacto ? entrada.etiqueta : undefined"
            :aria-current="esRutaActiva(entrada.ruta) ? 'page' : undefined"
          >
            <component :is="entrada.icono" aria-hidden="true" />
            <span>{{ entrada.etiqueta }}</span>
          </NuxtLink>
        </section>
      </nav>

      <button
        class="pn-colapsar"
        type="button"
        :aria-label="lateralCompacto ? 'Expandir menú' : 'Contraer menú'"
        :title="lateralCompacto ? 'Expandir menú' : 'Contraer menú'"
        @click="lateralCompacto = !lateralCompacto"
      >
        <ChevronsRight v-if="lateralCompacto" aria-hidden="true" />
        <ChevronsLeft v-else aria-hidden="true" />
        <span>Contraer menú</span>
      </button>
    </aside>

    <button
      v-if="menuAbierto"
      class="pn-fondo-menu"
      type="button"
      aria-label="Cerrar navegación"
      @click="menuAbierto = false"
    />

    <div class="pn-cuerpo">
      <header class="pn-barra">
        <button
          class="pn-boton-menu"
          type="button"
          :aria-expanded="menuAbierto"
          aria-controls="navegacion-panel"
          :title="menuAbierto ? 'Cerrar menú' : 'Abrir menú'"
          @click="menuAbierto = !menuAbierto"
        >
          <X v-if="menuAbierto" aria-hidden="true" />
          <Menu v-else aria-hidden="true" />
          <span class="sr-only">{{ menuAbierto ? 'Cerrar menú' : 'Abrir menú' }}</span>
        </button>

        <label class="pn-sitio">
          <span class="sr-only">Sitio que administras</span>
          <select :value="sitioPanel" @change="cambiarSitio(($event.target as HTMLSelectElement).value)">
            <option v-for="opcion in opcionesSitio" :key="opcion.id" :value="opcion.id">{{ opcion.nombre }}</option>
          </select>
        </label>

        <button class="pn-buscar" type="button" aria-haspopup="dialog" @click="paletaAbierta = true">
          <Search aria-hidden="true" />
          <span>Ir a…</span>
          <kbd>Ctrl K</kbd>
        </button>

        <PanelPopover :etiqueta="contextoEditorial?.usuario.nombre || 'Ponte la 10'" alinear="fin" class="pn-usuario">
          <template #icono>
            <span class="pn-avatar">{{ contextoEditorial?.usuario.nombre.charAt(0) || 'P' }}</span>
          </template>
          <template #default>
            <div class="pn-usuario-datos">
              <strong>{{ contextoEditorial?.usuario.nombre || 'Ponte la 10' }}</strong>
              <small>{{ rolPrincipal }}</small>
              <span v-if="contextoEditorial?.nivelAal === 'aal2'" class="pn-mfa">
                <LockKeyhole aria-hidden="true" /> Sesión con MFA
              </span>
            </div>
            <a class="pn-usuario-accion" :href="origenSitioPanel" target="_blank" rel="noopener">
              <ExternalLink aria-hidden="true" /> Ver sitio público
            </a>
            <button class="pn-usuario-accion" type="button" @click="salirPanel">
              <LogOut aria-hidden="true" /> Cerrar sesión
            </button>
          </template>
        </PanelPopover>
      </header>

      <main class="pn-principal">
        <slot />
      </main>
    </div>

    <PanelPaleta :abierta="paletaAbierta" :entradas="entradasPaleta" @cerrar="paletaAbierta = false" />
  </div>
</template>

<style src="~/assets/css/admin.css"></style>
<style src="~/assets/css/panel-rediseno.css"></style>
