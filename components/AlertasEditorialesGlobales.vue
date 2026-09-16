<script setup lang="ts">
import { AlertTriangle, CheckCircle2, CircleX, X } from '@lucide/vue'

const { alertas, cerrarAlerta } = useAlertasEditoriales()

const iconos = {
  exito: CheckCircle2,
  error: CircleX,
  advertencia: AlertTriangle
}
</script>

<template>
  <section class="alertas-globales-editoriales" aria-label="Notificaciones del panel">
    <TransitionGroup name="alerta-editorial">
      <article
        v-for="alerta in alertas"
        :key="alerta.id"
        class="alerta-global-editorial"
        :class="`alerta-global-editorial--${alerta.tipo}`"
        :role="alerta.tipo === 'error' ? 'alert' : 'status'"
      >
        <component :is="iconos[alerta.tipo]" aria-hidden="true" />
        <div>
          <strong>{{ alerta.titulo }}</strong>
          <p>{{ alerta.mensaje }}</p>
        </div>
        <button
          type="button"
          title="Cerrar alerta"
          aria-label="Cerrar alerta"
          @click="cerrarAlerta(alerta.id)"
        >
          <X aria-hidden="true" />
        </button>
      </article>
    </TransitionGroup>
  </section>
</template>
