import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const paginaCompeticion = readFileSync(resolve(process.cwd(), 'components/publico/PaginaCompeticionPublica.vue'), 'utf8')
const paginaJugador = readFileSync(resolve(process.cwd(), 'pages/jugadores/[slug].vue'), 'utf8')
const paginaResultadosEnVivo = readFileSync(resolve(process.cwd(), 'pages/resultados/en-vivo.vue'), 'utf8')
const paginaEuropa = readFileSync(resolve(process.cwd(), 'pages/colombianos-en-europa.vue'), 'utf8')
const componenteAnuncio = readFileSync(resolve(process.cwd(), 'components/publicidad/AdsterraSlot.vue'), 'utf8')
const avisoAnalitica = readFileSync(resolve(process.cwd(), 'components/publico/AvisoAnalitica.vue'), 'utf8')
const piePagina = readFileSync(resolve(process.cwd(), 'components/PiePaginaPrincipal.vue'), 'utf8')
const detallePartido = readFileSync(resolve(process.cwd(), 'pages/resultados/[id].vue'), 'utf8')

describe('HU-MON-01/02 · anuncios contextuales', () => {
  it('coloca el anuncio de competición después de resultados y solo en temporada actual', () => {
    const indiceResultados = paginaCompeticion.indexOf('<section id="resultados"')
    const indiceAnuncio = paginaCompeticion.indexOf('<PublicidadAdsterraSlot')
    const indiceJornadas = paginaCompeticion.indexOf('<section id="jornadas"')
    const bloqueAnuncio = paginaCompeticion.slice(indiceAnuncio, indiceJornadas)

    expect(indiceResultados).toBeGreaterThanOrEqual(0)
    expect(indiceAnuncio).toBeGreaterThan(indiceResultados)
    expect(indiceJornadas).toBeGreaterThan(indiceAnuncio)
    expect(bloqueAnuncio).toContain('v-if="ficha.temporada === ficha.temporadaActual"')
    expect(bloqueAnuncio).toContain('temporada actual')
  })

  it('ubica el anuncio de futbolistas después de actualidad, no antes del perfil', () => {
    const indiceNoticias = paginaJugador.indexOf('aria-labelledby="titulo-noticias-jugador"')
    const indiceAnuncio = paginaJugador.indexOf('<PublicidadAdsterraSlot')
    const indiceColumnaSecundaria = paginaJugador.indexOf('class="columna-jugador-secundaria"')

    expect(indiceNoticias).toBeGreaterThanOrEqual(0)
    expect(indiceAnuncio).toBeGreaterThan(indiceNoticias)
    expect(indiceColumnaSecundaria).toBeGreaterThan(indiceAnuncio)
    expect(paginaJugador.slice(indiceAnuncio, indiceColumnaSecundaria))
      .toContain('contexto="colombianos en Europa · ficha de futbolista"')
  })

  it('ubica el anuncio en vivo después de los marcadores y solo si hay partidos', () => {
    const indicePartidos = paginaResultadosEnVivo.indexOf('class="grilla-marcadores-resultados"')
    const indiceAnuncio = paginaResultadosEnVivo.indexOf('<PublicidadAdsterraSlot')
    const indiceEnlace = paginaResultadosEnVivo.indexOf('class="enlace-regreso-seo"')
    const bloqueAnuncio = paginaResultadosEnVivo.slice(indiceAnuncio, indiceEnlace)

    expect(indicePartidos).toBeGreaterThanOrEqual(0)
    expect(indiceAnuncio).toBeGreaterThan(indicePartidos)
    expect(indiceEnlace).toBeGreaterThan(indiceAnuncio)
    expect(bloqueAnuncio).toContain('v-if="partidosEnVivo.length"')
    expect(bloqueAnuncio).toContain('contexto="resultados en vivo"')
  })

  it('añade un segundo anuncio de Europa solo tras un archivo editorial amplio', () => {
    const indiceListado = paginaEuropa.indexOf('class="grilla-noticias-medio"')
    const indiceAnuncio = paginaEuropa.indexOf('<PublicidadAdsterraSlot', indiceListado)
    const indiceTextoSeo = paginaEuropa.indexOf('class="texto-seo-europa"')
    const bloqueAnuncio = paginaEuropa.slice(indiceAnuncio, indiceTextoSeo)

    expect(indiceListado).toBeGreaterThanOrEqual(0)
    expect(indiceAnuncio).toBeGreaterThan(indiceListado)
    expect(indiceTextoSeo).toBeGreaterThan(indiceAnuncio)
    expect(bloqueAnuncio).toContain('v-if="ultimasNoticias.length >= 6"')
    expect(bloqueAnuncio).toContain('contexto="colombianos en Europa · archivo de actualidad"')
  })

  it('mantiene el consentimiento, la reserva del marco y la carga diferida del proveedor', () => {
    expect(componenteAnuncio).toContain('if (!publicidadAutorizada.value || !visible.value) return \'\'')
    expect(componenteAnuncio).toContain('v-show="publicidadAutorizada"')
    expect(componenteAnuncio).toContain('loading="lazy"')
    expect(componenteAnuncio).toContain('aspect-ratio: 728 / 90')
    expect(componenteAnuncio).toContain('.espacio-adsterra--nativo .espacio-adsterra__marco {\n  height: 280px;')
  })

  it('espera al montaje antes de mostrar el consentimiento almacenado en el navegador', () => {
    expect(avisoAnalitica).toContain('const interfazLista = ref(false)')
    expect(avisoAnalitica).toContain('onMounted(() => {\n  inicializarConsentimiento()')
    expect(avisoAnalitica).toContain('v-if="interfazLista && mostrarAviso"')
  })

  it('evita que el control flotante de privacidad tape contenido móvil y conserva acceso en el pie', () => {
    expect(avisoAnalitica).toContain('@media (max-width: 680px) {\n  /* En móvil el pie conserva el acceso sin cubrir texto ni controles. */\n  .preferencias-privacidad-flotante {\n    display: none;')
    expect(piePagina).toContain('class="enlace-preferencias-analitica"')
  })

  it('reserva el leaderboard móvil antes del iframe y escala sin recortar el ancho', () => {
    expect(componenteAnuncio).toContain('escala.value = Math.min(1, anchoDisponible / 728)')
    expect(componenteAnuncio).not.toContain('Math.max(0.42')
    expect(componenteAnuncio).not.toContain('height: `${altoMarco}px`')
  })

  it('muestra primero el dato principal del partido y después la publicidad', () => {
    const indiceDatoPrincipal = detallePartido.indexOf('<PartidoDestacadoResultados')
    const indiceAnuncio = detallePartido.indexOf('<PublicidadAdsterraSlot')
    const indicePestanas = detallePartido.indexOf('class="pestanas-detalle-partido"')

    expect(indiceDatoPrincipal).toBeGreaterThanOrEqual(0)
    expect(indiceAnuncio).toBeGreaterThan(indiceDatoPrincipal)
    expect(indicePestanas).toBeGreaterThan(indiceAnuncio)
    expect(detallePartido.slice(indiceDatoPrincipal, indiceAnuncio)).toContain('PartidoDestacadoResultados')
    expect(detallePartido.slice(indiceAnuncio, indicePestanas)).toContain('contexto="detalle del partido"')
  })
})
