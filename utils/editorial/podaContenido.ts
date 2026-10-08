import { z } from 'zod'

export const decisionPodaContenido = z.enum([
  'actualizar',
  'fusionar',
  'mantener',
  'noindex',
  'retirar_410',
  'redirect'
])

export type DecisionPodaContenido = z.infer<typeof decisionPodaContenido>

export const esquemaDecisionPodaContenido = z.object({
  articleId: z.string().uuid(),
  decision: decisionPodaContenido,
  nota: z.string().trim().max(500).optional().default(''),
  destinoInterno: z.string().trim().max(240).optional().default('')
}).strict().superRefine(({ decision, nota, destinoInterno }, contexto) => {
  const requiereJustificacion = ['fusionar', 'noindex', 'retirar_410', 'redirect'].includes(decision)
  if (requiereJustificacion && nota.length < 12) {
    contexto.addIssue({
      code: 'custom',
      path: ['nota'],
      message: 'Escribe una justificación de al menos 12 caracteres para esta propuesta.'
    })
  }

  if (decision === 'redirect' && !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/?$/.test(destinoInterno)) {
    contexto.addIssue({
      code: 'custom',
      path: ['destinoInterno'],
      message: 'Indica una ruta interna válida, sin dominio, consulta ni fragmento.'
    })
  }

  if (decision !== 'redirect' && destinoInterno) {
    contexto.addIssue({
      code: 'custom',
      path: ['destinoInterno'],
      message: 'El destino solo se admite al proponer una redirección.'
    })
  }
})

export interface ArticuloPodaContenido {
  id: string
  slug: string
  titulo: string
  tituloSeo: string | null
  descripcionSeo: string | null
  publicadoEn: string | null
  ultimaVersionPublicadaEn: string | null
  publishedVersionId: string
}

export interface EvidenciaCeroImpresionesPoda {
  informes: number
  diasCubiertos: number
}

export interface RevisionPodaContenido {
  articleId: string
  decision: DecisionPodaContenido
  nota: string
  destinoInterno: string | null
  actualizadoEn: string
}

export interface SenalPodaContenido {
  tipo: 'sin_enlaces' | 'posible_duplicado' | 'impresiones_cero' | 'antiguedad' | 'seo_incompleto'
  detalle: string
}

export interface CandidatoPodaContenido {
  articleId: string
  slug: string
  titulo: string
  ruta: string
  publicadoEn: string | null
  ultimaVersionPublicadaEn: string | null
  diasSinActualizacionPublicada: number | null
  enlacesEntrantes: number
  senales: SenalPodaContenido[]
  articuloSimilar: { slug: string, titulo: string, similitud: number } | null
  decision: RevisionPodaContenido | null
  puntuacion: number
}

export interface ResultadoPodaContenido {
  candidatos: CandidatoPodaContenido[]
  totalCandidatos: number
  candidatosLimitados: boolean
  totalArticulosAnalizados: number
  coberturaCompleta: boolean
  limiteArticulos: number
  generadoEn: string
  searchConsole: {
    estado: 'evidencia_disponible' | 'sin_informes' | 'sin_evidencia_cero' | 'no_disponible'
    informesAnalizados: number
    filasCeroCubrenPeriodo: boolean
  }
}

const diasMilisegundos = 86_400_000
const stopwords = new Set([
  'a', 'al', 'algunos', 'con', 'contra', 'de', 'del', 'desde', 'el', 'en', 'entre',
  'esta', 'este', 'la', 'las', 'lo', 'los', 'mas', 'para', 'por', 'que', 'se', 'su',
  'sus', 'un', 'una', 'uno', 'y'
])

function normalizarTitulo(valor: string): string[] {
  return [...new Set(valor.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(token => token.length > 2 && !stopwords.has(token)))]
}

function medirSimilitud(a: string, b: string): { valor: number, compartidas: number } {
  const tokensA = new Set(normalizarTitulo(a))
  const tokensB = new Set(normalizarTitulo(b))
  if (!tokensA.size || !tokensB.size) return { valor: 0, compartidas: 0 }
  const compartidas = [...tokensA].filter(token => tokensB.has(token)).length
  return {
    valor: compartidas / (tokensA.size + tokensB.size - compartidas),
    compartidas
  }
}

function medirSimilitudTitulos(
  articuloA: ArticuloPodaContenido,
  articuloB: ArticuloPodaContenido
): { valor: number, compartidas: number } {
  const titulosA = [...new Set([articuloA.titulo, articuloA.tituloSeo || ''].filter(Boolean))]
  const titulosB = [...new Set([articuloB.titulo, articuloB.tituloSeo || ''].filter(Boolean))]
  return titulosA.flatMap(tituloA => titulosB.map(tituloB => medirSimilitud(tituloA, tituloB)))
    .sort((a, b) => b.valor - a.valor || b.compartidas - a.compartidas)[0]
    || { valor: 0, compartidas: 0 }
}

function diasEntre(ahora: Date, fechaIso: string | null): number | null {
  if (!fechaIso) return null
  const tiempo = Date.parse(fechaIso)
  if (!Number.isFinite(tiempo)) return null
  return Math.max(0, Math.floor((ahora.getTime() - tiempo) / diasMilisegundos))
}

export function detectarCandidatosPodaContenido(
  articulos: ArticuloPodaContenido[],
  enlacesEntrantes: ReadonlyMap<string, number>,
  cerosProlongados: ReadonlyMap<string, EvidenciaCeroImpresionesPoda>,
  decisiones: ReadonlyMap<string, RevisionPodaContenido>,
  ahora = new Date(),
  limite = 200
): CandidatoPodaContenido[] {
  const similares = new Map<string, { slug: string, titulo: string, similitud: number }>()
  for (let indiceA = 0; indiceA < articulos.length; indiceA++) {
    const articuloA = articulos[indiceA]
    for (let indiceB = indiceA + 1; indiceB < articulos.length; indiceB++) {
      const articuloB = articulos[indiceB]
      const similitud = medirSimilitudTitulos(articuloA, articuloB)
      if (similitud.valor < 0.84 || similitud.compartidas < 4) continue
      for (const [articulo, similar] of [[articuloA, articuloB], [articuloB, articuloA]] as const) {
        const actual = similares.get(articulo.id)
        if (!actual || similitud.valor > actual.similitud) {
          similares.set(articulo.id, {
            slug: similar.slug,
            titulo: similar.titulo,
            similitud: Math.round(similitud.valor * 100)
          })
        }
      }
    }
  }

  return articulos.flatMap((articulo) => {
    const enlaces = enlacesEntrantes.get(articulo.id) || 0
    const fechaActualizacion = articulo.ultimaVersionPublicadaEn || articulo.publicadoEn
    const diasSinActualizacion = diasEntre(ahora, fechaActualizacion)
    const senales: SenalPodaContenido[] = []
    let puntuacion = 0

    if (enlaces === 0) {
      senales.push({ tipo: 'sin_enlaces', detalle: 'No recibe enlaces contextuales desde otros artículos publicados.' })
      puntuacion += 4
    }
    const similar = similares.get(articulo.id) || null
    if (similar) {
      senales.push({ tipo: 'posible_duplicado', detalle: `Título muy parecido a “${similar.titulo}” (${similar.similitud} % de coincidencia de términos); compara el contenido completo.` })
      puntuacion += 5
    }
    const evidenciaCero = cerosProlongados.get(articulo.id)
    if (evidenciaCero) {
      senales.push({ tipo: 'impresiones_cero', detalle: `Search Console muestra cero impresiones explícitas en ${evidenciaCero.informes} informes que cubren ${evidenciaCero.diasCubiertos} días.` })
      puntuacion += 4
    }
    if (diasSinActualizacion !== null && diasSinActualizacion >= 365) {
      senales.push({ tipo: 'antiguedad', detalle: `La versión pública no se actualiza hace ${diasSinActualizacion} días; la antigüedad no demuestra por sí sola que esté obsoleta.` })
      puntuacion += 1
    }
    const faltanMetadatos = !articulo.tituloSeo?.trim() || !articulo.descripcionSeo?.trim()
    if (faltanMetadatos) {
      senales.push({ tipo: 'seo_incompleto', detalle: 'Falta título SEO o descripción SEO en el registro editorial.' })
      puntuacion += 1
    }

    // Antigüedad o metadatos incompletos por separado no bastan para mandar contenido a la cola.
    const esCandidato = enlaces === 0 || Boolean(similar) || Boolean(evidenciaCero)
      || (diasSinActualizacion !== null && diasSinActualizacion >= 365 && faltanMetadatos)
    if (!esCandidato) return []

    return [{
      articleId: articulo.id,
      slug: articulo.slug,
      titulo: articulo.titulo,
      ruta: `/articulos/${articulo.slug}`,
      publicadoEn: articulo.publicadoEn,
      ultimaVersionPublicadaEn: articulo.ultimaVersionPublicadaEn,
      diasSinActualizacionPublicada: diasSinActualizacion,
      enlacesEntrantes: enlaces,
      senales,
      articuloSimilar: similar,
      decision: decisiones.get(articulo.id) || null,
      puntuacion
    }]
    })
    .sort((a, b) => b.puntuacion - a.puntuacion
      || (b.diasSinActualizacionPublicada || 0) - (a.diasSinActualizacionPublicada || 0)
      || a.titulo.localeCompare(b.titulo, 'es-CO'))
    .slice(0, Math.max(0, Math.min(1000, limite)))
}

export function detectarImpresionesCeroProlongadas(
  filas: Array<{ page_url: string, report_id: string }>,
  informes: Array<{ id: string, period_start: string, period_end: string }>,
  slugPorUrl: ReadonlyMap<string, string>,
  diasMinimos = 90
): Map<string, EvidenciaCeroImpresionesPoda> {
  const periodoPorId = new Map(informes.map(informe => [informe.id, informe]))
  const periodosPorSlug = new Map<string, Map<string, { desde: number, hasta: number }>>()

  for (const fila of filas) {
    const slug = slugPorUrl.get(fila.page_url)
    const informe = periodoPorId.get(fila.report_id)
    if (!slug || !informe) continue
    const desde = Date.parse(`${informe.period_start}T00:00:00Z`)
    const hasta = Date.parse(`${informe.period_end}T23:59:59Z`)
    if (!Number.isFinite(desde) || !Number.isFinite(hasta) || desde > hasta) continue
    const periodos = periodosPorSlug.get(slug) || new Map<string, { desde: number, hasta: number }>()
    periodos.set(fila.report_id, { desde, hasta })
    periodosPorSlug.set(slug, periodos)
  }

  const evidencia = new Map<string, EvidenciaCeroImpresionesPoda>()
  for (const [slug, periodosMapa] of periodosPorSlug) {
    const periodos = [...periodosMapa.values()].sort((a, b) => a.desde - b.desde)
    let cobertura = 0
    let finCobertura = 0
    let informesConectados = 0
    let maxDiasCubiertos = 0
    let maxInformesConectados = 0
    for (const periodo of periodos) {
      if (!informesConectados) {
        finCobertura = periodo.hasta
        cobertura = periodo.hasta - periodo.desde
        informesConectados = 1
        continue
      }
      if (periodo.desde - finCobertura > 7 * diasMilisegundos) {
        const diasBloque = Math.floor(cobertura / diasMilisegundos)
        if (diasBloque > maxDiasCubiertos) {
          maxDiasCubiertos = diasBloque
          maxInformesConectados = informesConectados
        }
        finCobertura = periodo.hasta
        cobertura = periodo.hasta - periodo.desde
        informesConectados = 1
        continue
      }
      if (periodo.hasta > finCobertura) cobertura += periodo.hasta - Math.max(finCobertura, periodo.desde)
      finCobertura = Math.max(finCobertura, periodo.hasta)
      informesConectados++
    }
    const diasUltimoBloque = Math.floor(cobertura / diasMilisegundos)
    if (diasUltimoBloque > maxDiasCubiertos) {
      maxDiasCubiertos = diasUltimoBloque
      maxInformesConectados = informesConectados
    }
    if (maxInformesConectados >= 2 && maxDiasCubiertos >= diasMinimos) {
      evidencia.set(slug, { informes: maxInformesConectados, diasCubiertos: maxDiasCubiertos })
    }
  }
  return evidencia
}
