<script setup lang="ts">
const {
  decision,
  mostrarAviso,
  aceptarAnalitica,
  rechazarAnalitica,
  cerrarPreferencias
} = useAnaliticaPublica()
</script>

<template>
  <aside
    v-if="mostrarAviso"
    class="aviso-analitica"
    role="dialog"
    aria-labelledby="titulo-aviso-analitica"
    aria-describedby="descripcion-aviso-analitica"
  >
    <div class="aviso-analitica__texto">
      <h2 id="titulo-aviso-analitica">Tu privacidad, tu elección</h2>
      <p id="descripcion-aviso-analitica">
        Si aceptas, Google Analytics medirá visitas y uso general del sitio. No enviamos el texto que buscas ni tu correo. Puedes cambiar esta decisión desde el pie de página.
      </p>
    </div>
    <div class="aviso-analitica__acciones">
      <button type="button" class="aviso-analitica__secundario" @click="rechazarAnalitica">
        Solo necesarias
      </button>
      <button type="button" class="aviso-analitica__primario" @click="aceptarAnalitica">
        Aceptar analítica
      </button>
      <button
        v-if="decision !== null"
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
  font-size: 1rem;
}

.aviso-analitica__texto p {
  max-width: 58ch;
  margin: 0;
  color: #d7e5f5;
  font-size: .875rem;
  line-height: 1.5;
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

.aviso-analitica__acciones .aviso-analitica__cerrar {
  border-color: transparent;
}

:global(body.tema-publico-blanco) .aviso-analitica {
  color: #102544;
  background: #fff;
  border-color: #176bd1;
  box-shadow: 0 16px 50px #15345b30;
}

:global(body.tema-publico-blanco) .aviso-analitica__texto p {
  color: #43556b;
}

:global(body.tema-publico-blanco) .aviso-analitica__acciones button {
  color: #102544;
  border-color: #aab9cc;
}

:global(body.tema-publico-blanco) .aviso-analitica__acciones .aviso-analitica__primario {
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
