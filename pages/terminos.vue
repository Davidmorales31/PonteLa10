<script setup lang="ts">
import { BookOpenCheck, Mail } from '@lucide/vue'

useSeoPont3la10({
  titulo: 'Términos y condiciones | Pont3la10',
  descripcion: 'Consulta las condiciones de acceso, uso de contenidos, enlaces externos y contacto del sitio Pont3la10.',
  rutaCanonica: '/terminos',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Términos y condiciones de Pont3la10',
    description: 'Condiciones de uso del sitio web Pont3la10.',
    inLanguage: 'es-CO',
    isPartOf: { '@id': `${String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')}/#sitio-web` }
  }
})

const fechaActualizacion = '25 de septiembre de 2026'
</script>

<template>
  <main class="pagina-legal pagina-legal-terminos" aria-labelledby="titulo-legal">
    <header class="cabecera-legal">
      <span class="insignia-legal"><BookOpenCheck aria-hidden="true" /> Uso del sitio</span>
      <h1>Reglas claras para jugar limpio.</h1>
      <p class="introduccion-legal">Estos términos explican las condiciones básicas para navegar y utilizar Pont3la10, sus noticias y las funciones disponibles.</p>
      <p class="fecha-legal">Última actualización: <time datetime="2026-09-25">{{ fechaActualizacion }}</time></p>
    </header>

    <div class="contenido-legal">
      <aside class="resumen-legal">
        <strong>Al usar Pont3la10</strong>
        <p>Te comprometes a utilizar el sitio de forma lícita, respetar los derechos de terceros y no interferir con su seguridad o disponibilidad.</p>
      </aside>

      <section>
        <h2>1. Sobre Pont3la10</h2>
        <p>Pont3la10 es un producto de <a href="https://labs.pont3la10.com" target="_blank" rel="noreferrer noopener">Pont3la10 Labs</a>. Publicamos noticias, análisis y otros contenidos sobre deporte, tecnología y temas relacionados.</p>
      </section>

      <section>
        <h2>2. Uso permitido</h2>
        <p>Puedes consultar y compartir enlaces al contenido para fines personales e informativos. No debes intentar acceder a áreas restringidas, afectar el servicio, automatizar consultas de forma abusiva, suplantar a otras personas ni usar el sitio para vulnerar la ley o derechos ajenos.</p>
        <p>El acceso editorial está reservado a personas autorizadas. Cada titular es responsable de mantener protegidas sus credenciales y de usar únicamente los permisos que le fueron asignados.</p>
      </section>

      <section>
        <h2>3. Noticias, fuentes y enlaces</h2>
        <p>El contenido se ofrece con fines informativos y editoriales. Aunque trabajamos para mantenerlo claro y actualizado, una publicación puede corregirse o cambiar cuando aparezcan nuevos datos. Para decisiones que requieran información oficial, verifica directamente con la entidad o fuente competente.</p>
        <p>Los enlaces a sitios de terceros se ofrecen como referencia. Pont3la10 no controla su disponibilidad, contenido ni políticas; al visitarlos aplican las condiciones de esos sitios.</p>
      </section>

      <section>
        <h2>4. Propiedad intelectual</h2>
        <p>Los elementos propios del sitio —como su marca, diseño y textos editoriales— pertenecen a sus respectivos titulares o se utilizan con autorización. Las marcas, fotografías y materiales de terceros conservan los derechos de sus propietarios y se identifican con créditos cuando corresponde.</p>
        <p>No reutilices contenido protegido como si fuera propio ni elimines atribuciones. Para solicitar una corrección o reportar material, contáctanos con el enlace y los detalles pertinentes.</p>
      </section>

      <section>
        <h2>5. Disponibilidad y cambios</h2>
        <p>Podemos actualizar, mantener o retirar funciones y contenidos para mejorar el sitio, atender seguridad o corregir errores. Procuraremos que los cambios relevantes se reflejen en esta página; la versión vigente es la publicada aquí.</p>
      </section>

      <section>
        <h2>6. Contacto</h2>
        <p>Pont3la10 es un producto de <a href="https://labs.pont3la10.com" target="_blank" rel="noreferrer noopener">Pont3la10 Labs</a>, fundado por Juan David Morales Parra en Neiva, Huila, Colombia. Si encuentras un error, un enlace que no funciona o contenido que deba revisarse, escríbenos a <a href="mailto:juanavimoralesparra31@gmail.com">juanavimoralesparra31@gmail.com</a> e incluye la dirección de la página.</p>
      </section>

      <a class="contacto-legal" href="mailto:juanavimoralesparra31@gmail.com"><Mail aria-hidden="true" /> ¿Necesitas reportar algo? <span>Contacta al equipo</span></a>
    </div>
  </main>
</template>
