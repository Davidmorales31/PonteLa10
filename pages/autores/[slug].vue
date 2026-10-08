<script setup lang="ts">
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import type { PerfilAutorPublico } from '~/utils/perfilesAutoresPublicos'
import { robotsIndexables } from '~/utils/seo'

interface RespuestaPerfilAutor {
  perfil: PerfilAutorPublico
  articulos: ResumenArticuloPublico[]
}

const ruta = useRoute()
const slug = computed(() => String(ruta.params.slug || ''))
const { data, error } = await useFetch<RespuestaPerfilAutor>(
  () => `/api/autores/${encodeURIComponent(slug.value)}`,
  { key: `perfil-autor-${slug.value}`, default: () => null }
)

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 503,
    statusMessage: error.value.statusMessage || 'No se pudo cargar el perfil de autor.'
  })
}
if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'El perfil de autor no existe.' })
}

const perfil = computed(() => data.value?.perfil)
const articulos = computed(() => data.value?.articulos || [])
const fechaActualizacion = computed(() => perfil.value?.fechaActualizacion || '')
const configuracion = useRuntimeConfig()
const urlPerfil = computed(() => `${String(configuracion.public.siteUrl).replace(/\/+$/, '')}/autores/${slug.value}`)

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeZone: 'America/Bogota'
  }).format(new Date(`${fecha}T12:00:00-05:00`))
}

useSeoPont3la10(() => ({
  titulo: `${perfil.value?.nombre || 'Autor'} | Pont3la10`,
  descripcion: perfil.value?.biografia || 'Perfil editorial de Pont3la10.',
  rutaCanonica: `/autores/${slug.value}`,
  robots: robotsIndexables,
  datosEstructurados: perfil.value
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: `Perfil de ${perfil.value.nombre} | Pont3la10`,
        dateModified: perfil.value.fechaActualizacion,
        mainEntity: {
          '@type': perfil.value.tipo,
          '@id': `${urlPerfil.value}#autor`,
          name: perfil.value.nombre,
          url: urlPerfil.value,
          description: perfil.value.biografia,
          knowsAbout: perfil.value.especialidades
        }
      }
    : undefined
}))
</script>

<template>
  <main class="pagina-legal pagina-perfil-autor" aria-labelledby="titulo-perfil-autor">
    <MigasNavegacion :elementos="[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Noticias', ruta: '/articulos' }, { etiqueta: perfil?.nombre || 'Autor' }]" />

    <header class="cabecera-legal">
      <span class="insignia-legal">Perfil editorial</span>
      <h1 id="titulo-perfil-autor">{{ perfil?.nombre }}</h1>
      <p class="introduccion-legal">{{ perfil?.biografia }}</p>
      <p class="fecha-legal">
        Última actualización:
        <time :datetime="fechaActualizacion">{{ formatearFecha(fechaActualizacion) }}</time>
      </p>
    </header>

    <div class="contenido-legal">
      <section aria-labelledby="especialidades-autor">
        <h2 id="especialidades-autor">Cobertura editorial</h2>
        <ul class="especialidades-autor">
          <li v-for="especialidad in perfil?.especialidades || []" :key="especialidad">
            {{ especialidad }}
          </li>
        </ul>
      </section>

      <section v-if="perfil?.redesProfesionales.length" aria-labelledby="redes-autor">
        <h2 id="redes-autor">Redes profesionales</h2>
        <ul>
          <li v-for="red in perfil.redesProfesionales" :key="red.url">
            <a :href="red.url" target="_blank" rel="noopener noreferrer">{{ red.nombre }}</a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="articulos-autor">
        <h2 id="articulos-autor">Artículos recientes</h2>
        <p v-if="!articulos.length">Todavía no hay artículos recientes asociados a este perfil.</p>
        <ul v-else class="lista-articulos-autor">
          <li v-for="articulo in articulos" :key="articulo.id">
            <NuxtLink :to="`/articulos/${articulo.slug}`">{{ articulo.titulo }}</NuxtLink>
            <p>{{ articulo.resumen }}</p>
            <small>
              {{ articulo.categoria }} ·
              <time :datetime="articulo.publicadoEn">{{ formatearFecha(articulo.publicadoEn.slice(0, 10)) }}</time>
            </small>
          </li>
        </ul>
        <p><NuxtLink to="/articulos">Explorar todas las noticias</NuxtLink></p>
      </section>

      <section aria-labelledby="criterios-perfil">
        <h2 id="criterios-perfil">Información y autoría</h2>
        <p>Este perfil describe al equipo editorial, no a una persona individual. No atribuimos títulos, experiencia ni redes profesionales que no estén publicados y verificados.</p>
        <p>Conoce el <NuxtLink to="/quienes-somos">proyecto editorial</NuxtLink> y nuestra <NuxtLink to="/politica-editorial">política de revisión</NuxtLink>.</p>
      </section>
    </div>
  </main>
</template>
