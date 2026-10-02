<script setup lang="ts">
const {
  decision,
  decisionPublicidad,
  mostrarAviso,
  aceptarAnalitica,
  rechazarAnalitica,
  aceptarPublicidad,
  rechazarPublicidad,
  cerrarPreferencias
} = useAnaliticaPublica()
const { modoBlancoActivo } = useTemaPublico()
</script>

<template>
  <aside
    v-if="mostrarAviso"
    class="aviso-analitica"
    :class="{ 'aviso-analitica--tema-blanco': modoBlancoActivo }"
    role="dialog"
    aria-labelledby="titulo-aviso-privacidad"
    aria-describedby="descripcion-aviso-privacidad"
  >
    <div class="aviso-analitica__texto">
      <h2 id="titulo-aviso-privacidad">Preferencias de privacidad</h2>
      <p id="descripcion-aviso-privacidad">
        La analítica de Google es independiente de los anuncios. Los espacios de Adsterra solo se cargan si los permites; la red puede recibir datos técnicos del dispositivo y usar cookies. Consulta la <NuxtLink to="/privacidad">política de privacidad</NuxtLink>.
      </p>
    </div>
    <div class="aviso-analitica__acciones">
      <button type="button" class="aviso-analitica__secundario" @click="rechazarPublicidad">
        Rechazar anuncios
      </button>
      <button type="button" class="aviso-analitica__primario" @click="aceptarPublicidad">
        Permitir anuncios de Adsterra
      </button>
      <button type="button" class="aviso-analitica__secundario" @click="rechazarAnalitica">
        Desactivar analítica
      </button>
      <button type="button" class="aviso-analitica__secundario" @click="aceptarAnalitica">
        Activar analítica
      </button>
      <p class="aviso-analitica__estado" aria-live="polite">
        Anuncios externos: {{ decisionPublicidad === 'aceptada' ? 'permitidos' : decisionPublicidad === 'rechazada' ? 'rechazados' : 'sin elegir' }}.
        Analítica: {{ decision === 'aceptada' ? 'activa' : decision === 'rechazada' ? 'desactivada' : 'sin elegir' }}.
      </p>
      <button
        v-if="decision !== null && decisionPublicidad !== null"
        type="button"
        class="aviso-analitica__cerrar"
        aria-label="Cerrar preferencias de privacidad"
        @click="cerrarPreferencias"
      >
        Cerrar
      </button>
    </div>
  </aside>
</template>

<style scoped>
.aviso-analitica {
  position: fixed;
  z-index: 1500;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: max(1rem, env(safe-area-inset-left));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  max-width: 980px;
  margin-inline: auto;
  padding: 1rem 1.1rem;
  color: #f7fbff;
  background: #07182d;
  border: 1px solid #178bff;
  border-radius: 16px;
  box-shadow: 0 16px 50px #00102acc;
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

.aviso-analitica__estado {
  margin: 0;
  color: #d7e5f5;
  font-size: .72rem;
  line-height: 1.35;
}

.aviso-analitica__acciones .aviso-analitica__cerrar {
  border-color: transparent;
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

.aviso-analitica--tema-blanco .aviso-analitica__estado {
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

@media (max-width: 680px) {
  .aviso-analitica {
    align-items: stretch;
    flex-direction: column;
    gap: .8rem;
    padding: .95rem;
  }

  .aviso-analitica__acciones {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .aviso-analitica__acciones .aviso-analitica__cerrar {
    grid-column: 1 / -1;
  }
}
</style>
