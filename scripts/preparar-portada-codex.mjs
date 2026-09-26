import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'

const maximoBytesImagen = 2_400_000

export function detectarMimeEditorial(bytes) {
  if (!Buffer.isBuffer(bytes)) return null
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png'
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  return null
}

export function prepararPayloadPortada(bytes, nombreArchivo, metadatos) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 75 || bytes.length > maximoBytesImagen) {
    throw new Error(`La imagen debe pesar entre 75 bytes y ${maximoBytesImagen} bytes.`)
  }

  const tipoMime = detectarMimeEditorial(bytes)
  if (!tipoMime) {
    throw new Error('La imagen debe ser JPEG, PNG o WebP válido.')
  }

  const campos = ['titulo', 'alt', 'pie', 'autorFoto', 'licenciaFoto', 'urlFuente']
  if (!metadatos || typeof metadatos !== 'object' || Array.isArray(metadatos)
    || Object.keys(metadatos).length !== campos.length
    || campos.some(campo => typeof metadatos[campo] !== 'string'
      || !metadatos[campo].trim())
    || metadatos.titulo.trim().length < 8 || metadatos.titulo.trim().length > 160
    || metadatos.alt.trim().length < 5 || metadatos.alt.trim().length > 240
    || metadatos.pie.trim().length < 10 || metadatos.pie.trim().length > 500
    || metadatos.autorFoto.trim().length < 2 || metadatos.autorFoto.trim().length > 200
    || !['CC0 1.0', 'CC BY 4.0', 'Dominio público'].includes(metadatos.licenciaFoto)
    || metadatos.urlFuente.trim().length > 2048
    || !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/i.test(metadatos.urlFuente.trim())) {
    throw new Error('Los metadatos deben identificar una foto de Commons, autor y licencia permitida.')
  }

  const credito = `${metadatos.autorFoto.trim()} · ${metadatos.licenciaFoto} · Wikimedia Commons`
  return {
    nombreOriginal: basename(nombreArchivo).slice(0, 160),
    tipoMime,
    imagenBase64: bytes.toString('base64'),
    titulo: metadatos.titulo.trim(),
    alt: metadatos.alt.trim(),
    pie: metadatos.pie.trim(),
    credito,
    urlFuente: metadatos.urlFuente.trim(),
    autorFoto: metadatos.autorFoto.trim(),
    licenciaFoto: metadatos.licenciaFoto
  }
}

async function main() {
  const [rutaImagen, rutaMetadatos, rutaSalida] = process.argv.slice(2)
  if (!rutaImagen || !rutaMetadatos || !rutaSalida) {
    process.stderr.write('Uso: node scripts/preparar-portada-codex.mjs <imagen> <metadatos.json> <payload.json>\n')
    process.exitCode = 2
    return
  }

  try {
    const [bytes, textoMetadatos] = await Promise.all([
      readFile(resolve(rutaImagen)),
      readFile(resolve(rutaMetadatos), 'utf8')
    ])
    const metadatos = JSON.parse(textoMetadatos)
    const payload = prepararPayloadPortada(bytes, rutaImagen, metadatos)
    await writeFile(resolve(rutaSalida), JSON.stringify(payload), { flag: 'wx' })
    process.stdout.write(`Payload preparado (${payload.tipoMime}, ${bytes.length} bytes).\n`)
  } catch (error) {
    const mensaje = error instanceof SyntaxError
      ? 'El archivo de metadatos no contiene JSON válido.'
      : error instanceof Error ? error.message : 'No se pudo preparar la portada.'
    process.stderr.write(`${mensaje}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
