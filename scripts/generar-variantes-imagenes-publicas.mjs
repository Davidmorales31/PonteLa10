import { readdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const configuraciones = [
  {
    directorio: 'images/escudos/liga-colombiana',
    anchos: [48, 96, 192, 384]
  },
  { archivo: 'publicidad/pont3la10-labs.png', anchos: [640, 1024, 1672] },
  { archivo: 'editorial/pagina_404_jugador_estadio.png', anchos: [640, 1024, 1536] },
  { archivo: 'editorial/estado_sin_datos_resultados.png', anchos: [320, 640] },
  { archivo: 'editorial/login_pont3la10_tunel_estadio.png', anchos: [480, 768, 1024] },
  { archivo: 'brand/pont3la10_logo_login_blanco.png', anchos: [180, 360, 598] },
  { archivo: 'brand/pont3la10_logo_modo_blanco.png', anchos: [180, 360, 598] },
  { archivo: 'brand/pont3la10_logo_real_blanco_transparente.png', anchos: [180, 360, 598] }
]

async function convertirArchivo(rutaRelativa, anchos) {
  const rutaOrigen = resolve(raiz, rutaRelativa)
  const metadatos = await sharp(rutaOrigen, { limitInputPixels: 80_000_000 }).metadata()
  if (!metadatos.width || !metadatos.height) {
    throw new Error(`La imagen no tiene dimensiones válidas: ${rutaRelativa}`)
  }

  const extension = rutaRelativa.slice(rutaRelativa.lastIndexOf('.'))
  const base = rutaRelativa.slice(0, -extension.length)
  const anchosValidos = [...new Set(anchos)].filter(ancho => ancho <= metadatos.width)
  const imagenes = []

  for (const ancho of anchosValidos) {
    const destino = resolve(raiz, `${base}-${ancho}.webp`)
    await sharp(rutaOrigen, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: ancho, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toFile(destino)
    imagenes.push(destino)
  }

  return imagenes
}

const archivos = []
for (const configuracion of configuraciones) {
  if (configuracion.directorio) {
    const directorio = resolve(raiz, configuracion.directorio)
    const nombres = await readdir(directorio)
    const fuentes = nombres
      .filter(nombre => nombre.toLowerCase().endsWith('.png'))
      .sort()
    for (const nombre of fuentes) {
      archivos.push(...await convertirArchivo(
        `${configuracion.directorio}/${nombre}`,
        configuracion.anchos
      ))
    }
    continue
  }

  const rutaOrigen = resolve(raiz, configuracion.archivo)
  if (!(await stat(rutaOrigen)).isFile()) {
    throw new Error(`No se encontró el recurso configurado: ${configuracion.archivo}`)
  }
  archivos.push(...await convertirArchivo(configuracion.archivo, configuracion.anchos))
}

const bytesGenerados = (await Promise.all(archivos.map(ruta => stat(ruta))))
  .reduce((total, archivo) => total + archivo.size, 0)
console.log(`Variantes WebP generadas: ${archivos.length}; peso total: ${bytesGenerados} bytes.`)
