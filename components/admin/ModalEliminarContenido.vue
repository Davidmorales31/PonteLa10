<script setup lang="ts">
import {
  AlertTriangle,
  ShieldCheck,
  Trash2,
  X
} from '@lucide/vue'
import type {
  ArticuloBandejaEditorial,
  EstadoContenidoEditorial,
  ResultadoEliminacionArticuloEditorial
} from '~/types/contenidoEditorial'

const props = defineProps<{
  articulo: Pick<ArticuloBandejaEditorial, 'id' | 'titulo'> & {
    estado: EstadoContenidoEditorial
  }
  nivelAal?: 'aal1' | 'aal2'
  retorno: string
}>()

const emit = defineEmits<{
  cerrar: []
  eliminado: [resultado: ResultadoEliminacionArticuloEditorial]
}>()

const { ejecutarConBloqueo } = useBloqueoInterfaz()
const confirmacion = ref('')
const eliminando = ref(false)
const errorEliminacion = ref('')

const sesionVerificada = computed(() => props.nivelAal === 'aal2')
const confirmacionValida = computed(() =>
  confirmacion.value === props.articulo.titulo
)
const puedeEliminar = computed(() =>
  confirmacionValida.value && sesionVerificada.value && !eliminando.value
)
const rutaVerificacion = computed(() => ({
  path: '/admin/seguridad',
  query: {
    motivo: 'mfa',
    retorno: props.retorno
  }
}))

async function eliminarContenido() {
  if (!puedeEliminar.value) return

  eliminando.value = true
  errorEliminacion.value = ''

  await ejecutarConBloqueo(
    `eliminar-contenido:${props.articulo.id}`,
    'Eliminando contenido',
    async () => {
      try {
        const resultado = await $fetch<ResultadoEliminacionArticuloEditorial>(
          `/api/admin/contenidos/${props.articulo.id}`,
          {
            method: 'DELETE',
            body: { confirmacion: confirmacion.value }
          }
        )
        emit('eliminado', resultado)
      } catch (errorPeticion: unknown) {
        const errorConDatos = errorPeticion as {
          data?: { statusMessage?: string }
          statusMessage?: string
        }
        errorEliminacion.value = errorConDatos.data?.statusMessage
          || errorConDatos.statusMessage
          || 'No se pudo eliminar el contenido.'
      } finally {
        eliminando.value = false
      }
    }
  )
}
</script>

<template>
  <div
    class="fondo-modal-editorial"
    role="presentation"
    @mousedown.self="emit('cerrar')"
  >
    <section
      class="modal-editorial modal-eliminar-contenido"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="titulo-eliminar-contenido"
      aria-describedby="detalle-eliminar-contenido"
    >
      <header class="cabecera-modal-editorial">
        <div>
          <p class="etiqueta-panel">Acción irreversible</p>
          <h2 id="titulo-eliminar-contenido">Eliminar contenido</h2>
          <span>{{ articulo.titulo }}</span>
        </div>
        <button
          type="button"
          title="Cerrar"
          aria-label="Cerrar eliminación"
          @click="emit('cerrar')"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <form class="formulario-eliminar-contenido" @submit.prevent="eliminarContenido">
        <aside id="detalle-eliminar-contenido" class="advertencia-eliminar-contenido">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Se eliminará de forma definitiva</strong>
            <p>
              Desaparecerá del sitio público, las bandejas, el historial,
              los comentarios, los autoguardados y la distribución social.
              Las imágenes de la biblioteca se conservarán.
            </p>
          </div>
        </aside>

        <label>
          Escribe el título completo para confirmar
          <strong>{{ articulo.titulo }}</strong>
          <input
            v-model="confirmacion"
            type="text"
            maxlength="160"
            autocomplete="off"
            spellcheck="false"
          >
        </label>

        <aside v-if="!sesionVerificada" class="aviso-mfa-accion-editorial">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>Verificación reforzada requerida</strong>
            <p>Eliminar contenido exige MFA y regresarás aquí al verificarte.</p>
          </div>
          <NuxtLink :to="rutaVerificacion">Verificar sesión</NuxtLink>
        </aside>

        <p v-if="errorEliminacion" class="aviso-error-editorial" role="alert">
          {{ errorEliminacion }}
        </p>

        <footer class="acciones-modal-editorial">
          <button
            class="boton-editorial-secundario"
            type="button"
            :disabled="eliminando"
            @click="emit('cerrar')"
          >
            Cancelar
          </button>
          <button
            class="boton-eliminar-definitivo"
            type="submit"
            :disabled="!puedeEliminar"
          >
            <Trash2 aria-hidden="true" />
            Eliminar definitivamente
          </button>
        </footer>
      </form>
    </section>
  </div>
</template>
