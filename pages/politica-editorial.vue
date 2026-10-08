<script setup lang="ts">
import { BookOpenCheck, Mail } from '@lucide/vue'

const correoContacto = 'juanavimoralesparra31@gmail.com'
const fechaActualizacion = '7 de octubre de 2026'

useSeoPont3la10({
  titulo: 'Política editorial | Pont3la10',
  descripcion: 'Cómo seleccionamos y verificamos fuentes, usamos herramientas de IA, tratamos conflictos, publicidad y datos deportivos en Pont3la10.',
  rutaCanonica: '/politica-editorial',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Política editorial de Pont3la10',
    description: 'Principios de fuentes, verificación, automatización, publicidad y datos deportivos.',
    inLanguage: 'es-CO',
    isPartOf: { '@id': `${String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')}/#sitio-web` }
  }
})
</script>

<template>
  <main class="pagina-legal pagina-legal-politica-editorial" aria-labelledby="titulo-legal">
    <header class="cabecera-legal">
      <span class="insignia-legal"><BookOpenCheck aria-hidden="true" /> Criterios editoriales</span>
      <h1 id="titulo-legal">Cómo trabajamos la información.</h1>
      <p class="introduccion-legal">Estos criterios explican cómo preparamos, verificamos y presentamos noticias, análisis y datos deportivos en Pont3la10.</p>
      <p class="fecha-legal">Última actualización: <time datetime="2026-10-07">{{ fechaActualizacion }}</time></p>
    </header>

    <div class="contenido-legal">
      <aside class="resumen-legal">
        <strong>Principio central</strong>
        <p>Una tendencia, una salida de inteligencia artificial o un dato aislado no bastan para presentar una afirmación como un hecho confirmado.</p>
      </aside>

      <section>
        <h2>Fuentes y verificación</h2>
        <p>Priorizamos documentos, comunicados y canales oficiales para calendarios, decisiones y datos de competición; para noticias buscamos la fuente original de la afirmación y corroboración adicional cuando el impacto o la incertidumbre lo requieren.</p>
        <p>Distinguimos hechos confirmados de versiones atribuidas, rumores y análisis. Cuando el artículo registra fuentes o créditos, los mostramos en la publicación. Una fuente citada respalda afirmaciones concretas, no necesariamente cada elemento de una página.</p>
      </section>

      <section>
        <h2>Automatización e inteligencia artificial</h2>
        <p>La automatización puede ayudar a detectar oportunidades, reunir referencias y preparar borradores. Sus resultados se tratan como material de trabajo: se contrastan con las fuentes disponibles y no se publican de forma autónoma.</p>
        <p>La publicación requiere revisión y aprobación humana. No atribuimos a una persona una cita, declaración o credencial que no esté respaldada por una fuente verificable.</p>
      </section>

      <section>
        <h2>Independencia y conflictos de interés</h2>
        <p>Las relaciones personales, comerciales o de acceso que puedan afectar la lectura de una pieza deben comunicarse internamente y tratarse antes de publicar. No ofrecemos cambiar conclusiones editoriales a cambio de pago, acceso o beneficios.</p>
      </section>

      <section>
        <h2>Publicidad y contenido patrocinado</h2>
        <p>Los espacios publicitarios se mantienen separados de los artículos. La compra de publicidad no concede control sobre la cobertura. Si una pieza es patrocinada o existe una colaboración comercial relacionada, se identificará de forma visible.</p>
      </section>

      <section>
        <h2>Datos deportivos</h2>
        <p>Los marcadores, alineaciones, tablas y calendarios pueden proceder de proveedores de datos o de fuentes oficiales. Su cobertura y actualización varían: no los presentamos como certificación oficial cuando la fuente no lo es y corregimos la página si una discrepancia queda confirmada.</p>
        <p>Una programación futura puede cambiar. Para decisiones que dependan del horario, estadio o transmisión, confirma el dato con el organizador o el canal oficial correspondiente.</p>
      </section>

      <section>
        <h2>Correcciones y contacto</h2>
        <p>Si encuentras un error o una atribución incompleta, envíanos el enlace y la evidencia disponible a <a :href="`mailto:${correoContacto}`">{{ correoContacto }}</a>. Explicamos el procedimiento en la <NuxtLink to="/correcciones">política de correcciones</NuxtLink>.</p>
      </section>

      <a class="contacto-legal" :href="`mailto:${correoContacto}`">
        <Mail aria-hidden="true" /> ¿Tienes una observación editorial? <span>Cuéntanos</span>
      </a>
    </div>
  </main>
</template>
