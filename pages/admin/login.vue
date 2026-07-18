<template>
  <section class="auth-page">
    <div class="auth-panel">
      <p class="etiqueta-seccion">Acceso interno</p>
      <h1>Entrar al panel</h1>
      <p>El login se conectara con Supabase Auth cuando agreguemos las variables reales del proyecto.</p>
      <form class="auth-form">
        <label>
          Correo
          <input type="email" placeholder="editor@pont3la10.com" autocomplete="email">
        </label>
        <label>
          Contrasena
          <input type="password" placeholder="Tu clave segura" autocomplete="current-password">
        </label>
        <button class="boton-primario" type="button">Entrar</button>
      </form>
    </div>
  </section>
</template>
