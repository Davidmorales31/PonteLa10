import { createError } from 'h3'

const urlApiCommons = 'https://commons.wikimedia.org/w/api.php'
const agenteCommons = 'Pont3la10/1.0 (https://pont3la10.com; contact: contact@pont3la10.com)'

interface CampoMetadatosCommons {
  value?: unknown
}

interface PaginaCommons {
  title?: unknown
  imageinfo?: Array<{ extmetadata?: Record<string, CampoMetadatosCommons> }>
}

interface RespuestaCommons {
  query?: { pages?: Record<string, PaginaCommons> }
}

function textoPlano(valor: unknown): string {
  if (typeof valor !== 'string') return ''
  return valor
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_coincidencia, decimal: string) =>
      String.fromCodePoint(Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (_coincidencia, hexadecimal: string) =>
      String.fromCodePoint(Number.parseInt(hexadecimal, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizarAtribucion(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function crearErrorAtribucion(mensaje: string, codigo: string, estado = 422) {
  return createError({ statusCode: estado, statusMessage: mensaje, data: { codigo } })
}

export async function verificarAtribucionFotoCommons(entrada: {
  urlFuente: string
  autorFoto: string
  licenciaFoto: 'CC0 1.0' | 'CC BY 4.0' | 'Dominio público'
}): Promise<string> {
  let urlFuente: URL
  try {
    urlFuente = new URL(entrada.urlFuente)
  } catch {
    throw crearErrorAtribucion(
      'La foto debe enlazar a una ficha válida de Wikimedia Commons.',
      'ATRIBUCION_FOTO_CODEX_INVALIDA'
    )
  }
  if (urlFuente.protocol !== 'https:'
    || urlFuente.hostname !== 'commons.wikimedia.org'
    || !urlFuente.pathname.startsWith('/wiki/File:')) {
    throw crearErrorAtribucion(
      'La foto debe enlazar a una ficha válida de Wikimedia Commons.',
      'ATRIBUCION_FOTO_CODEX_INVALIDA'
    )
  }

  let tituloArchivo: string
  try {
    tituloArchivo = decodeURIComponent(urlFuente.pathname.slice('/wiki/'.length))
      .replace(/_/g, ' ')
  } catch {
    throw crearErrorAtribucion(
      'La URL de la ficha de Commons no está codificada correctamente.',
      'ATRIBUCION_FOTO_CODEX_INVALIDA'
    )
  }
  const consulta = new URL(urlApiCommons)
  consulta.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'extmetadata',
    iiextmetadatafilter: 'Artist|Attribution|LicenseShortName|LicenseUrl|Copyrighted',
    titles: tituloArchivo
  }).toString()

  let respuesta: Response
  try {
    respuesta = await fetch(consulta, {
      headers: {
        accept: 'application/json',
        'user-agent': agenteCommons
      },
      signal: AbortSignal.timeout(8_000)
    })
  } catch {
    throw crearErrorAtribucion(
      'No pudimos verificar la ficha/licencia de la foto en Wikimedia Commons. Inténtalo más tarde.',
      'FUENTE_FOTO_COMMONS_NO_DISPONIBLE',
      502
    )
  }

  if (!respuesta.ok) {
    throw crearErrorAtribucion(
      'Wikimedia Commons no permitió verificar la ficha de la foto.',
      'FUENTE_FOTO_COMMONS_NO_DISPONIBLE',
      502
    )
  }

  let datos: RespuestaCommons
  try {
    datos = await respuesta.json() as RespuestaCommons
  } catch {
    throw crearErrorAtribucion(
      'Wikimedia Commons devolvió una ficha ilegible.',
      'FUENTE_FOTO_COMMONS_INVALIDA',
      502
    )
  }

  const pagina = Object.values(datos.query?.pages || {})[0]
  const metadatos = pagina?.imageinfo?.[0]?.extmetadata
  if (!pagina || pagina.title !== tituloArchivo || !metadatos) {
    throw crearErrorAtribucion(
      'La ficha no corresponde a un archivo disponible en Wikimedia Commons.',
      'FUENTE_FOTO_COMMONS_NO_ENCONTRADA'
    )
  }

  const autorVerificado = textoPlano(
    metadatos.Attribution?.value || metadatos.Artist?.value
  )
  const autorEsperado = normalizarAtribucion(entrada.autorFoto)
  const autorDisponible = normalizarAtribucion(autorVerificado)
  if (!autorEsperado || !autorDisponible || !autorDisponible.includes(autorEsperado)) {
    throw crearErrorAtribucion(
      'El crédito no coincide con el autor indicado en la ficha de Commons.',
      'AUTOR_FOTO_COMMONS_NO_COINCIDE'
    )
  }

  const nombreLicencia = textoPlano(metadatos.LicenseShortName?.value).toLocaleLowerCase('en')
  const urlLicencia = textoPlano(metadatos.LicenseUrl?.value).toLocaleLowerCase('en')
  const esCc0 = entrada.licenciaFoto === 'CC0 1.0'
    && (nombreLicencia.includes('cc0') || urlLicencia.includes('/publicdomain/zero/1.0'))
  const esCcBy = entrada.licenciaFoto === 'CC BY 4.0'
    && (nombreLicencia.includes('cc by 4.0') || urlLicencia.includes('/licenses/by/4.0'))
  const esDominioPublico = entrada.licenciaFoto === 'Dominio público'
    && textoPlano(metadatos.Copyrighted?.value).toLocaleLowerCase('en') === 'false'

  if (!esCc0 && !esCcBy && !esDominioPublico) {
    throw crearErrorAtribucion(
      'La ficha no confirma una de las licencias autorizadas para estas fotos.',
      'LICENCIA_FOTO_COMMONS_NO_PERMITIDA'
    )
  }

  return `${entrada.autorFoto} · ${entrada.licenciaFoto} · Wikimedia Commons`
}
