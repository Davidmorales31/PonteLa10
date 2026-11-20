<script setup lang="ts">
import { CornerDownLeft, Search } from '@lucide/vue'
import type { Component } from 'vue'

/** Paleta de navegación (Ctrl+K): escribe y salta a cualquier módulo sin buscarlo en el menú. */
export interface EntradaPaleta {
  etiqueta: string
  ruta: string
  grupo: string
  icono?: Component
  palabras?: string
}

const props = defineProps<{ abierta: boolean, entradas: EntradaPaleta[] }>()
const emit = defineEmits<{ cerrar: [] }>()

const texto = ref('')
const seleccionada = ref(0)
const entrada = ref<HTMLInputElement | null>(null)
const idLista = useId()

const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const resultados = computed(() => {
  const busqueda = normalizar(texto.value.trim())
  if (!busqueda) return props.entradas
  return props.entradas.filter(e => normalizar(`${e.etiqueta} ${e.grupo} ${e.palabras || ''}`).includes(busqueda))
})

watch(() => props.abierta, async (abierta) => {
  if (!abierta) return
  texto.value = ''
  seleccionada.value = 0
  await nextTick()
  entrada.value?.focus()
})
watch(texto, () => { seleccionada.value = 0 })

function ir(destino?: EntradaPaleta) {
  if (!destino) return
  emit('cerrar')
  navigateTo(destino.ruta)
}

function alPulsar(evento: KeyboardEvent) {
  const total = resultados.value.length
  if (evento.key === 'Escape') { evento.preventDefault(); emit('cerrar') }
  else if (evento.key === 'ArrowDown' && total) { evento.preventDefault(); seleccionada.value = (seleccionada.value + 1) % total }
  else if (evento.key === 'ArrowUp' && total) { evento.preventDefault(); seleccionada.value = (seleccionada.value - 1 + total) % total }
  else if (evento.key === 'Enter') { evento.preventDefault(); ir(resultados.value[seleccionada.value]) }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="abierta" class="modal-panel-fondo modal-panel-fondo--alto" @mousedown.self="emit('cerrar')">
      <div class="paleta-panel" role="dialog" aria-modal="true" aria-label="Ir a un módulo del panel" @keydown="alPulsar">
        <label class="paleta-panel-buscar">
          <Search aria-hidden="true" />
          <input
            ref="entrada"
            v-model="texto"
            type="text"
            role="combobox"
            aria-expanded="true"
            :aria-controls="idLista"
            :aria-activedescendant="resultados.length ? `${idLista}-${seleccionada}` : undefined"
            placeholder="Ir a… (contenidos, redes, revisión)"
            autocomplete="off"
          >
          <kbd>Esc</kbd>
        </label>
        <ul v-if="resultados.length" :id="idLista" class="paleta-panel-lista" role="listbox">
          <li
            v-for="(resultado, indice) in resultados"
            :id="`${idLista}-${indice}`"
            :key="resultado.ruta"
            role="option"
            :aria-selected="indice === seleccionada"
            :class="{ activa: indice === seleccionada }"
            @mousemove="seleccionada = indice"
            @click="ir(resultado)"
          >
            <component :is="resultado.icono" v-if="resultado.icono" aria-hidden="true" />
            <span>{{ resultado.etiqueta }}</span>
            <small>{{ resultado.grupo }}</small>
            <CornerDownLeft v-if="indice === seleccionada" class="paleta-panel-enter" aria-hidden="true" />
          </li>
        </ul>
        <p v-else class="paleta-panel-vacia">No hay módulos que coincidan con «{{ texto }}».</p>
      </div>
    </div>
  </Teleport>
</template>
