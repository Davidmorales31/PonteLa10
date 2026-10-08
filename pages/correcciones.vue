<script setup lang="ts">
import { Mail, ShieldCheck } from '@lucide/vue'

const correoContacto = 'juanavimoralesparra31@gmail.com'
const fechaActualizacion = '7 de octubre de 2026'

useSeoPont3la10({
  titulo: 'Correcciones y actualizaciones | Pont3la10',
  descripcion: 'Cómo reportar un error en Pont3la10, qué revisamos y cómo hacemos visibles las correcciones sustanciales.',
  rutaCanonica: '/correcciones',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Correcciones y actualizaciones | Pont3la10',
    description: 'Canal y proceso para reportar errores y solicitar la revisión de una publicación.',
    inLanguage: 'es-CO',
    isPartOf: { '@id': `${String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')}/#sitio-web` }
  }
})
</script>

<template>
  <main class="pagina-legal pagina-legal-correcciones" aria-labelledby="titulo-legal">
    <header class="cabecera-legal">
      <span class="insignia-legal"><ShieldCheck aria-hidden="true" /> Precisión y transparencia</span>
      <h1 id="titulo-legal">Si nos equivocamos, lo corregimos.</h1>
      <p class="introduccion-legal">Las noticias pueden cambiar cuando aparecen datos nuevos. Aquí te contamos cómo reportar un problema y cómo hacemos visibles las correcciones importantes.</p>
      <p class="fecha-legal">Última actualización: <time datetime="2026-10-07">{{ fechaActualizacion }}</time></p>
    </header>

    <div class="contenido-legal">
      <aside class="resumen-legal">
        <strong>Canal de correcciones</strong>
        <p>Escribe a <a :href="`mailto:${correoContacto}`">{{ correoContacto }}</a> e incluye la URL exacta del artículo, el fragmento que reportas y, si es posible, una fuente que permita comprobarlo.</p>
      </aside>

      <section>
        <h2>Qué revisamos</h2>
        <p>Revisamos errores de nombres, fechas, marcadores, atribuciones, citas y contexto, además de enlaces o material gráfico que requieran corrección. También evaluamos solicitudes de actualización cuando existe información nueva y verificable.</p>
      </section>

      <section>
        <h2>Cómo atendemos un reporte</h2>
        <ol>
          <li>Confirmamos cuál es la página y la afirmación señalada.</li>
          <li>Contrastamos el reporte con la evidencia disponible y, cuando corresponde, con la fuente primaria u oficial.</li>
          <li>Si el reporte procede, corregimos o aclaramos la publicación y conservamos una nota visible cuando el cambio afecta un dato o contexto relevante.</li>
          <li>Si no podemos confirmar el cambio, mantenemos la información atribuida con cautela o explicamos por qué no se modifica.</li>
        </ol>
        <p>El envío de un reporte no garantiza que sea aceptado ni que una publicación se retire; cada caso se evalúa con la evidencia y el contexto disponibles.</p>
      </section>

      <section>
        <h2>Tipos de cambio</h2>
        <ul>
          <li><strong>Ajuste de forma:</strong> ortografía, formato o un enlace que no cambian el sentido. Puede corregirse directamente.</li>
          <li><strong>Corrección factual:</strong> modifica un nombre, fecha, marcador, cita o atribución. Se verifica y se explica en una nota del artículo cuando el dato es relevante.</li>
          <li><strong>Actualización o aclaración sustancial:</strong> cambia el contexto, la interpretación central o información importante conocida después de publicar. Se identifica en la página junto con su fecha de actualización.</li>
        </ul>
      </section>

      <section>
        <h2>Contacto y privacidad</h2>
        <p>Envía solo la información necesaria para entender el reporte. Si tu solicitud incluye datos personales, no los publicaremos en la nota de corrección. Para asuntos de tratamiento de datos, consulta la <NuxtLink to="/privacidad">política de privacidad</NuxtLink>.</p>
        <p>Conoce también nuestra <NuxtLink to="/politica-editorial">política editorial</NuxtLink>.</p>
      </section>

      <a class="contacto-legal" :href="`mailto:${correoContacto}`">
        <Mail aria-hidden="true" /> Reportar un posible error <span>Escribir al equipo</span>
      </a>
    </div>
  </main>
</template>
