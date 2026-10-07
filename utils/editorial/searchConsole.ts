import { z } from 'zod'

export const accionesSearchConsole = [
  'actualizar',
  'mejorar_titulo',
  'ampliar_respuesta',
  'fusionar',
  'no_actuar'
] as const

export type AccionSearchConsole = typeof accionesSearchConsole[number]

export interface FilaSearchConsole {
  consulta: string
  paginaUrl: string
  clics: number
  impresiones: number
  ctr: number
  posicion: number
}

export interface TendenciaSearchConsole {
  cambioClics: number
  cambioClicsPorcentaje: number | null
  cambioImpresiones: number
  cambioImpresionesPorcentaje: number | null
  cambioPosicion: number
}

const esquemaFecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((valor) => {
  const fecha = new Date(`${valor}T00:00:00Z`)
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
}, 'Usa fechas válidas con formato AAAA-MM-DD.')

export const esquemaImportacionSearchConsole = z.object({
  fechaDesde: esquemaFecha,
  fechaHasta: esquemaFecha,
  csv: z.string().trim().min(1).max(1_500_000)
}).strict().superRefine(({ fechaDesde, fechaHasta }, contexto) => {
  const inicio = Date.parse(`${fechaDesde}T00:00:00Z`)
  const fin = Date.parse(`${fechaHasta}T00:00:00Z`)
  const dias = (fin - inicio) / 86_400_000
  if (dias < 0 || dias > 490) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fechaHasta'],
      message: 'El período debe ser válido y no puede superar 491 días.'
    })
  }
})

export const esquemaAccionSearchConsole = z.object({
  consulta: z.string().trim().min(1).max(500),
  paginaUrl: z.string().url().max(2048),
  accion: z.enum(accionesSearchConsole),
  nota: z.string().trim().max(500).nullable().optional()
}).strict().superRefine(({ accion, nota }, contexto) => {
  if (accion === 'fusionar' && !nota?.trim()) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nota'],
      message: 'Indica la URL o el contenido de destino para fusionar.'
    })
  }
})

function normalizarEncabezado(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
}

function contarDelimitadores(linea: string): Map<string, number> {
  const conteos = new Map([[';', 0], [',', 0], ['\t', 0]])
  let entreComillas = false
  for (let indice = 0; indice < linea.length; indice++) {
    const caracter = linea[indice]
    if (caracter === '"') {
      if (entreComillas && linea[indice + 1] === '"') indice++
      else entreComillas = !entreComillas
    } else if (!entreComillas && conteos.has(caracter)) {
      conteos.set(caracter, (conteos.get(caracter) || 0) + 1)
    }
  }
  return conteos
}

function detectarDelimitador(csv: string): string {
  const encabezado = csv.split(/\r?\n/, 1)[0] || ''
  const conteos = contarDelimitadores(encabezado)
  return [...conteos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ','
}

function leerFilasCsv(csv: string, delimitador: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false

  for (let indice = 0; indice < csv.length; indice++) {
    const caracter = csv[indice]
    if (caracter === '"') {
      if (entreComillas && csv[indice + 1] === '"') {
        campo += '"'
        indice++
      } else {
        entreComillas = !entreComillas
      }
    } else if (!entreComillas && caracter === delimitador) {
      fila.push(campo)
      campo = ''
    } else if (!entreComillas && (caracter === '\n' || caracter === '\r')) {
      if (caracter === '\r' && csv[indice + 1] === '\n') indice++
      fila.push(campo)
      if (fila.some(valor => valor.trim())) filas.push(fila)
      fila = []
      campo = ''
    } else {
      campo += caracter
    }
  }

  if (entreComillas) throw new Error('El CSV tiene comillas sin cerrar.')
  fila.push(campo)
  if (fila.some(valor => valor.trim())) filas.push(fila)
  return filas
}

function buscarColumna(encabezados: string[], alternativas: string[]): number {
  return encabezados.findIndex((encabezado) => alternativas.includes(encabezado))
}

function numeroCsv(valor: string, delimitador: string): number {
  let limpio = valor.trim().replace(/[%\s\u00a0]/g, '')
  if (delimitador === ',') {
    if (/^-?\d{1,3}(,\d{3})+$/.test(limpio)) limpio = limpio.replace(/,/g, '')
  } else if (/^-?\d{1,3}([. ]\d{3})+(,\d+)?$/.test(limpio)) {
    limpio = limpio.replace(/[. ]/g, '').replace(',', '.')
  } else if (/^-?\d+,\d+$/.test(limpio)) {
    limpio = limpio.replace(',', '.')
  }
  const numero = Number(limpio)
  if (!Number.isFinite(numero)) throw new Error('Hay una métrica vacía o no numérica.')
  return numero
}

function tieneCaracterControl(valor: string): boolean {
  for (const caracter of valor) {
    const codigo = caracter.charCodeAt(0)
    if (codigo < 32 || codigo === 127) return true
  }
  return false
}

function normalizarPaginaUrl(valor: string, urlSitio: string): string {
  let base: URL
  let pagina: URL
  try {
    base = new URL(urlSitio)
    pagina = new URL(valor.trim(), base)
  } catch {
    throw new Error('Hay una URL de página inválida.')
  }

  const hostBase = base.hostname.toLocaleLowerCase('en-US').replace(/^www\./, '')
  const hostPagina = pagina.hostname.toLocaleLowerCase('en-US').replace(/^www\./, '')
  if (!['http:', 'https:'].includes(pagina.protocol) || hostPagina !== hostBase) {
    throw new Error('El CSV contiene una página que no pertenece a Pont3la10.')
  }

  return `${base.origin}${pagina.pathname}`
}

export function claveFilaSearchConsole(fila: Pick<FilaSearchConsole, 'consulta' | 'paginaUrl'>): string {
  return `${fila.consulta.toLocaleLowerCase('es-CO')}\u001f${fila.paginaUrl}`
}

function porcentajeCambio(actual: number, anterior: number): number | null {
  return anterior === 0 ? null : Math.round(((actual - anterior) / anterior) * 1000) / 10
}

export function parsearCsvSearchConsole(csvEntrada: string, urlSitio: string): FilaSearchConsole[] {
  const csv = csvEntrada.replace(/^\uFEFF/, '').trim()
  const delimitador = detectarDelimitador(csv)
  const filas = leerFilasCsv(csv, delimitador)
  if (filas.length < 2) throw new Error('El archivo no contiene filas de consultas.')
  if (filas.length > 5001) throw new Error('El archivo supera el máximo de 5000 filas.')

  const encabezados = filas[0].map(normalizarEncabezado)
  const indices = {
    consulta: buscarColumna(encabezados, ['query', 'queries', 'consulta', 'consultas', 'top queries', 'search query']),
    pagina: buscarColumna(encabezados, ['page', 'pages', 'pagina', 'paginas', 'url', 'top pages']),
    clics: buscarColumna(encabezados, ['clicks', 'click', 'clics', 'clic']),
    impresiones: buscarColumna(encabezados, ['impressions', 'impression', 'impresiones', 'impresion']),
    ctr: buscarColumna(encabezados, ['ctr', 'ctr %', 'click through rate', 'tasa de clics']),
    posicion: buscarColumna(encabezados, ['position', 'average position', 'avg position', 'posicion', 'posicion promedio'])
  }

  for (const nombre of ['consulta', 'pagina', 'clics', 'impresiones', 'posicion'] as const) {
    if (indices[nombre] < 0) throw new Error(`Falta la columna obligatoria: ${nombre}.`)
  }

  const resultados: FilaSearchConsole[] = []
  const claves = new Set<string>()
  for (const [indiceFila, columnas] of filas.slice(1).entries()) {
    const numeroFila = indiceFila + 2
    try {
      if (columnas.length !== encabezados.length) {
        throw new Error('La fila no coincide con las columnas del encabezado.')
      }
      const consulta = columnas[indices.consulta]?.trim()
      const pagina = columnas[indices.pagina]?.trim()
      if (!consulta || consulta.length > 500 || tieneCaracterControl(consulta)) {
        throw new Error('La consulta debe tener entre 1 y 500 caracteres válidos.')
      }
      if (!pagina) throw new Error('Falta la URL de la página.')

      const impresiones = numeroCsv(columnas[indices.impresiones] || '', delimitador)
      const clics = numeroCsv(columnas[indices.clics] || '', delimitador)
      const posicion = numeroCsv(columnas[indices.posicion] || '', delimitador)
      const ctrTexto = indices.ctr >= 0 ? columnas[indices.ctr] || '' : ''
      const ctr = ctrTexto.trim()
        ? numeroCsv(ctrTexto, delimitador)
        : (impresiones > 0 ? (clics / impresiones) * 100 : 0)

      if (!Number.isInteger(impresiones) || impresiones < 0
        || !Number.isInteger(clics) || clics < 0 || clics > impresiones) {
        throw new Error('Los clics e impresiones deben ser enteros válidos.')
      }
      if (ctr < 0 || ctr > 100 || posicion < 0 || posicion > 100_000) {
        throw new Error('CTR o posición fuera del rango válido.')
      }

      const fila: FilaSearchConsole = {
        consulta,
        paginaUrl: normalizarPaginaUrl(pagina, urlSitio),
        clics,
        impresiones,
        ctr: Math.round(ctr * 1000) / 1000,
        posicion: Math.round(posicion * 100) / 100
      }
      const clave = claveFilaSearchConsole(fila)
      if (claves.has(clave)) throw new Error('La misma consulta y página aparecen más de una vez.')
      claves.add(clave)
      resultados.push(fila)
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : 'Fila inválida.'
      throw new Error('Fila ' + numeroFila + ': ' + mensaje, { cause: error })
    }
  }

  return resultados
}

export function calcularTendenciaSearchConsole(
  actual: Pick<FilaSearchConsole, 'clics' | 'impresiones' | 'posicion'>,
  anterior: Pick<FilaSearchConsole, 'clics' | 'impresiones' | 'posicion'> | null
): TendenciaSearchConsole | null {
  if (!anterior) return null
  const cambioClics = actual.clics - anterior.clics
  const cambioImpresiones = actual.impresiones - anterior.impresiones
  return {
    cambioClics,
    cambioClicsPorcentaje: porcentajeCambio(actual.clics, anterior.clics),
    cambioImpresiones,
    cambioImpresionesPorcentaje: porcentajeCambio(actual.impresiones, anterior.impresiones),
    cambioPosicion: Math.round((actual.posicion - anterior.posicion) * 100) / 100
  }
}
