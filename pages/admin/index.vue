<script setup lang="ts">
import {
  CheckCircle2,
  ClipboardCheck,
  Files,
  FilePenLine,
  Newspaper,
  ShieldCheck
} from '@lucide/vue'
import type { ResumenPanelEditorial } from '~/types/editorial'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial'
})

useSeoMeta({
  title: 'Centro editorial | Pont3la10',
  robots: 'noindex, nofollow'
})

const { contextoEditorial } = useContextoEditorial()
const {
  data: resumen,
  status,
  error,
  refresh
} = await useFetch<ResumenPanelEditorial>('/api/admin/resumen')

const indicadores = computed(() => [
  {
    etiqueta: 'Borradores',
    valor: resumen.value?.borradores || 0,
    icono: FilePenLine
  },
  {
    etiqueta: 'En revisión',
    valor: resumen.value?.enRevision || 0,
    icono: ClipboardCheck
  },
  {
    etiqueta: 'Publicados',
    valor: resumen.value?.publicados || 0,
    icono: Newspaper
  },
  {
    etiqueta: 'Total visible',
    valor: resumen.value?.totalContenidos || 0,
    icono: CheckCircle2
  }
])

async function recargarResumen() {
  await refresh()
}
</script>

<template>
  <div class="vista-panel-editorial">
    <header class="titulo-vista-panel">
      <div>
        <p class="etiqueta-panel">Operación editorial</p>
        <h1>Centro editorial</h1>
        <p>
          Hola, {{ contextoEditorial?.usuario.nombre }}. Esta es la base privada desde la que crecerá
          el flujo de contenidos de Pont3la10.
        </p>
      </div>
      <div class="acciones-cabecera-panel">
        <NuxtLink class="accion-panel-secundaria" to="/admin/seguridad">
          <ShieldCheck aria-hidden="true" />
          <span>Seguridad</span>
        </NuxtLink>
        <NuxtLink class="boton-editorial-principal" to="/admin/contenidos">
          <Files aria-hidden="true" />
          <span>Ver contenidos</span>
        </NuxtLink>
      </div>
    </header>

    <section class="indicadores-panel" aria-label="Resumen editorial">
      <template v-if="status === 'pending'">
        <div v-for="indice in 4" :key="indice" class="indicador-panel esqueleto-panel">
          <span />
          <span />
        </div>
      </template>
      <article v-for="indicador in indicadores" v-else :key="indicador.etiqueta" class="indicador-panel">
        <component :is="indicador.icono" aria-hidden="true" />
        <div>
          <strong>{{ indicador.valor }}</strong>
          <span>{{ indicador.etiqueta }}</span>
        </div>
      </article>
    </section>

    <section v-if="error" class="aviso-panel aviso-panel-error" role="alert">
      <div>
        <strong>No pudimos cargar el resumen</strong>
        <span>La sesión está protegida; vuelve a intentar la consulta.</span>
      </div>
      <button type="button" @click="recargarResumen">Reintentar</button>
    </section>

    <section class="estado-fundacion-editorial" aria-labelledby="titulo-fundacion-editorial">
      <div class="cabecera-bloque-panel">
        <div>
          <p class="etiqueta-panel">HU-ED-01</p>
          <h2 id="titulo-fundacion-editorial">Fundación del CMS</h2>
        </div>
        <span class="estado-operativo">
          <CheckCircle2 aria-hidden="true" />
          Base operativa
        </span>
      </div>

      <div class="lista-capacidades-panel">
        <article>
          <strong>Acceso por capacidades</strong>
          <p>Las rutas, APIs y datos validan permisos editoriales, no solo una sesión abierta.</p>
        </article>
        <article>
          <strong>Revisión y trazabilidad</strong>
          <p>El esquema conserva versiones y registra cambios sensibles para auditoría.</p>
        </article>
        <article>
          <strong>Publicación protegida</strong>
          <p>Publicar, programar y administrar el equipo exige autorización reforzada con MFA.</p>
        </article>
      </div>
    </section>

    <section class="proximas-fases-panel" aria-labelledby="titulo-proximas-fases">
      <div class="cabecera-bloque-panel">
        <div>
          <p class="etiqueta-panel">Siguiente bloque</p>
          <h2 id="titulo-proximas-fases">Camino editorial</h2>
        </div>
      </div>
      <ol>
        <li><span>01</span><strong>Modelo y taxonomías</strong><small>Bandeja y borradores operativos.</small></li>
        <li><span>02</span><strong>Editor estructurado</strong><small>Escritura, bloques y autoguardado.</small></li>
        <li><span>03</span><strong>Biblioteca de medios</strong><small>Imágenes seguras y reutilizables.</small></li>
      </ol>
    </section>
  </div>
</template>
