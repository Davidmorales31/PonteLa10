import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { detectarMimeEditorial } from './preparar-portada-codex.mjs'

export const maximoBytesPortadaIACodex = 2_400_000
const maximoBytesOriginal = 24_000_000
const maximoPixeles = 40_000_000

function validarMetadatosPortadaIA(metadatos) {
  const campos = ['titulo', 'alt']
  if (!metadatos || typeof metadatos !== 'object' || Array.isArray(metadatos)
    || Object.keys(metadatos).length !== campos.length
    || campos.some(campo => typeof metadatos[campo] !== 'string'
      || !metadatos[campo].trim())
    || metadatos.titulo.trim().length < 8 || metadatos.titulo.trim().length > 160
    || metadatos.alt.trim().length < 5 || metadatos.alt.trim().length > 240) {
    throw new Error('La portada IA requiere un título y texto alternativo editorial válidos.')
  }
  return { titulo: metadatos.titulo.trim(), alt: metadatos.alt.trim() }
}

export async function optimizarPortadaIACodex(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 75 || bytes.length > maximoBytesOriginal) {
    throw new Error(`El archivo de origen debe pesar entre 75 bytes y ${maximoBytesOriginal} bytes.`)
  }

  const mime = detectarMimeEditorial(bytes)
  if (!mime) throw new Error('La portada IA debe ser JPEG, PNG o WebP válido.')

  let imagen
  try {
    imagen = sharp(bytes, {
      failOn: 'error',
      limitInputPixels: maximoPixeles,
      animated: false
    })
    const metadatos = await imagen.metadata()
    if (!metadatos.width || !metadatos.height
      || !['jpeg', 'png', 'webp'].includes(metadatos.format || '')) {
      throw new Error('La imagen generada no tiene dimensiones o formato válidos.')
    }
  } catch {
    throw new Error('La imagen generada está dañada o no es válida.')
  }

  for (const calidad of [82, 76, 70, 64]) {
    const optimizada = await imagen.clone()
      .rotate()
      .resize({
        width: 1600,
        height: 900,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: calidad, effort: 5, smartSubsample: true })
      .toBuffer()
    if (optimizada.length <= maximoBytesPortadaIACodex) return optimizada
  }

  throw new Error(`La portada optimizada supera ${maximoBytesPortadaIACodex} bytes.`)
}

export function prepararPayloadPortadaIACodex(bytes, nombreArchivo, metadatos) {
  const datos = validarMetadatosPortadaIA(metadatos)
  if (!Buffer.isBuffer(bytes) || bytes.length < 75 || bytes.length > maximoBytesPortadaIACodex
    || detectarMimeEditorial(bytes) !== 'image/webp') {
    throw new Error('La portada IA optimizada debe ser un archivo WebP de hasta 2,4 MB.')
  }
  return {
    nombreOriginal: basename(nombreArchivo).slice(0, 160),
    tipoMime: 'image/webp',
    imagenBase64: bytes.toString('base64'),
    titulo: datos.titulo,
    alt: datos.alt
  }
}

async function main() {
  const [rutaImagen, rutaMetadatos, rutaSalida] = process.argv.slice(2)
  if (!rutaImagen || !rutaMetadatos || !rutaSalida) {
    process.stderr.write('Uso: node scripts/preparar-portada-ia-codex.mjs <imagen-generada> <metadatos.json> <payload.json>\n')
    process.exitCode = 2
    return
  }

  try {
    const [bytes, textoMetadatos] = await Promise.all([
      readFile(resolve(rutaImagen)),
      readFile(resolve(rutaMetadatos), 'utf8')
    ])
    const metadatos = JSON.parse(textoMetadatos)
    const optimizada = await optimizarPortadaIACodex(bytes)
    const payload = prepararPayloadPortadaIACodex(optimizada, rutaImagen, metadatos)
    await writeFile(resolve(rutaSalida), JSON.stringify(payload), { flag: 'wx' })
    process.stdout.write(`Portada IA optimizada y preparada (${optimizada.length} bytes WebP).\n`)
  } catch (error) {
    const mensaje = error instanceof SyntaxError
      ? 'El archivo de metadatos no contiene JSON válido.'
      : error instanceof Error ? error.message : 'No se pudo preparar la portada IA.'
    process.stderr.write(`${mensaje}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
