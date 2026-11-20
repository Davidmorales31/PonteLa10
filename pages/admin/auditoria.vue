<script setup lang="ts">
import { Activity, RefreshCw } from '@lucide/vue'
import type { RegistroAuditoriaEditorial } from '~/types/editorial'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'auditoria.ver'
})

useSeoMeta({
  title: 'Auditoría editorial | Ponte la 10',
  robots: 'noindex, nofollow'
})

const {
  data: registros,
  status,
  error,
  refresh
} = await useFetch<RegistroAuditoriaEditorial[]>('/api/admin/auditoria')

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

function describirAccion(registro: RegistroAuditoriaEditorial): string {
  const acciones: Record<string, string> = {
    insert: 'Creación',
    update: 'Actualización',
    delete: 'Eliminación'
  }

  return acciones[registro.accion] || registro.accion
}

async function recargarAuditoria() {
  await refresh()
}
</script>

<template>
  <div class="pagina-ajustada">
    <header class="titulo-vista-panel">
      <div>
        <h1>Auditoría editorial</h1>
        <p>Últimos cambios de contenido y asignaciones de roles registrados por el sistema.</p>
      </div>
      <button
        class="boton-panel"
        type="button"
        :disabled="status === 'pending'"
        @click="recargarAuditoria"
      >
        <RefreshCw :class="{ 'icono-girando': status === 'pending' }" aria-hidden="true" />
        <span>Actualizar</span>
      </button>
    </header>

    <section class="zona-desplazable" aria-live="polite" aria-label="Movimientos registrados">
      <div v-if="status === 'pending'" aria-label="Cargando auditoría">
        <div v-for="indice in 8" :key="indice" class="esqueleto-fila" />
      </div>

      <div v-else-if="error" class="estado-vacio-compacto">
        <Activity aria-hidden="true" />
        <h2>No se pudo cargar la auditoría</h2>
        <p>Verifica que la sesión tenga MFA activo e inténtalo de nuevo.</p>
      </div>

      <div v-else-if="!registros?.length" class="estado-vacio-compacto">
        <Activity aria-hidden="true" />
        <h2>Aún no hay movimientos</h2>
        <p>Los cambios sensibles aparecerán aquí automáticamente.</p>
      </div>

      <div v-else>
        <table class="tabla-densa">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="registro in registros" :key="registro.id">
              <td>{{ formatoFecha.format(new Date(registro.creadoEn)) }}</td>
              <td><strong>{{ describirAccion(registro) }}</strong></td>
              <td>{{ registro.tipoEntidad }}</td>
              <td><code>{{ registro.actorId?.slice(0, 8) || 'sistema' }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
