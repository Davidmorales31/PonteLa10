// Prepara la publicación social (Facebook + Instagram) de un artículo ya programado:
// foto de portada con el titular encima, usando la API de agentes de redes.
// Uso:
//   node scripts/redes-publicar-articulo.mjs <slug|id> [--credito "Colprensa (vía El Colombiano)"] [--programar <ISO>] [--dry-run]
//   node scripts/redes-publicar-articulo.mjs --pendientes [--creditos <archivo.json>] [--borrador|--programar-desde <ISO>|--auto] [--horas 24]
//     Completa los artículos recientes sin publicación social (o con borrador sin programar).
//     El crédito de la foto sale de la portada del artículo; el archivo (slug -> crédito) solo lo sobrescribe.
//     El crédito es opcional (decisión del responsable, 2026-11-20): si la portada lo trae se añade al texto; si no, se publica igual. `--auto` programa cada pieza en la primera hora libre (ver `horasParaPendientes`).
// La llave (PONT3LA10_AGENTES_REDES_KEY) la crea una persona en Panel → Contenido
// para redes → Agentes IA y se guarda en el .env de la raíz. Nunca se imprime.
// Sin el alcance `programar` la pieza queda como «Pide tu aprobación».
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { proponerHoras } from './video-horarios.mjs'

const SITIO = 'https://www.pont3la10.com'

export function resaltarFinal(titular) {
  const palabras = String(titular || '').trim().split(/\s+/).filter(Boolean)
  if (palabras.length < 4) return palabras.join(' ')
  const cola = palabras.splice(-2).join(' ')
  return `${palabras.join(' ')} **${cola}**`
}

export function construirComposicionArticulo(articulo, medioId, credito) {
  const titular = String(articulo.tituloPortada || articulo.titulo || '').trim()
  if (!titular) throw new Error('El artículo no tiene titular.')
  if (!medioId) throw new Error('Falta el identificador de la imagen.')
  const url = `${SITIO}/articulos/${articulo.slug}`
  const resumen = String(articulo.resumen || '').trim()
  const fuente = credito ? `\n\nFoto: ${credito}` : ''
  return {
    tipo: 'imagenes',
    titulo: String(articulo.titulo).slice(0, 120),
    formato: 'vertical',
    destinos: ['facebook', 'instagram'],
    descripcion: {
      facebook: `${articulo.titulo}\n\n${resumen}\n\nLee la nota completa: ${url}${fuente}`.slice(0, 5000),
      instagram: `${articulo.titulo}\n\n${resumen}\n\nNota completa en pont3la10.com${fuente}`.slice(0, 2200)
    },
    claveIdempotencia: `articulo-${articulo.id}`,
    diapositivas: [{
      plantilla: 'una',
      imagenes: [{ medioId }],
      logos: [{ x: 50, y: 10, ancho: 34 }],
      textos: [{ texto: resaltarFinal(titular).slice(0, 220), y: 82, tamano: 64, color: 'blanco', fondo: 'degradado' }]
    }]
  }
}

const ESTADOS_CERRADOS = ['scheduled', 'publishing', 'published']

// Decide qué hacer con cada artículo reciente según las publicaciones sociales ya existentes.
// Devuelve { crear, reanudar, omitidos } sin tocar la red.
// `propias` (opcional) son las publicaciones creadas con la llave en uso: un borrador ajeno no se puede
// modificar (403 no_es_tuya), así que se recrea bajo esta llave.
export function planificarPendientes(articulos, publicaciones, ahora = Date.now(), horas = 24, propias = null) {
  const idsPropios = propias ? new Set(propias.map(p => p.id)) : null
  const desde = ahora - horas * 3_600_000
  const porTitulo = new Map()
  for (const p of publicaciones) {
    const previa = porTitulo.get(p.titulo)
    // Una pieza ya cerrada gana sobre un borrador del mismo titular.
    if (!previa || (ESTADOS_CERRADOS.includes(p.estado) && !ESTADOS_CERRADOS.includes(previa.estado))) porTitulo.set(p.titulo, p)
  }
  const plan = { crear: [], reanudar: [], omitidos: [] }
  for (const articulo of articulos) {
    const publicado = Date.parse(articulo.publicadoEn || '')
    if (!Number.isFinite(publicado) || publicado > ahora || publicado < desde) continue
    if (!articulo.imagen) { plan.omitidos.push({ slug: articulo.slug, motivo: 'sin imagen' }); continue }
    const existente = porTitulo.get(String(articulo.titulo).slice(0, 120))
    if (!existente) plan.crear.push(articulo)
    else if (existente.estado === 'draft' && idsPropios && !idsPropios.has(existente.id)) plan.crear.push(articulo)
    else if (existente.estado === 'draft') plan.reanudar.push({ articulo, id: existente.id })
    else if (existente.estado === 'failed') plan.omitidos.push({ slug: articulo.slug, motivo: 'envío fallido: revisar en el panel' })
    else plan.omitidos.push({ slug: articulo.slug, motivo: `ya está ${existente.estado}` })
  }
  return plan
}


const SEPARACION_MINUTOS = 15
const MARGEN_MINUTOS = 12

/**
 * Horas de publicación para `cantidad` piezas: la primera a más de 12 minutos de ahora (la API pide más de 10) y después
 * de la última ya programada, una cada 15 minutos, saltando la madrugada de Bogotá (23:00–05:30) según
 * config/horariosPublicacion.json. `programadas` son las fechas ya programadas (ISO).
 */
export function horasParaPendientes(cantidad, programadas = [], ahora = Date.now()) {
  const ultima = Math.max(0, ...programadas.map(f => Date.parse(f)).filter(Number.isFinite))
  let hora = Math.max(ahora + MARGEN_MINUTOS * 60_000, ultima ? ultima + SEPARACION_MINUTOS * 60_000 : 0)
  const salida = []
  for (let i = 0; i < cantidad; i++) {
    const horaBogota = new Date(hora - 5 * 3_600_000)
    const minutos = horaBogota.getUTCHours() * 60 + horaBogota.getUTCMinutes()
    if (minutos >= 23 * 60 || minutos < 5 * 60 + 30) {
      // La primera franja de mañana que permite la regla de horarios.
      const [primera] = proponerHoras({ ahora: hora, cantidad: 1 })
      hora = Date.parse(primera)
    }
    salida.push(new Date(hora).toISOString())
    hora += SEPARACION_MINUTOS * 60_000
  }
  return salida
}

/** Crédito de la foto de portada de un artículo publicado (API pública); vacío si no lo trae. */
export async function creditoDePortada(slug, transporte = fetch) {
  try {
    const respuesta = await transporte(`${SITIO}/api/articulos/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(20_000) })
    if (!respuesta.ok) return ''
    return String((await respuesta.json())?.portada?.credito || '').trim().slice(0, 160)
  } catch { return '' }
}

function terminar(mensaje, codigo = 1) {
  process.stderr.write(`${mensaje}\n`)
  process.exit(codigo)
}

async function llamar(base, llave, metodo, ruta, cuerpo) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { authorization: `Bearer ${llave}`, ...(cuerpo ? { 'content-type': 'application/json' } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(60_000)
  })
  const tipo = respuesta.headers.get('content-type') || ''
  const datos = tipo.includes('json') ? await respuesta.json().catch(() => null) : Buffer.from(await respuesta.arrayBuffer())
  if (!respuesta.ok) {
    const codigo = datos?.error?.codigo ? ` (${datos.error.codigo})` : ''
    const detalle = datos?.error?.mensaje ? `: ${String(datos.error.mensaje).slice(0, 200)}` : ''
    terminar(`La API de redes rechazó ${metodo} ${ruta}: HTTP ${respuesta.status}${codigo}${detalle}`)
  }
  return datos
}

async function leerFeed() {
  const feed = await (await fetch(`${SITIO}/api/articulos?categoria=futbol-colombiano&limite=50`)).json()
  return Array.isArray(feed) ? feed : (feed.articulos || feed.items || [])
}

// Lleva una publicación (nueva o borrador existente) hasta borrador, programada o pendiente de aprobación.
async function procesar(ctx, articulo, { credito, programar, borrador, previsualizacion, idExistente }) {
  const { base, llave } = ctx
  let id = idExistente
  if (!id) {
    const medio = await llamar(base, llave, 'POST', '/medios/desde-url', { url: articulo.imagen })
    const medioId = medio?.id || medio?.medio?.id
    if (!medioId) terminar('La API no devolvió el identificador de la imagen importada.')
    const creada = await llamar(base, llave, 'POST', '/publicaciones', construirComposicionArticulo(articulo, medioId, credito))
    id = creada?.id || creada?.publicacion?.id
    if (!id) terminar('La API no devolvió el identificador de la publicación.')
  }
  const leida = await llamar(base, llave, 'GET', `/publicaciones/${id}`)
  const revision = leida?.revision ?? leida?.publicacion?.revision
  if (!Number.isInteger(revision)) terminar('No se pudo leer la revisión de la publicación.')

  const imagen = await llamar(base, llave, 'GET', `/publicaciones/${id}/previsualizacion?formato=jpg`)
  if (Buffer.isBuffer(imagen)) {
    const salida = resolve(previsualizacion || `previsualizacion-${basename(articulo.slug).slice(0, 40)}.jpg`)
    // La carpeta puede no existir (en un directorio temporal nuevo falló con ENOENT antes de programar nada).
    await mkdir(dirname(salida), { recursive: true })
    await writeFile(salida, imagen)
    process.stdout.write(`Previsualización guardada en ${salida}\n`)
  }
  const validacion = await llamar(base, llave, 'POST', `/publicaciones/${id}/validar`, {})
  process.stdout.write(`Validación: ${JSON.stringify(validacion).slice(0, 400)}\n`)

  if (borrador) {
    process.stdout.write(`Borrador ${id} listo (revisión ${revision}); no se envió ni programó.\n`)
    return
  }
  if (programar) {
    await llamar(base, llave, 'POST', `/publicaciones/${id}/programar`, { id, revision, fecha: programar })
    process.stdout.write(`Publicación ${id} programada para ${programar}.\n`)
  } else {
    await llamar(base, llave, 'POST', `/publicaciones/${id}/solicitar-aprobacion`, {
      id, revision,
      nota: `Titular de portada${credito ? ` y foto (${credito})` : ''} del artículo ${articulo.slug}.`,
      horaSugerida: new Date(Date.now() + 15 * 60_000).toISOString()
    })
    process.stdout.write(`Publicación ${id} pendiente de aprobación humana.\n`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined }
  const conValor = new Set(['--credito', '--programar', '--previsualizacion', '--creditos', '--programar-desde', '--horas', '--carpeta'])
  const objetivo = args.find((a, i) => !a.startsWith('--') && !conValor.has(args[i - 1]))
  const dryRun = args.includes('--dry-run')
  const pendientes = args.includes('--pendientes')
  const credito = valor('--credito')
  const programar = valor('--programar')
  if (!pendientes && !objetivo) terminar('Uso: node scripts/redes-publicar-articulo.mjs <slug|id> [--credito "Fotógrafo (vía medio)"] [--programar <ISO>] [--dry-run]\n   o: node scripts/redes-publicar-articulo.mjs --pendientes --creditos <archivo.json> [--borrador | --programar-desde <ISO>] [--horas 24]', 2)

  try { process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))) } catch (error) {
    if (error?.code !== 'ENOENT') terminar('No se pudo cargar la configuración privada local.')
  }

  const lista = await leerFeed()
  if (!pendientes) {
    const articulo = lista.find(a => a.id === objetivo || a.slug === objetivo)
    if (!articulo) terminar('El artículo no está entre los 50 más recientes publicados de Fútbol colombiano.')
    if (!articulo.imagen) terminar('El artículo no tiene imagen de portada.')
    if (dryRun) {
      process.stdout.write(JSON.stringify(construirComposicionArticulo(articulo, '00000000-0000-4000-8000-000000000000', credito), null, 1) + '\n')
      return
    }
  }

  const llave = process.env.PONT3LA10_AGENTES_REDES_KEY
  const base = process.env.PONT3LA10_AGENTES_REDES_BASE_URL || `${SITIO}/api/agentes/redes/v1`
  if (!llave) terminar('Falta PONT3LA10_AGENTES_REDES_KEY: una persona debe crear la llave en Panel → Contenido para redes → Agentes IA.')
  const destino = new URL(base)
  if (destino.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(destino.hostname)) terminar('La API de redes debe usar HTTPS.')
  if (!['pont3la10.com', 'www.pont3la10.com', 'localhost', '127.0.0.1'].includes(destino.hostname)) terminar('Destino de la API de redes no permitido.')
  const ctx = { base, llave }

  if (!pendientes) {
    const articulo = lista.find(a => a.id === objetivo || a.slug === objetivo)
    await procesar(ctx, articulo, { credito, programar, borrador: args.includes('--borrador'), previsualizacion: valor('--previsualizacion') })
    return
  }

  const archivoCreditos = valor('--creditos')
  const creditos = archivoCreditos ? JSON.parse(await readFile(resolve(archivoCreditos), 'utf8')) : {}
  const horas = Number(valor('--horas') || 24)
  const existentes = (await llamar(base, llave, 'GET', '/publicaciones?ambito=todas&limite=50'))?.publicaciones || []
  const propias = (await llamar(base, llave, 'GET', '/publicaciones?ambito=mias&limite=50'))?.publicaciones || []
  const plan = planificarPendientes(lista, existentes, Date.now(), horas, propias)
  const trabajo = [...plan.reanudar.map(r => ({ articulo: r.articulo, idExistente: r.id })), ...plan.crear.map(articulo => ({ articulo }))]
  for (const o of plan.omitidos) process.stdout.write(`Omitido ${o.slug}: ${o.motivo}\n`)
  if (!trabajo.length) { process.stdout.write('No hay artículos pendientes de publicación social.\n'); return }

  const auto = args.includes('--auto')
  const desde = valor('--programar-desde')
  const borrador = args.includes('--borrador')
  if (!borrador && !desde && !auto) terminar('Indica --borrador (para revisar las imágenes), --programar-desde <ISO con -05:00> o --auto.', 2)
  const carpeta = resolve(valor('--carpeta') || resolve(tmpdir(), 'pont3la10-redes'))
  if (desde && !(Date.parse(desde) > Date.now() + 10 * 60_000)) terminar('--programar-desde debe estar a más de 10 minutos de ahora.', 2)
  // Con --auto cada pieza va a la primera hora libre, después de lo que ya esté programado.
  const programadas = auto ? existentes.map(p => p.programadaPara).filter(Boolean) : []
  const horasAuto = auto ? horasParaPendientes(trabajo.length, programadas) : []
  let hora = desde ? Date.parse(desde) : 0
  let indice = 0
  for (const { articulo, idExistente } of trabajo) {
    const creditoFoto = creditos[articulo.slug] || await creditoDePortada(articulo.slug)
    process.stdout.write(`\n== ${articulo.slug}\n`)
    await procesar(ctx, articulo, {
      credito: creditoFoto, borrador, idExistente,
      programar: auto ? horasAuto[indice] : desde ? new Date(hora).toISOString() : undefined,
      previsualizacion: resolve(carpeta, `previsualizacion-${basename(articulo.slug).slice(0, 40)}.jpg`)
    })
    indice += 1
    if (desde) hora += 15 * 60_000
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
