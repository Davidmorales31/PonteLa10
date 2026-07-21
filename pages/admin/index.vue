<script setup lang="ts">
definePageMeta({
  middleware: 'autenticacion-editorial'
})

const { usuarioActual, cerrarSesion } = useAutenticacionEditorial()

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
  </section>
</template>
