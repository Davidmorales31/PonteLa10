import type {
  IncidenciaSearchConsoleCsv,
  MetricaSearchConsoleCsv,
  ResultadoSearchConsoleCsv
} from '~/types/searchConsole'

export const MAX_BYTES_CSV_SEARCH_CONSOLE = 5 * 1024 * 1024
export const MAX_FILAS_CSV_SEARCH_CONSOLE = 10_000

type CampoCsv = 'fecha' | 'consulta' | 'pagina' | 'clics' | 'impresiones' | 'ctr' | 'posicion'

const aliasCampos: Record<CampoCsv, string[]> = {
  fecha: ['date', 'fecha'],
  consulta: ['query', 'queries', 'consulta', 'consultas', 'topquery', 'topqueries'],
  pagina: ['page', 'pages', 'pagina', 'paginas', 'toppage', 'toppages'],
  clics: ['clicks', 'clic', 'clics'],
  impresiones: ['impressions', 'impresion', 'impresiones'],
  ctr: ['ctr', 'clickthroughrate', 'tasadeclics'],
  posicion: ['position', 'posicion', 'posicionmedia']
}

function normalizarEtiqueta(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO').replace(/[^a-z0-9]/g, '')
}

function detectarDelimitador(texto: string): string {
  let entreComillas = false
  const cantidades = new Map([[',', 0], [';', 0], ['\t', 0]])

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caracter = texto[indice]
    if (caracter === '"') {
      if (entreComillas && texto[indice + 1] === '"') indice += 1
      else entreComillas = !entreComillas
      continue
    }
    if (!entreComillas && (caracter === '\n' || caracter === '\r')) break
    if (!entreComillas && cantidades.has(caracter)) {
      cantidades.set(caracter, (cantidades.get(caracter) || 0) + 1)
    }
  }

  return [...cantidades.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ','
}

function leerFilasCsv(texto: string, delimitador: string): string[][] | null {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false
  let comillasCerradas = false

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caracter = texto[indice]

    if (entreComillas) {
      if (caracter === '"' && texto[indice + 1] === '"') {
        campo += '"'
        indice += 1
      } else if (caracter === '"') {
        entreComillas = false
        comillasCerradas = true
      } else {
        campo += caracter
      }
      continue
    }

    if (comillasCerradas && caracter !== delimitador && caracter !== '\n' && caracter !== '\r' && !/\s/.test(caracter)) {
      return null
    }
    if (caracter === delimitador) {
      fila.push(campo.trim())
      campo = ''
      comillasCerradas = false
    } else if (caracter === '\n' || caracter === '\r') {
      fila.push(campo.trim())
      if (fila.some(valor => valor.length > 0)) filas.push(fila)
      fila = []
      campo = ''
      comillasCerradas = false
      if (caracter === '\r' && texto[indice + 1] === '\n') indice += 1
    } else if (caracter === '"') {
      if (campo.trim()) return null
      campo = ''
      entreComillas = true
      comillasCerradas = false
    } else if (!comillasCerradas) {
      campo += caracter
    }
  }

  if (entreComillas) return null
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo.trim())
    if (fila.some(valor => valor.length > 0)) filas.push(fila)
  }
  return filas
}

function resolverColumnas(encabezados: string[]): Map<CampoCsv, number> | null {
  const columnas = new Map<CampoCsv, number>()
  encabezados.forEach((encabezado, indice) => {
    const normalizado = normalizarEtiqueta(encabezado)
    const campo = (Object.keys(aliasCampos) as CampoCsv[]).find(clave =>
      aliasCampos[clave].includes(normalizado)
    )
    if (campo && !columnas.has(campo)) columnas.set(campo, indice)
  })

  return (Object.keys(aliasCampos) as CampoCsv[]).every(campo => columnas.has(campo))
    ? columnas
    : null
}

function obtenerValor(fila: string[], columnas: Map<CampoCsv, number>, campo: CampoCsv): string {
  return fila[columnas.get(campo) ?? -1]?.trim() || ''
}

function normalizarEntero(valor: string): number | null {
  const compacto = valor.replace(/[\s\u00a0]/g, '')
  if (!compacto || !/^\d+(?:[.,]\d{3})*$/.test(compacto)) return null
  const entero = Number(compacto.replace(/[.,]/g, ''))
  return Number.isSafeInteger(entero) ? entero : null
}

function normalizarDecimal(valor: string): number | null {
  let compacto = valor.trim().replace(/[%\s\u00a0]/g, '')
  if (!compacto || !/^\d+(?:[.,]\d+)*$/.test(compacto)) return null

  const ultimaComa = compacto.lastIndexOf(',')
  const ultimoPunto = compacto.lastIndexOf('.')
  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    compacto = ultimaComa > ultimoPunto
      ? compacto.replace(/\./g, '').replace(',', '.')
      : compacto.replace(/,/g, '')
  } else if (ultimaComa >= 0) {
    compacto = compacto.replace(',', '.')
  }

  const decimal = Number(compacto)
  return Number.isFinite(decimal) ? decimal : null
}

function normalizarCtr(valor: string): number | null {
  const decimal = normalizarDecimal(valor)
  if (decimal === null) return null
  const tasa = valor.includes('%') || decimal > 1 ? decimal / 100 : decimal
  return tasa >= 0 && tasa <= 1 ? tasa : null
}

function contieneDatoPersonal(consulta: string): boolean {
  if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(consulta)) return true
  if (/(?:calle|carrera|cra\.?|cl\.?|diagonal|diag\.?|transversal|tv\.?|avenida|av\.?)\s+\d+/i.test(consulta)) return true

  const sinFechas = consulta
    .replace(/\b(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, ' ')
    .replace(/\b(?:19|20)\d{2}\b/g, ' ')
  const secuenciasNumericas = sinFechas.match(/(?:^|\D)(\d[\d .()-]{4,}\d)(?=$|\D)/g) || []
  return secuenciasNumericas.some(secuencia => (secuencia.match(/\d/g) || []).length >= 6)
}

function normalizarPagina(valor: string, urlPublica: string): string | null {
  let urlBase: URL
  let pagina: URL
  try {
    urlBase = new URL(urlPublica)
    pagina = new URL(valor, urlBase.origin)
  } catch {
    return null
  }

  const dominioEsperado = urlBase.hostname.replace(/^www\./i, '').toLowerCase()
  const dominioPagina = pagina.hostname.replace(/^www\./i, '').toLowerCase()
  if (!['https:', 'http:'].includes(pagina.protocol)
    || pagina.username || pagina.password || dominioPagina !== dominioEsperado) return null

  let rutaDecodificada: string
  try {
    rutaDecodificada = decodeURIComponent(pagina.pathname)
  } catch {
    return null
  }
  if (contieneDatoPersonal(rutaDecodificada)) return null

  pagina.protocol = 'https:'
  pagina.hostname = urlBase.hostname.toLowerCase()
  pagina.port = ''
  pagina.search = ''
  pagina.hash = ''
  return pagina.href
}

function agregarIncidencia(
  incidencias: IncidenciaSearchConsoleCsv[],
  fila: number,
  campo: string,
  mensaje: string
) {
  if (incidencias.length < 25) incidencias.push({ fila, campo, mensaje })
}

export function analizarCsvSearchConsole(textoOriginal: string, urlPublica: string): ResultadoSearchConsoleCsv {
  const incidencias: IncidenciaSearchConsoleCsv[] = []
  const vacio: ResultadoSearchConsoleCsv = { filas: [], filasLeidas: 0, duplicados: 0, incidencias }
  const texto = textoOriginal.replace(/^\uFEFF/, '').trim()
  if (!texto) {
    agregarIncidencia(incidencias, 1, 'archivo', 'El archivo está vacío.')
    return vacio
  }

  if (new TextEncoder().encode(texto).byteLength > MAX_BYTES_CSV_SEARCH_CONSOLE) {
    agregarIncidencia(incidencias, 1, 'archivo', 'El archivo supera el tamaño máximo de 5 MB.')
    return vacio
  }

  const filasCsv = leerFilasCsv(texto, detectarDelimitador(texto))
  if (!filasCsv || !filasCsv.length) {
    agregarIncidencia(incidencias, 1, 'archivo', 'No se pudo interpretar el CSV. Revisa comillas y delimitadores.')
    return vacio
  }

  const columnas = resolverColumnas(filasCsv[0])
  if (!columnas) {
    agregarIncidencia(incidencias, 1, 'encabezados', 'Se requieren Fecha, Consulta, Página, Clics, Impresiones, CTR y Posición.')
    return vacio
  }

  const filasDatos = filasCsv.slice(1)
  if (filasDatos.length > MAX_FILAS_CSV_SEARCH_CONSOLE) {
    agregarIncidencia(incidencias, 1, 'archivo', 'El archivo supera el límite de 10.000 filas.')
    return { ...vacio, filasLeidas: filasDatos.length }
  }

  const filasUnicas = new Map<string, MetricaSearchConsoleCsv>()
  let duplicados = 0
  const fechaMaxima = new Date().toISOString().slice(0, 10)

  filasDatos.forEach((fila, indice) => {
    const numeroFila = indice + 2
    if (fila.length !== filasCsv[0].length) {
      agregarIncidencia(incidencias, numeroFila, 'fila', 'La cantidad de columnas no coincide con los encabezados.')
      return
    }

    const fecha = obtenerValor(fila, columnas, 'fecha')
    const consultaOriginal = obtenerValor(fila, columnas, 'consulta')
    const paginaOriginal = obtenerValor(fila, columnas, 'pagina')
    const clics = normalizarEntero(obtenerValor(fila, columnas, 'clics'))
    const impresiones = normalizarEntero(obtenerValor(fila, columnas, 'impresiones'))
    const ctr = normalizarCtr(obtenerValor(fila, columnas, 'ctr'))
    const posicion = normalizarDecimal(obtenerValor(fila, columnas, 'posicion'))
    let filaInvalida = false
    const invalidarFila = (campo: string, mensaje: string) => {
      filaInvalida = true
      agregarIncidencia(incidencias, numeroFila, campo, mensaje)
    }

    const [anio, mes, dia] = fecha.split('-').map(Number)
    const fechaUtc = new Date(`${fecha}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)
      || Number.isNaN(fechaUtc.getTime())
      || fechaUtc.getUTCFullYear() !== anio
      || fechaUtc.getUTCMonth() + 1 !== mes
      || fechaUtc.getUTCDate() !== dia
      || fecha > fechaMaxima) {
      invalidarFila('fecha', 'Usa una fecha real, no futura, en formato AAAA-MM-DD.')
    }

    const consulta = consultaOriginal.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CO')
    if (!consulta || consulta.length > 256) {
      invalidarFila('consulta', 'La consulta es obligatoria y no puede superar 256 caracteres.')
    } else if (contieneDatoPersonal(consulta)) {
      invalidarFila('consulta', 'Parece contener correo, teléfono, documento o dirección; retira esa fila por privacidad.')
    }

    const pagina = normalizarPagina(paginaOriginal, urlPublica)
    if (!pagina || pagina.length > 1200) {
      invalidarFila('página', 'Usa una URL HTTP(S) del dominio de Pont3la10 (máximo 1200 caracteres).')
    }

    if (clics === null || impresiones === null || impresiones < 1 || clics > impresiones) {
      invalidarFila('clics/impresiones', 'Usa enteros no negativos y clics no mayores que impresiones.')
    }
    if (ctr === null) {
      invalidarFila('CTR', 'El CTR debe estar entre 0 y 100%.')
    }
    if (posicion === null || posicion < 1 || posicion > 1000) {
      invalidarFila('posición', 'La posición debe ser un número entre 1 y 1000.')
    }
    if (filaInvalida) return

    const registro: MetricaSearchConsoleCsv = {
      fecha,
      consulta,
      pagina: pagina!,
      clics: clics!,
      impresiones: impresiones!,
      ctr: ctr!,
      posicion: posicion!,
      estimada: false
    }
    const clave = `${fecha}\u0000${consulta}\u0000${pagina}`
    const duplicadoExistente = filasUnicas.get(clave)
    if (duplicadoExistente) {
      if (duplicadoExistente.clics !== registro.clics
        || duplicadoExistente.impresiones !== registro.impresiones
        || duplicadoExistente.ctr !== registro.ctr
        || duplicadoExistente.posicion !== registro.posicion) {
        agregarIncidencia(incidencias, numeroFila, 'duplicado', 'La misma fecha, consulta y página aparece con métricas distintas.')
      } else {
        duplicados += 1
      }
      return
    }

    filasUnicas.set(clave, registro)
  })

  if (!filasUnicas.size && !incidencias.length) {
    agregarIncidencia(incidencias, 2, 'archivo', 'No hay filas con métricas para importar.')
  }

  return {
    filas: [...filasUnicas.values()],
    filasLeidas: filasDatos.length,
    duplicados,
    incidencias
  }
}
