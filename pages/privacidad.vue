<script setup lang="ts">
import { Mail, ShieldCheck } from '@lucide/vue'

useSeoPont3la10({
  titulo: 'Política de privacidad | Pont3la10',
  descripcion: 'Conoce qué información trata Pont3la10, para qué la usa y cómo puedes ejercer tus derechos de privacidad.',
  rutaCanonica: '/privacidad',
  datosEstructurados: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Política de privacidad de Pont3la10',
    description: 'Información sobre el tratamiento de datos y privacidad en Pont3la10.',
    inLanguage: 'es-CO',
    isPartOf: { '@id': `${String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')}/#sitio-web` }
  }
})

const fechaActualizacion = '25 de septiembre de 2026'
</script>

<template>
  <main class="pagina-legal pagina-legal-privacidad" aria-labelledby="titulo-legal">
    <header class="cabecera-legal">
      <span class="insignia-legal"><ShieldCheck aria-hidden="true" /> Privacidad y datos</span>
      <h1 id="titulo-legal">Tu privacidad importa.</h1>
      <p class="introduccion-legal">Esta página explica, en lenguaje claro, qué información puede tratar Pont3la10 cuando navegas por el sitio o utilizas sus funciones.</p>
      <p class="fecha-legal">Última actualización: <time datetime="2026-09-25">{{ fechaActualizacion }}</time></p>
    </header>

    <div class="contenido-legal">
      <aside class="resumen-legal">
        <strong>En pocas palabras</strong>
        <p>Usamos la información necesaria para mantener el sitio, proteger las cuentas editoriales y recordar preferencias como el tema visual. No afirmamos usarla para perfilar lectores ni venderla.</p>
      </aside>

      <section>
        <h2>Quién está detrás del sitio</h2>
        <p>Pont3la10 es un producto de <a href="https://labs.pont3la10.com" target="_blank" rel="noreferrer noopener">Pont3la10 Labs</a>. Su fundador y responsable de contacto es Juan David Morales Parra, con domicilio de contacto en Neiva, Huila, Colombia. Para preguntas o solicitudes relacionadas con privacidad puedes escribir a <a href="mailto:juanavimoralesparra31@gmail.com">juanavimoralesparra31@gmail.com</a>.</p>
      </section>

      <section>
        <h2>Qué información puede tratarse</h2>
        <ul>
          <li><strong>Preferencias del sitio:</strong> el tema visual elegido puede guardarse localmente en tu navegador para conservar tu preferencia.</li>
          <li><strong>Cuenta editorial:</strong> si tienes acceso al panel, el proveedor de autenticación procesa los datos necesarios para iniciar sesión y administrar permisos.</li>
          <li><strong>Seguridad y funcionamiento:</strong> la infraestructura puede generar registros técnicos de solicitudes y errores para operar el servicio, prevenir abuso y diagnosticar fallos.</li>
          <li><strong>Contenido editorial:</strong> el material que el equipo incorpora a los flujos internos se procesa para preparar y publicar contenido. No incluyas datos personales de terceros que no sean necesarios.</li>
        </ul>
      </section>

      <section>
        <h2>Finalidades y proveedores</h2>
        <p>La información se utiliza para entregar las páginas y funciones solicitadas, mantener sesiones autorizadas, proteger el servicio, recordar ajustes locales y gestionar el flujo editorial. El sitio puede usar cookies técnicas o almacenamiento local para mantener una sesión y recordar preferencias; no se presentan como cookies publicitarias.</p>
        <p>En el flujo editorial interno, el equipo puede enviar transcripciones y evidencia a DeepSeek para preparar borradores. Esa función no es necesaria para leer el sitio. El equipo debe evitar incluir datos personales de terceros que no sean indispensables; el tratamiento por el proveedor también está sujeto a sus condiciones.</p>
        <p>La infraestructura de autenticación, base de datos y almacenamiento puede ser prestada por proveedores como Supabase. Los proveedores técnicos estrictamente necesarios tratan información por cuenta del servicio según la función que prestan y sus propias condiciones.</p>
        <p>El sitio puede enlazar a plataformas externas. Al abrirlas, su tratamiento de datos se rige por las políticas de cada plataforma.</p>
      </section>

      <section>
        <h2>Almacenamiento y conservación</h2>
        <p>Las preferencias locales permanecen en el navegador hasta que las borres. La información de cuentas y seguridad se conserva mientras sea necesaria para operar y proteger el acceso, o durante el tiempo exigido por obligaciones aplicables. No publicamos datos de acceso ni información interna del equipo editorial.</p>
      </section>

      <section>
        <h2>Tus derechos y cómo contactarnos</h2>
        <p>En Colombia, la Ley 1581 de 2012 reconoce derechos sobre los datos personales, entre ellos conocerlos, actualizarlos y rectificarlos, y solicitar su supresión o la revocatoria de la autorización cuando proceda. Envía tu solicitud a <a href="mailto:juanavimoralesparra31@gmail.com">juanavimoralesparra31@gmail.com</a>, indicando cómo podemos identificar el dato y atender tu petición.</p>
        <p>Si la solicitud requiere verificar identidad o no puede atenderse de inmediato, te informaremos los pasos aplicables. La supresión puede tener límites cuando exista una obligación legal o una razón legítima de seguridad.</p>
      </section>

      <section>
        <h2>Cambios a esta política</h2>
        <p>Si cambia el servicio o el tratamiento de información, actualizaremos esta página y su fecha. Te recomendamos revisarla cuando vuelvas a usar funciones que requieran una cuenta.</p>
      </section>

      <a class="contacto-legal" href="mailto:juanavimoralesparra31@gmail.com"><Mail aria-hidden="true" /> ¿Tienes una pregunta sobre privacidad? <span>Escríbenos</span></a>
    </div>
  </main>
</template>
