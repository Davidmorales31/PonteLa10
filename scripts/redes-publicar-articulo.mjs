// Prepara la publicación social (Facebook + Instagram) de un artículo ya programado:
// foto de portada con el titular encima, usando la API de agentes de redes.
// Uso:
//   node scripts/redes-publicar-articulo.mjs <slug|id> --credito "Colprensa (vía El Colombiano)" [--programar <ISO>] [--dry-run]
// La llave (PONT3LA10_AGENTES_REDES_KEY) la crea una persona en Panel → Contenido
// para redes → Agentes IA y se guarda en el .env de la raíz. Nunca se imprime.
// Sin el alcance `programar` la pieza queda como «Pide tu aprobación».
import { basename, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'

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

async function main() {
  const args = process.argv.slice(2)
  const objetivo = args.find(a => !a.startsWith('--'))
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined }
  const dryRun = args.includes('--dry-run')
  const credito = valor('--credito')
  const programar = valor('--programar')
  if (!objetivo || !credito) terminar('Uso: node scripts/redes-publicar-articulo.mjs <slug|id> --credito "Fotógrafo (vía medio)" [--programar <ISO>] [--dry-run]', 2)

  try { process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url))) } catch (error) {
    if (error?.code !== 'ENOENT') terminar('No se pudo cargar la configuración privada local.')
  }

  const feed = await (await fetch(`${SITIO}/api/articulos?categoria=futbol-colombiano&limite=50`)).json()
  const lista = Array.isArray(feed) ? feed : (feed.articulos || feed.items || [])
  const articulo = lista.find(a => a.id === objetivo || a.slug === objetivo)
  if (!articulo) terminar('El artículo no está entre los 50 más recientes publicados de Fútbol colombiano.')
  if (!articulo.imagen) terminar('El artículo no tiene imagen de portada.')

  if (dryRun) {
    process.stdout.write(JSON.stringify(construirComposicionArticulo(articulo, '00000000-0000-4000-8000-000000000000', credito), null, 1) + '\n')
    return
  }

  const llave = process.env.PONT3LA10_AGENTES_REDES_KEY
  const base = process.env.PONT3LA10_AGENTES_REDES_BASE_URL || `${SITIO}/api/agentes/redes/v1`
  if (!llave) terminar('Falta PONT3LA10_AGENTES_REDES_KEY: una persona debe crear la llave en Panel → Contenido para redes → Agentes IA.')
  const destino = new URL(base)
  if (destino.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(destino.hostname)) terminar('La API de redes debe usar HTTPS.')
  if (!['pont3la10.com', 'www.pont3la10.com', 'localhost', '127.0.0.1'].includes(destino.hostname)) terminar('Destino de la API de redes no permitido.')

  const medio = await llamar(base, llave, 'POST', '/medios/desde-url', { url: articulo.imagen })
  const medioId = medio?.id || medio?.medio?.id
  if (!medioId) terminar('La API no devolvió el identificador de la imagen importada.')

  const creada = await llamar(base, llave, 'POST', '/publicaciones', construirComposicionArticulo(articulo, medioId, credito))
  const id = creada?.id || creada?.publicacion?.id
  if (!id) terminar('La API no devolvió el identificador de la publicación.')
  const leida = await llamar(base, llave, 'GET', `/publicaciones/${id}`)
  const revision = leida?.revision ?? leida?.publicacion?.revision
  if (!Number.isInteger(revision)) terminar('No se pudo leer la revisión de la publicación.')

  const imagen = await llamar(base, llave, 'GET', `/publicaciones/${id}/previsualizacion?formato=jpg`)
  if (Buffer.isBuffer(imagen)) {
    const salida = resolve(valor('--previsualizacion') || `previsualizacion-${basename(articulo.slug).slice(0, 40)}.jpg`)
    await writeFile(salida, imagen)
    process.stdout.write(`Previsualización guardada en ${salida}\n`)
  }
  const validacion = await llamar(base, llave, 'POST', `/publicaciones/${id}/validar`, {})
  process.stdout.write(`Validación: ${JSON.stringify(validacion).slice(0, 400)}\n`)

  if (args.includes('--borrador')) {
    process.stdout.write(`Borrador ${id} listo (revisión ${revision}); no se envió ni programó.\n`)
    return
  }

  if (programar) {
    await llamar(base, llave, 'POST', `/publicaciones/${id}/programar`, { id, revision, fecha: programar })
    process.stdout.write(`Publicación ${id} programada para ${programar}.\n`)
  } else {
    await llamar(base, llave, 'POST', `/publicaciones/${id}/solicitar-aprobacion`, {
      id, revision,
      nota: `Titular de portada y foto acreditada (${credito}) del artículo ${articulo.slug}.`,
      horaSugerida: new Date(Date.now() + 15 * 60_000).toISOString()
    })
    process.stdout.write(`Publicación ${id} pendiente de aprobación humana.\n`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
