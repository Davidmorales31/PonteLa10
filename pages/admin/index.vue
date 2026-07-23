<script setup lang="ts">
import { LoaderCircle, Play } from '@lucide/vue'

definePageMeta({
  middleware: 'autenticacion-editorial'
})

const { usuarioActual, cerrarSesion } = useAutenticacionEditorial()
const tipoEsqueleto = ref<'franja' | 'listado' | 'detalle'>('listado')
const simulandoCarga = ref(false)

async function simularCarga() {
  if (simulandoCarga.value) return
  simulandoCarga.value = true
  await new Promise(resolve => setTimeout(resolve, 2800))
  simulandoCarga.value = false
}

async function salirPanel() {
  await cerrarSesion()
  await navigateTo('/login')
}
</script>

<template>
  <section class="admin-dashboard">
    <div class="cabecera-pagina">
      <p class="etiqueta-seccion">Panel interno</p>
      <h1>Centro editorial</h1>
      <p>
        Desde aqui viviran los borradores, publicaciones, piezas sociales asociadas y modulos asistidos por IA.
      </p>
      <div class="barra-admin-sesion">
        <span>{{ usuarioActual?.email || 'Sesion editorial activa' }}</span>
        <button class="boton-secundario" type="button" @click="salirPanel">Cerrar sesion</button>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="dashboard-panel">
        <p class="etiqueta-seccion">Prioridad</p>
        <h2>Publicar contenido base</h2>
        <p>CRUD editorial, categorias, imagen destacada, estados y SEO son la primera meta tecnica.</p>
      </section>
      <section class="dashboard-panel">
        <p class="etiqueta-seccion">Redes</p>
        <h2>Uso interno</h2>
        <p>Cada noticia podra generar piezas por red social desde el panel, conectadas luego por APIs.</p>
      </section>
      <section class="dashboard-panel">
        <p class="etiqueta-seccion">Seguridad</p>
        <h2>Roles y aprobacion</h2>
        <p>La IA ayuda, pero el flujo editorial empieza con revision humana antes de publicar.</p>
      </section>
    </div>

    <section class="laboratorio-carga-admin" aria-labelledby="titulo-laboratorio-carga">
      <header>
        <div>
          <p class="etiqueta-seccion">Sistema visual</p>
          <h2 id="titulo-laboratorio-carga">Laboratorio de estados de carga</h2>
          <p>Vista interna para validar los esqueletos reutilizables antes de conectarlos a nuevos módulos.</p>
        </div>
        <button class="boton-primario" type="button" :disabled="simulandoCarga" @click="simularCarga">
          <LoaderCircle v-if="simulandoCarga" class="icono-girando" aria-hidden="true" />
          <Play v-else aria-hidden="true" />
          {{ simulandoCarga ? 'Simulando...' : 'Simular 2,8 s' }}
        </button>
      </header>
      <div class="selector-esqueleto-admin" role="group" aria-label="Tipo de esqueleto">
        <button v-for="tipo in ['franja', 'listado', 'detalle'] as const" :key="tipo" type="button" :class="{ activo: tipoEsqueleto === tipo }" :aria-pressed="tipoEsqueleto === tipo" @click="tipoEsqueleto = tipo">{{ tipo }}</button>
      </div>
      <div class="lienzo-esqueleto-admin">
        <EsqueletoResultados v-if="simulandoCarga" :tipo="tipoEsqueleto" />
        <EstadoDatosResultados v-else titulo="Demostración lista" descripcion="Selecciona un formato y ejecuta la simulación para revisar la animación completa." />
      </div>
    </section>
  </section>
</template>
