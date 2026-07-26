<script setup lang="ts">
import {
  ImagePlus,
  Images,
  ShieldAlert,
  Trash2,
  X
} from '@lucide/vue'
import BibliotecaMediosEditorial from '~/components/admin/BibliotecaMediosEditorial.vue'
import ModalEditarMedio from '~/components/admin/ModalEditarMedio.vue'
import ModalSubirMedio from '~/components/admin/ModalSubirMedio.vue'
import type { MedioEditorial } from '~/types/mediaEditorial'

definePageMeta({
  layout: 'admin',
  middleware: 'autenticacion-editorial',
  permisoEditorial: 'media.ver'
})

useSeoMeta({
  title: 'Biblioteca multimedia | Pont3la10',
  robots: 'noindex, nofollow'
})

interface ReferenciaBiblioteca {
  refresh: () => Promise<void>
}

const { tienePermiso, contextoEditorial } = useContextoEditorial()
const { ejecutarConBloqueo } = useBloqueoInterfaz()
const biblioteca = ref<ReferenciaBiblioteca | null>(null)
const modalSubidaAbierto = ref(false)
const medioEnEdicion = ref<MedioEditorial | null>(null)
const medioAEliminar = ref<MedioEditorial | null>(null)
const errorEliminacion = ref('')

function cerrarModales() {
  modalSubidaAbierto.value = false
  medioEnEdicion.value = null
  medioAEliminar.value = null
  errorEliminacion.value = ''
}

async function medioGuardado() {
  cerrarModales()
  await biblioteca.value?.refresh()
}

async function eliminarMedio() {
  const medio = medioAEliminar.value
  if (!medio) return

  errorEliminacion.value = ''

  await ejecutarConBloqueo(
    `eliminar-medio:${medio.id}`,
    'Eliminando imagen',
    async () => {
      try {
        await $fetch(`/api/admin/media/${medio.id}`, {
          method: 'DELETE'
        })
        cerrarModales()
        await biblioteca.value?.refresh()
      } catch (error: unknown) {
        const peticion = error as {
          data?: { statusMessage?: string }
          statusMessage?: string
        }
        errorEliminacion.value = peticion.data?.statusMessage
          || peticion.statusMessage
          || 'No se pudo eliminar la imagen.'
      }
    }
  )
}
</script>

<template>
  <div class="vista-panel-editorial vista-biblioteca-multimedia">
    <header class="cabecera-vista-panel cabecera-biblioteca-medios">
      <div>
        <p class="etiqueta-panel">Activos editoriales</p>
        <h1>Biblioteca multimedia</h1>
        <p>
          Imágenes optimizadas, accesibles y listas para acompañar cada historia.
        </p>
      </div>
      <button
        v-if="tienePermiso('media.subir')"
        class="boton-editorial-principal"
        type="button"
        @click="modalSubidaAbierto = true"
      >
        <ImagePlus aria-hidden="true" />
        Subir imagen
      </button>
    </header>

    <aside class="aviso-seguridad-medios" aria-label="Procesamiento de imágenes">
      <Images aria-hidden="true" />
      <div>
        <strong>Optimización automática</strong>
        <span>
          Las imágenes se validan, limpian y convierten a WebP antes de almacenarse.
        </span>
      </div>
      <span>Máximo 12 MB</span>
    </aside>

    <BibliotecaMediosEditorial
      ref="biblioteca"
      @editar="medioEnEdicion = $event"
      @eliminar="medioAEliminar = $event"
    />

    <ModalSubirMedio
      v-if="modalSubidaAbierto"
      @cerrar="modalSubidaAbierto = false"
      @subido="medioGuardado"
    />

    <ModalEditarMedio
      v-if="medioEnEdicion"
      :medio="medioEnEdicion"
      @cerrar="medioEnEdicion = null"
      @actualizado="medioGuardado"
    />

    <div
      v-if="medioAEliminar"
      class="fondo-modal-editorial"
      role="presentation"
      @mousedown.self="medioAEliminar = null"
    >
      <section
        class="modal-editorial modal-confirmar-eliminacion"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-eliminar-medio"
      >
        <header class="cabecera-modal-editorial">
          <div>
            <p class="etiqueta-panel etiqueta-peligro">Acción protegida</p>
            <h2 id="titulo-eliminar-medio">Eliminar imagen</h2>
          </div>
          <button
            type="button"
            title="Cerrar"
            aria-label="Cerrar confirmación"
            @click="medioAEliminar = null"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div class="contenido-confirmacion-medio">
          <ShieldAlert aria-hidden="true" />
          <p>
            Vas a eliminar <strong>{{ medioAEliminar.titulo }}</strong>.
            Solo es posible si no está siendo usada como portada.
          </p>
          <small>
            La eliminación requiere MFA. Sesión actual:
            {{ contextoEditorial?.nivelAal === 'aal2' ? 'verificada' : 'sin verificación reforzada' }}.
          </small>
        </div>

        <p v-if="errorEliminacion" class="aviso-error-editorial" role="alert">
          {{ errorEliminacion }}
        </p>

        <footer class="acciones-modal-editorial">
          <button
            class="boton-editorial-secundario"
            type="button"
            @click="medioAEliminar = null"
          >
            Cancelar
          </button>
          <button
            class="boton-editorial-peligro"
            type="button"
            @click="eliminarMedio"
          >
            <Trash2 aria-hidden="true" />
            Eliminar definitivamente
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>
