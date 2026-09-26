import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { basename, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { detectarMimeEditorial, prepararPayloadPortada } from './preparar-portada-codex.mjs'

const etapas = ['expediente', 'borrador', 'portada', 'media', 'propuesta', 'entrega']
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const huella = /^[a-f0-9]{64}$/i
const maximoJsonBytes = 1_000_000
const maximoPortadaBytes = 2_400_000

function validarIdentidad(runId, categoryId, fingerprint) {
  if (!uuid.test(runId || '') || !uuid.test(categoryId || '') || !huella.test(fingerprint || '')) {
    throw new Error('La identidad del candidato no es válida.')
  }
}

function rutaCandidato(raiz, runId, categoryId, fingerprint) {
  validarIdentidad(runId, categoryId, fingerprint)
  const raizEstados = resolve(raiz, '.codex', 'editorial-runs')
  const ruta = resolve(raizEstados, runId.toLowerCase(), categoryId.toLowerCase(), fingerprint.toLowerCase())
  const relativa = relative(raizEstados, ruta)
  if (!relativa || relativa === '..' || relativa.startsWith(`..${sep}`)) {
    throw new Error('La ruta del checkpoint no está permitida.')
  }
  return ruta
}

function validarPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('El checkpoint debe contener un objeto JSON.')
  }
  const texto = JSON.stringify(payload)
  if (Buffer.byteLength(texto, 'utf8') > maximoJsonBytes) {
    throw new Error(`El checkpoint supera ${maximoJsonBytes} bytes.`)
  }
  function contieneClaveSecreta(valor) {
    if (!valor || typeof valor !== 'object') return false
    return Object.entries(valor).some(([clave, hijo]) =>
      /(secret|token|signature|service[_-]?role|password|api[_-]?key)/i.test(clave)
      || contieneClaveSecreta(hijo))
  }
  if (contieneClaveSecreta(payload)) {
    throw new Error('El checkpoint parece incluir credenciales; no se guardó.')
  }
  return texto
}

async function leerEtapas(ruta) {
  let archivos
  try {
    archivos = await readdir(ruta)
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }

  const resultado = {}
  for (const etapa of etapas) {
    const revisiones = archivos
      .map(nombre => ({ nombre, coincidencia: nombre.match(new RegExp(`^${etapa}\\.(\\d{3})\\.json$`)) }))
      .filter(archivo => archivo.coincidencia)
      .sort((a, b) => Number(a.coincidencia[1]) - Number(b.coincidencia[1]))
    if (revisiones.length) {
      const ultima = revisiones.at(-1)
      resultado[etapa] = JSON.parse(await readFile(resolve(ruta, ultima.nombre), 'utf8'))
    }
  }
  return resultado
}

const prerequisitos = {
  expediente: [],
  borrador: ['expediente'],
  portada: ['borrador'],
  media: ['portada'],
  propuesta: ['borrador', 'media'],
  entrega: ['propuesta']
}

async function guardarEtapa(raiz, identidad, etapa, payload) {
  if (!etapas.includes(etapa)) throw new Error('La etapa de checkpoint no es válida.')
  const texto = validarPayload(payload)
  const ruta = rutaCandidato(raiz, identidad.runId, identidad.categoryId, identidad.fingerprint)
  await mkdir(ruta, { recursive: true })
  const actuales = await leerEtapas(ruta)
  const faltantes = prerequisitos[etapa].filter(nombre => !actuales[nombre])
  if (faltantes.length) {
    throw new Error(`Primero guarda las etapas requeridas: ${faltantes.join(', ')}.`)
  }

  const nombres = await readdir(ruta)
  const revisiones = nombres
    .map(nombre => nombre.match(new RegExp(`^${etapa}\\.(\\d{3})\\.json$`)))
    .filter(Boolean)
    .map(coincidencia => Number(coincidencia[1]))
  const existente = actuales[etapa]
  if (existente && JSON.stringify(existente) === texto) {
    return { guardado: true, repetido: true, etapa }
  }
  if (revisiones.length >= 30) throw new Error('La etapa alcanzó el máximo de revisiones permitido.')

  const revision = (Math.max(0, ...revisiones) + 1).toString().padStart(3, '0')
  const destino = resolve(ruta, `${etapa}.${revision}.json`)
  const temporal = resolve(ruta, `.${etapa}.${randomUUID()}.tmp`)
  await writeFile(temporal, texto, { flag: 'wx' })
  try {
    await copyFile(temporal, destino, 1)
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
    throw new Error('Otro proceso guardó esta etapa al mismo tiempo; vuelve a leer el checkpoint.', { cause: error })
  } finally {
    await unlink(temporal).catch(() => {})
  }
  return { guardado: true, repetido: false, etapa, revision: Number(revision) }
}

async function guardarPortada(raiz, identidad, rutaImagen, rutaMetadatos) {
  const ruta = rutaCandidato(raiz, identidad.runId, identidad.categoryId, identidad.fingerprint)
  await mkdir(ruta, { recursive: true })
  const actuales = await leerEtapas(ruta)
  if (!actuales.borrador) throw new Error('Guarda primero el borrador antes de generar la portada.')

  const [bytes, textoMetadatos] = await Promise.all([
    readFile(resolve(rutaImagen)),
    readFile(resolve(rutaMetadatos), 'utf8')
  ])
  if (bytes.length < 75 || bytes.length > maximoPortadaBytes) {
    throw new Error(`La portada debe pesar entre 75 bytes y ${maximoPortadaBytes} bytes.`)
  }
  const mime = detectarMimeEditorial(bytes)
  if (!mime) throw new Error('La portada debe ser JPEG, PNG o WebP válido.')
  let metadatos
  try {
    metadatos = JSON.parse(textoMetadatos)
  } catch {
    throw new Error('El archivo de metadatos no contiene JSON válido.')
  }
  if (!metadatos || typeof metadatos !== 'object' || Array.isArray(metadatos)) {
    throw new Error('Los metadatos de portada deben ser un objeto JSON.')
  }
  prepararPayloadPortada(bytes, basename(rutaImagen), metadatos)
  const hash = createHash('sha256').update(bytes).digest('hex')
  const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[mime]
  const nombreArchivo = `portada-${hash}${extension}`
  const destino = resolve(ruta, nombreArchivo)
  const temporal = resolve(ruta, `.portada-${randomUUID()}.tmp`)
  await writeFile(temporal, bytes, { flag: 'wx' })
  try {
    await copyFile(temporal, destino, 1)
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
    const existente = await readFile(destino)
    if (!existente.equals(bytes)) throw new Error('La portada almacenada no coincide con su huella.', { cause: error })
  } finally {
    await unlink(temporal).catch(() => {})
  }
  const assetPath = relative(resolve(raiz), destino).split(sep).join('/')
  return guardarEtapa(raiz, identidad, 'portada', {
    assetPath,
    hash,
    mime,
    bytes: bytes.length,
    metadatos
  })
}

export async function leerCheckpoint(raiz, identidad) {
  const ruta = rutaCandidato(raiz, identidad.runId, identidad.categoryId, identidad.fingerprint)
  return leerEtapas(ruta)
}

export async function exportarEtapaCheckpoint(raiz, identidad, etapa, rutaSalida) {
  if (!etapas.includes(etapa)) throw new Error('La etapa de checkpoint no es válida.')
  const ruta = rutaCandidato(raiz, identidad.runId, identidad.categoryId, identidad.fingerprint)
  const checkpoints = await leerEtapas(ruta)
  if (!checkpoints[etapa]) throw new Error('La etapa solicitada no existe en el checkpoint.')

  const destino = resolve(ruta, rutaSalida)
  const relativa = relative(ruta, destino)
  if (!relativa || relativa === '..' || relativa.startsWith(`..${sep}`)) {
    throw new Error('La exportación debe permanecer dentro del directorio del candidato.')
  }
  const contenido = JSON.stringify(checkpoints[etapa])
  try {
    await writeFile(destino, contenido, { flag: 'wx' })
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
    const existente = await readFile(destino, 'utf8')
    if (existente !== contenido) {
      throw new Error('El archivo de exportación existente no coincide con la etapa guardada.', { cause: error })
    }
    return { exportada: true, repetida: true, etapa }
  }
  return { exportada: true, repetida: false, etapa }
}

export async function listarCheckpointsRun(raiz, runId) {
  if (!uuid.test(runId || '')) throw new Error('La corrida no es válida.')
  const carpetaRun = resolve(raiz, '.codex', 'editorial-runs', runId.toLowerCase())
  let categorias
  try {
    categorias = await readdir(carpetaRun, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }

  const resultado = []
  for (const categoria of categorias) {
    if (!categoria.isDirectory() || !uuid.test(categoria.name)) continue
    const carpetaCategoria = resolve(carpetaRun, categoria.name)
    const huellas = await readdir(carpetaCategoria, { withFileTypes: true })
    for (const candidata of huellas) {
      if (!candidata.isDirectory() || !huella.test(candidata.name)) continue
      const etapasGuardadas = await leerEtapas(resolve(carpetaCategoria, candidata.name))
      resultado.push({
        categoryId: categoria.name,
        fingerprint: candidata.name,
        etapas: etapas.filter(etapa => etapasGuardadas[etapa])
      })
    }
  }
  return resultado.sort((a, b) =>
    a.categoryId.localeCompare(b.categoryId) || a.fingerprint.localeCompare(b.fingerprint))
}

export async function guardarCheckpoint(raiz, identidad, etapa, payload) {
  return guardarEtapa(raiz, identidad, etapa, payload)
}

export async function guardarPortadaCheckpoint(raiz, identidad, rutaImagen, rutaMetadatos) {
  return guardarPortada(raiz, identidad, rutaImagen, rutaMetadatos)
}

export async function prepararPayloadPortadaCheckpoint(raiz, identidad, rutaSalida) {
  const ruta = rutaCandidato(raiz, identidad.runId, identidad.categoryId, identidad.fingerprint)
  const etapasGuardadas = await leerEtapas(ruta)
  if (!etapasGuardadas.portada?.assetPath || !etapasGuardadas.portada?.metadatos) {
    throw new Error('La portada todavía no está guardada en el checkpoint.')
  }
  const rutaImagen = resolve(raiz, etapasGuardadas.portada.assetPath)
  const relativa = relative(ruta, rutaImagen)
  if (!relativa || relativa === '..' || relativa.startsWith(`..${sep}`)) {
    throw new Error('La portada guardada no pertenece a este candidato.')
  }
  const destino = resolve(ruta, rutaSalida)
  const salidaRelativa = relative(ruta, destino)
  if (!salidaRelativa || salidaRelativa === '..' || salidaRelativa.startsWith(`..${sep}`)) {
    throw new Error('El payload debe guardarse dentro del directorio de este candidato.')
  }
  const bytes = await readFile(rutaImagen)
  const payload = prepararPayloadPortada(bytes, rutaImagen, etapasGuardadas.portada.metadatos)
  const contenido = JSON.stringify(payload)
  try {
    await writeFile(destino, contenido, { flag: 'wx' })
    return { preparado: true, repetido: false, mime: payload.tipoMime, bytes: bytes.length }
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
    const existente = await readFile(destino, 'utf8')
    if (existente !== contenido) {
      throw new Error('El payload de portada existente no coincide con el checkpoint guardado.', { cause: error })
    }
    return { preparado: true, repetido: true, mime: payload.tipoMime, bytes: bytes.length }
  }
}

async function main() {
  const [comando, runId, categoryId, fingerprint, etapa, archivo] = process.argv.slice(2)
  if (comando === 'listar' && runId && !categoryId) {
    try {
      process.stdout.write(JSON.stringify(await listarCheckpointsRun(process.cwd(), runId)) + '\n')
      return
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : 'No se pudo listar la corrida.'}\n`)
      process.exitCode = 1
      return
    }
  }
  const identidad = { runId, categoryId, fingerprint }
  try {
    validarIdentidad(runId, categoryId, fingerprint)
    const raiz = process.cwd()
    if (comando === 'leer' && !etapa) {
      process.stdout.write(JSON.stringify(await leerCheckpoint(raiz, identidad)) + '\n')
      return
    }
    if (comando === 'guardar' && etapa && archivo) {
      const payload = JSON.parse(await readFile(resolve(archivo), 'utf8'))
      const resultado = await guardarCheckpoint(raiz, identidad, etapa, payload)
      process.stdout.write(JSON.stringify(resultado) + '\n')
      return
    }
    if (comando === 'exportar' && etapa && archivo) {
      const resultado = await exportarEtapaCheckpoint(raiz, identidad, etapa, archivo)
      process.stdout.write(JSON.stringify(resultado) + '\n')
      return
    }
    if (comando === 'portada' && etapa && archivo) {
      const resultado = await guardarPortadaCheckpoint(raiz, identidad, etapa, archivo)
      process.stdout.write(JSON.stringify(resultado) + '\n')
      return
    }
    if (comando === 'payload-portada' && etapa && !archivo) {
      const resultado = await prepararPayloadPortadaCheckpoint(raiz, identidad, etapa)
      process.stdout.write(JSON.stringify(resultado) + '\n')
      return
    }
    process.stderr.write('Uso: listar <runId> | leer <runId> <categoryId> <fingerprint> | exportar <runId> <categoryId> <fingerprint> <etapa> <salida.json> | guardar <runId> <categoryId> <fingerprint> <etapa> <payload.json> | portada <runId> <categoryId> <fingerprint> <imagen> <metadatos.json> | payload-portada <runId> <categoryId> <fingerprint> <payload.json>\n')
    process.exitCode = 2
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'No se pudo guardar el checkpoint.'}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
