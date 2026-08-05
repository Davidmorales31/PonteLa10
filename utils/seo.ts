export const robotsIndexables = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
export const robotsNoIndex = 'noindex, follow, max-image-preview:large'
export const imagenSeoPredeterminada = '/editorial/login_pont3la10_estadio_sin_logo.png'
export const limiteTituloMeta = 70
export const limiteDescripcionMeta = 170

export type EstadoComprobacionTarjeta = 'correcto' | 'advertencia' | 'error'

export interface ComprobacionTarjetaSocial {
  id: 'titulo' | 'descripcion' | 'imagen' | 'proporcion' | 'alternativo'
  estado: EstadoComprobacionTarjeta
  mensaje: string
}

interface DatosEvaluacionTarjetaSocial {
  titulo: string
  descripcion: string
  tieneImagen: boolean
  textoAlternativo?: string
  anchoImagen?: number | null
  altoImagen?: number | null
}

export function normalizarUrlSitio(url: string): string {
  return url.replace(/\/+$/, '')
}

export function construirUrlAbsoluta(urlSitio: string, ruta: string): string {
  if (/^https?:\/\//i.test(ruta)) return ruta
  const rutaNormalizada = ruta.startsWith('/') ? ruta : `/${ruta}`
  return `${normalizarUrlSitio(urlSitio)}${rutaNormalizada}`
}

export function normalizarTextoMeta(valor: string, limite: number): string {
  const texto = valor.replace(/\s+/g, ' ').trim()
  if (texto.length <= limite) return texto

  const recorte = texto.slice(0, Math.max(1, limite - 1)).trimEnd()
  const ultimoEspacio = recorte.lastIndexOf(' ')
  const textoSeguro = ultimoEspacio >= Math.floor(limite * 0.7)
    ? recorte.slice(0, ultimoEspacio)
    : recorte

  return `${textoSeguro}…`
}

export function construirTituloMetaConMarca(
  titulo: string,
  marca = 'Pont3la10'
): string {
  const tituloLimpio = titulo.replace(/\s+/g, ' ').trim()
  const sufijo = ` | ${marca}`

  if (tituloLimpio.toLocaleLowerCase('es').includes(marca.toLocaleLowerCase('es'))) {
    return normalizarTextoMeta(tituloLimpio, limiteTituloMeta)
  }

  return `${normalizarTextoMeta(
    tituloLimpio,
    limiteTituloMeta - sufijo.length
  )}${sufijo}`
}

export function inferirTipoMimeImagen(url: string): string | undefined {
  const ruta = url.split(/[?#]/, 1)[0]?.toLowerCase() || ''
  if (ruta.endsWith('.png')) return 'image/png'
  if (ruta.endsWith('.webp')) return 'image/webp'
  if (ruta.endsWith('.jpg') || ruta.endsWith('.jpeg')) return 'image/jpeg'
  if (ruta.endsWith('.gif')) return 'image/gif'
  return undefined
}

export function evaluarTarjetaSocial(
  datos: DatosEvaluacionTarjetaSocial
): ComprobacionTarjetaSocial[] {
  const titulo = datos.titulo.replace(/\s+/g, ' ').trim()
  const descripcion = datos.descripcion.replace(/\s+/g, ' ').trim()
  const ancho = datos.anchoImagen || 0
  const alto = datos.altoImagen || 0
  const proporcion = ancho > 0 && alto > 0 ? ancho / alto : 0

  return [
    {
      id: 'titulo',
      estado: titulo.length >= 30 && titulo.length <= limiteTituloMeta
        ? 'correcto'
        : 'advertencia',
      mensaje: titulo.length > limiteTituloMeta
        ? `Reduce el título a ${limiteTituloMeta} caracteres.`
        : titulo.length < 30
          ? 'Un título más descriptivo mejora la tarjeta.'
          : 'Título preparado para redes.'
    },
    {
      id: 'descripcion',
      estado: descripcion.length >= 70 && descripcion.length <= limiteDescripcionMeta
        ? 'correcto'
        : 'advertencia',
      mensaje: descripcion.length > limiteDescripcionMeta
        ? `Reduce la descripción a ${limiteDescripcionMeta} caracteres.`
        : descripcion.length < 70
          ? 'Amplía la descripción para dar más contexto.'
          : 'Descripción preparada para redes.'
    },
    {
      id: 'imagen',
      estado: !datos.tieneImagen
        ? 'error'
        : ancho >= 1200 && alto >= 630
          ? 'correcto'
          : 'advertencia',
      mensaje: datos.tieneImagen
        ? ancho >= 1200 && alto >= 630
          ? 'La portada tiene resolución amplia.'
          : 'Se recomienda una portada de al menos 1200 × 630 px.'
        : 'Selecciona una portada antes de publicar.'
    },
    {
      id: 'proporcion',
      estado: datos.tieneImagen && proporcion >= 1.75 && proporcion <= 2.05
        ? 'correcto'
        : 'advertencia',
      mensaje: datos.tieneImagen && proporcion >= 1.75 && proporcion <= 2.05
        ? 'La proporción funciona bien en tarjetas horizontales.'
        : 'Una proporción cercana a 1.91:1 evita recortes importantes.'
    },
    {
      id: 'alternativo',
      estado: datos.textoAlternativo?.trim() ? 'correcto' : 'advertencia',
      mensaje: datos.textoAlternativo?.trim()
        ? 'La imagen tiene una descripción accesible.'
        : 'Completa el texto alternativo de la portada.'
    }
  ]
}

export function serializarJsonLd(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, '\\u003c')
}

export function escaparXml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}
