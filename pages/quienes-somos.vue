<script setup lang="ts">
import { Mail, ShieldCheck } from '@lucide/vue'

const correoContacto = 'juanavimoralesparra31@gmail.com'
const fechaActualizacion = '7 de octubre de 2026'

useSeoPont3la10({
  titulo: 'Quiénes somos | Pont3la10',
  descripcion: 'Conoce el enfoque deportivo de Pont3la10, quién responde por el proyecto y cómo revisamos el contenido antes de publicarlo.',
  rutaCanonica: '/quienes-somos',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'Quiénes somos | Pont3la10',
    description: 'Información sobre el proyecto editorial Pont3la10 y su modelo de revisión.',
    inLanguage: 'es-CO',
    isPartOf: { '@id': `${String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')}/#sitio-web` }
  }
})
</script>

<template>
  <main class="pagina-legal pagina-legal-quienes-somos" aria-labelledby="titulo-legal">
    <header class="cabecera-legal">
      <span class="insignia-legal"><ShieldCheck aria-hidden="true" /> Sobre Pont3la10</span>
      <h1 id="titulo-legal">Fútbol y deporte, con contexto.</h1>
      <p class="introduccion-legal">
        Pont3la10 es un producto digital de Pont3la10 Labs para seguir la actualidad deportiva, con especial atención al fútbol colombiano y a sus protagonistas.
      </p>
      <p class="fecha-legal">Última actualización: <time datetime="2026-10-07">{{ fechaActualizacion }}</time></p>
    </header>

    <div class="contenido-legal">
      <aside class="resumen-legal">
        <strong>Qué encontrarás aquí</strong>
        <p>Noticias y análisis editoriales, información de competiciones y resultados deportivos. Las estadísticas de proveedores se identifican como datos sujetos a disponibilidad y verificación.</p>
      </aside>

      <section>
        <h2>El proyecto y su foco</h2>
        <p>Organizamos la cobertura alrededor del fútbol colombiano —incluidas sus competiciones y selecciones—, los colombianos que juegan en el exterior y otras noticias deportivas de interés. También abordamos tecnología y tendencias cuando tienen una relación clara con el deporte.</p>
        <p>Buscamos que cada página responda una pregunta concreta del aficionado: qué ocurrió, qué se sabe, de dónde viene la información y dónde ampliar el contexto.</p>
      </section>

      <section>
        <h2>Responsabilidad y contacto</h2>
        <p>La responsabilidad editorial corresponde al equipo de Pont3la10. El fundador y contacto público del proyecto es Juan David Morales Parra, en Neiva, Huila, Colombia. Puedes escribir a <a :href="`mailto:${correoContacto}`">{{ correoContacto }}</a> para consultas, correcciones o comentarios.</p>
      </section>

      <section>
        <h2>Automatización e inteligencia artificial</h2>
        <p>Las herramientas automatizadas o de inteligencia artificial pueden ayudar a descubrir temas, organizar evidencia y preparar borradores. No son una fuente por sí mismas y no sustituyen la verificación periodística.</p>
        <p>Una persona autorizada revisa y aprueba el contenido antes de su publicación. La preparación automática de un borrador no lo publica ni lo convierte en una noticia confirmada.</p>
      </section>

      <section>
        <h2>Separación entre contenido y anuncios</h2>
        <p>La publicidad no determina las conclusiones editoriales. Si publicamos una colaboración o contenido patrocinado, lo identificaremos como tal; las piezas comerciales no se presentan como cobertura independiente.</p>
      </section>

      <section>
        <h2>Más información</h2>
        <p>Consulta nuestra <NuxtLink to="/politica-editorial">política editorial</NuxtLink>, la <NuxtLink to="/correcciones">política de correcciones</NuxtLink> y la <NuxtLink to="/privacidad">política de privacidad</NuxtLink>.</p>
      </section>

      <a class="contacto-legal" :href="`mailto:${correoContacto}`">
        <Mail aria-hidden="true" /> ¿Quieres hablar con el equipo? <span>Escríbenos</span>
      </a>
    </div>
  </main>
</template>
