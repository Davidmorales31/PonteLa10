<script setup lang="ts">
import { ShieldCheck, X } from '@lucide/vue'

const {
  decision,
  decisionPublicidad,
  preferenciasAbiertas,
  mostrarAviso,
  aceptarAnalitica,
  rechazarAnalitica,
  aceptarPublicidad,
  rechazarPublicidad,
  abrirPreferencias,
  cerrarPreferencias,
  inicializarConsentimiento
} = useAnaliticaPublica()
const { modoBlancoActivo } = useTemaPublico()
const interfazLista = ref(false)
const analiticaSeleccionada = ref(decision.value === 'aceptada')
const publicidadSeleccionada = ref(decisionPublicidad.value === 'aceptada')

onMounted(() => {
  inicializarConsentimiento()
  interfazLista.value = true
})

watch(preferenciasAbiertas, (abiertas) => {
  if (!abiertas) return
  analiticaSeleccionada.value = decision.value === 'aceptada'
  publicidadSeleccionada.value = decisionPublicidad.value === 'aceptada'
})

function guardarPreferencias() {
  if (analiticaSeleccionada.value) aceptarAnalitica()
  else rechazarAnalitica()

  if (publicidadSeleccionada.value) aceptarPublicidad()
  else rechazarPublicidad()
}
</script>

<template>
  <aside
    v-if="interfazLista && mostrarAviso"
    class="aviso-analitica"
    :class="[
      { 'aviso-analitica--tema-blanco': modoBlancoActivo },
      { 'aviso-analitica--preferencias': preferenciasAbiertas }
    ]"
    role="dialog"
    aria-labelledby="titulo-aviso-privacidad"
    aria-describedby="descripcion-aviso-privacidad"
  >
    <button
      type="button"
      class="aviso-analitica__cerrar"
      :aria-label="preferenciasAbiertas ? 'Cerrar preferencias de privacidad' : 'Cerrar sin aceptar anuncios'"
      :title="preferenciasAbiertas ? 'Cerrar preferencias de privacidad' : 'Cerrar sin aceptar anuncios'"
      @click="cerrarPreferencias"
    >
      <X aria-hidden="true" />
    </button>
    <div class="aviso-analitica__texto">
      <h2 id="titulo-aviso-privacidad">Preferencias de privacidad</h2>
      <p v-if="!preferenciasAbiertas" id="descripcion-aviso-privacidad">
        Si aceptas, permites cookies y tecnologías similares para mostrarte anuncios. La red publicitaria puede recibir datos técnicos del dispositivo y de la página. Puedes cerrar este aviso sin aceptar. Consulta nuestra <NuxtLink to="/privacidad">política de privacidad</NuxtLink>.
      </p>
      <p v-else id="descripcion-aviso-privacidad">
        Puedes cambiar por separado tus preferencias de analítica y anuncios. Los anuncios solo se mostrarán si los permites; consulta nuestra <NuxtLink to="/privacidad">política de privacidad</NuxtLink>.
      </p>
    </div>
    <div v-if="!preferenciasAbiertas" class="aviso-analitica__acciones">
      <button type="button" class="aviso-analitica__primario" @click="aceptarPublicidad">
        Aceptar cookies y recibir anuncios
      </button>
    </div>
    <div v-else class="aviso-analitica__acciones aviso-analitica__acciones--preferencias">
      <label class="preferencia-privacidad">
        <span>
          <strong>Analítica de uso</strong>
          <small>Medición general de páginas públicas y uso del sitio.</small>
        </span>
        <input v-model="analiticaSeleccionada" type="checkbox">
      </label>
      <label class="preferencia-privacidad">
        <span>
          <strong>Cookies y anuncios</strong>
          <small>Permite tecnologías publicitarias para mostrar anuncios.</small>
        </span>
        <input v-model="publicidadSeleccionada" type="checkbox">
      </label>
      <button type="button" class="aviso-analitica__primario" @click="guardarPreferencias">
        Guardar preferencias
      </button>
    </div>
  </aside>
  <button
    v-else
    type="button"
    class="preferencias-privacidad-flotante"
    :class="{ 'preferencias-privacidad-flotante--tema-blanco': modoBlancoActivo }"
    aria-label="Abrir preferencias de privacidad"
    @click="abrirPreferencias"
  >
    <ShieldCheck aria-hidden="true" />
    <span>Privacidad</span>
  </button>
</template>

<style scoped>
.aviso-analitica {
  box-sizing: border-box;
  position: fixed;
  z-index: 1500;
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: 50%;
  display: grid;
  width: min(980px, calc(100% - 2rem));
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: .85rem 1.25rem;
  padding: 1rem 3.1rem 1rem 1.1rem;
  transform: translateX(-50%);
  color: #f7fbff;
  background: #07182d;
  border: 1px solid #178bff;
  border-radius: 16px;
  box-shadow: 0 16px 50px #00102acc;
}

.aviso-analitica--preferencias {
  padding-top: 1.2rem;
}

.aviso-analitica__cerrar {
  position: absolute;
  top: .45rem;
  right: .45rem;
  display: grid;
  width: 32px;
  min-height: 32px;
  place-items: center;
  padding: 0;
  color: inherit;
  cursor: pointer;
  border: 0;
  border-radius: 999px;
  background: transparent;
}

.aviso-analitica__cerrar svg {
  width: 17px;
  height: 17px;
}

.aviso-analitica__cerrar:focus-visible {
  outline: 3px solid #ffdc00;
  outline-offset: 2px;
}

.aviso-analitica__texto h2 {
  margin: 0 0 .3rem;
  color: inherit;
  font-size: 1rem;
}

.aviso-analitica__texto p {
  max-width: 58ch;
  margin: 0;
  color: #d7e5f5;
  font-size: .875rem;
  line-height: 1.5;
}

.aviso-analitica__texto a {
  color: #7ce6f5;
  text-decoration: underline;
}

.aviso-analitica__acciones {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: .55rem;
}

.aviso-analitica__acciones--preferencias {
  display: grid;
  grid-template-columns: 1fr;
  grid-column: 1 / -1;
}

.preferencia-privacidad {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: .7rem .8rem;
  border: 1px solid #6481a3;
  border-radius: 10px;
}

.preferencia-privacidad > span {
  display: grid;
  gap: .2rem;
}

.preferencia-privacidad strong {
  font-size: .85rem;
}

.preferencia-privacidad small {
  color: #d7e5f5;
  font-size: .75rem;
  line-height: 1.4;
}

.preferencia-privacidad input {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  accent-color: #19d6ff;
}

.aviso-analitica__acciones button {
  min-height: 42px;
  padding: .55rem .8rem;
  color: inherit;
  font: inherit;
  font-size: .85rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #6481a3;
  border-radius: 10px;
  background: transparent;
}

.aviso-analitica__acciones button:focus-visible {
  outline: 3px solid #ffdc00;
  outline-offset: 2px;
}

.aviso-analitica__acciones .aviso-analitica__primario {
  color: #04172b;
  background: #19d6ff;
  border-color: #19d6ff;
}

.aviso-analitica__acciones:not(.aviso-analitica__acciones--preferencias) button {
  white-space: nowrap;
}

.aviso-analitica__estado {
  margin: 0;
  color: #d7e5f5;
  font-size: .72rem;
  line-height: 1.35;
}

.aviso-analitica--tema-blanco {
  color: #102544;
  background: #fff;
  border-color: #176bd1;
  box-shadow: 0 16px 50px #15345b30;
}

.aviso-analitica--tema-blanco .aviso-analitica__texto p {
  color: #43556b;
}

.aviso-analitica--tema-blanco .aviso-analitica__texto a {
  color: #086ce0;
}

.aviso-analitica--tema-blanco .aviso-analitica__cerrar:hover {
  background: #e7edf5;
}

.aviso-analitica--tema-blanco .aviso-analitica__estado {
  color: #43556b;
}

.aviso-analitica--tema-blanco .preferencia-privacidad {
  border-color: #aab9cc;
}

.aviso-analitica--tema-blanco .preferencia-privacidad small {
  color: #43556b;
}

.aviso-analitica--tema-blanco .aviso-analitica__acciones button {
  color: #102544;
  border-color: #aab9cc;
}

.aviso-analitica--tema-blanco .aviso-analitica__acciones .aviso-analitica__primario {
  color: #fff;
  background: #086ce0;
  border-color: #086ce0;
}

.preferencias-privacidad-flotante {
  position: fixed;
  z-index: 1400;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: .45rem;
  padding: .45rem .7rem;
  color: #f7fbff;
  font: inherit;
  font-size: .75rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid #6481a3;
  border-radius: 999px;
  background: #07182d;
  box-shadow: 0 6px 24px #00102a66;
}

.preferencias-privacidad-flotante svg {
  width: 16px;
  height: 16px;
  color: #7ce6f5;
}

.preferencias-privacidad-flotante:focus-visible {
  outline: 3px solid #ffdc00;
  outline-offset: 3px;
}

.preferencias-privacidad-flotante--tema-blanco {
  color: #102544;
  border-color: #aab9cc;
  background: #fff;
  box-shadow: 0 6px 24px #15345b30;
}

.preferencias-privacidad-flotante--tema-blanco svg {
  color: #086ce0;
}

@media (max-width: 680px) {
  .aviso-analitica {
    width: calc(100% - 2rem);
    grid-template-columns: 1fr;
    gap: .8rem;
    padding: 1.2rem 2.7rem .95rem .95rem;
  }

  .aviso-analitica__acciones {
    display: grid;
    grid-template-columns: 1fr;
  }

}
</style>
