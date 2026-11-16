import { etiquetaEstadoSeoPartido } from './schemaPartidoSeo'

export interface TransmisionPreguntaPartido {
  channel: string
  countryCode: string
  status: string
  verifiedAt?: string | null
  sourceUrl: string
}

export interface DatosPreguntasPartido {
  local: string
  visitante: string
  fechaIso: string
  estado: string | null
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  ciudad: string | null
  competencia: string
  transmisiones?: TransmisionPreguntaPartido[]
}

export interface PreguntaPartidoSeo {
  pregunta: string
  respuesta: string
}

export function nombreCompetenciaSeo(competencia: string): string {
  if (competencia === 'torneo-betplay') return 'Torneo BetPlay'
  if (competencia === 'copa-colombia') return 'Copa Colombia'
  return 'Liga BetPlay'
}

export function fechaLargaColombia(fechaIso: string): string {
  if (!Number.isFinite(Date.parse(fechaIso))) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  }).format(new Date(fechaIso))
}

function nombrePais(codigo: string): string {
  return new Intl.DisplayNames(['es'], { type: 'region' }).of(codigo) || codigo
}

export function transmisionesConfirmadasSeo(transmisiones: TransmisionPreguntaPartido[] = []): TransmisionPreguntaPartido[] {
  return transmisiones.filter(transmision => transmision.status === 'confirmed'
    && Boolean(transmision.verifiedAt)
    && transmision.sourceUrl.startsWith('https://'))
}

/**
 * Preguntas visibles de la ficha. Cada respuesta usa solo datos ya publicados y
 * verificados; nada se infiere ni se inventa cuando el dato falta.
 */
export function construirPreguntasPartidoSeo(datos: DatosPreguntasPartido): PreguntaPartidoSeo[] {
  const partido = `${datos.local} vs ${datos.visitante}`
  const confirmadas = transmisionesConfirmadasSeo(datos.transmisiones)
  const estado = etiquetaEstadoSeoPartido(datos.estado)
  const hayMarcador = datos.golesLocal !== null && datos.golesVisitante !== null
  const marcador = `${datos.local} ${datos.golesLocal}–${datos.golesVisitante} ${datos.visitante}`
  const competencia = nombreCompetenciaSeo(datos.competencia)

  const respuestaMarcador = !hayMarcador
    ? 'El marcador oficial todavía no está publicado.'
    : estado === 'EN VIVO'
      ? `Marcador actualizado: ${marcador} en ${competencia}.`
      : estado === 'FINALIZADO'
        ? `Resultado registrado: ${marcador} en ${competencia}.`
        : `Marcador registrado: ${marcador} en ${competencia}.`

  const preguntas: PreguntaPartidoSeo[] = [
    {
      pregunta: `¿A qué hora juega ${partido}?`,
      respuesta: `El horario publicado es ${fechaLargaColombia(datos.fechaIso)}, hora de Colombia. Si la organización anuncia un cambio, esta ficha se actualizará.`
    },
    {
      pregunta: `¿Dónde ver ${partido}?`,
      respuesta: confirmadas.length
        ? `${confirmadas.map(item => `${item.channel} (${nombrePais(item.countryCode)})`).join(', ')}. Revisa la fuente enlazada junto a cada opción porque la disponibilidad puede variar según el país.`
        : 'El canal o la plataforma no está confirmado. Revisa la programación de DIMAYOR.'
    },
    {
      pregunta: `¿Cuál es el marcador de ${partido}?`,
      respuesta: respuestaMarcador
    }
  ]

  const estadio = datos.estadio?.trim()
  if (estadio) {
    const ciudad = datos.ciudad?.trim()
    preguntas.push({
      pregunta: `¿En qué estadio se juega ${partido}?`,
      respuesta: `La sede publicada en la ficha es ${estadio}${ciudad ? `, en ${ciudad}` : ''}.`
    })
  }

  return preguntas
}

export function construirFaqPartidoSeo(preguntas: PreguntaPartidoSeo[]): Record<string, unknown> | null {
  if (!preguntas.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: preguntas.map(item => ({
      '@type': 'Question',
      name: item.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: item.respuesta }
    }))
  }
}
