// Genera en local la(s) imagen(es) de redes de una nota con el formato elegido (docs/PLAN_FLUJO_IMAGENES_REDES.md).
// Devuelve una lista de Buffers JPG 1080×1350 (uno por diapositiva). Sin agentes. Si algo falla, quien llama cae al formato clásico.
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { componerBanda, componerCarrusel, componerCita, componerFicha, componerImpactoDesenfocado, citaDeNota, cifraDeNota, conSitio, corto, puntosDeNota } from './redes-formatos.mjs'
import { RAIZ, LIENZO, componerImpacto, palabraDeImpacto } from './redes-imagen-impacto.mjs'

const SITIO = 'https://www.pont3la10.com'
const LOGO = join(RAIZ, 'public/brand/pont3la10_logo_login_blanco.png')

/** Compuerta de calidad: cada imagen debe ser un JPG del tamaño del lienzo. */
export async function validarImagenes(buffers) {
  if (!buffers?.length) throw new Error('El formato no produjo imágenes.')
  for (const b of buffers) {
    const meta = await sharp(b).metadata()
    if (meta.width !== LIENZO.ancho || meta.height !== LIENZO.alto) throw new Error(`Tamaño inesperado ${meta.width}×${meta.height}.`)
  }
  return buffers
}

export async function leerArticuloCompleto(slug, transporte = fetch, sitio = 'co') {
  const r = await transporte(`${SITIO}/api/articulos/${encodeURIComponent(slug)}${sitio && sitio !== 'co' ? `?sitio=${sitio}` : ''}`, { signal: AbortSignal.timeout(30_000) })
  if (!r.ok) throw new Error(`No se pudo leer la nota (HTTP ${r.status}).`)
  return r.json()
}

export async function generarImagenes(formato, articulo, { carpeta = join(tmpdir(), 'pont3la10-redes', 'formatos') } = {}) {
  const titular = String(articulo.tituloPortada || articulo.titulo || '').trim()
  const url = articulo.portada?.url
  if (!titular || !url) throw new Error('La nota no tiene titular o portada.')
  await mkdir(carpeta, { recursive: true })
  const original = Buffer.from(await (await fetch(url, { signal: AbortSignal.timeout(30_000) })).arrayBuffer())
  // Sin recorte del jugador ni fondo desenfocado: la foto se ve completa (decisión del responsable, 2026-11-22).
  const recorte = null
  const palabra = palabraDeImpacto(titular)
  let salida
  if (formato === 'impacto') salida = [await componerImpacto({ recorte, original, palabra, subtitulo: titular, logo: LOGO })]
  else if (formato === 'impacto-desenfocado') salida = [await componerImpactoDesenfocado({ original, recorte, palabra, subtitulo: titular, logo: LOGO })]
  else if (formato === 'banda') salida = [await componerBanda({ original, titular: corto(titular, 60), subtitulo: String(articulo.resumen || titular), logo: LOGO })]
  else if (formato === 'cita') {
    const cita = citaDeNota(articulo)
    if (!cita) throw new Error('La nota no trae cita.')
    salida = [await componerCita({ original, cita, autor: articulo.fuente?.nombre || '', logo: LOGO })]
  } else if (formato === 'ficha') {
    const c = cifraDeNota(`${titular} ${articulo.resumen || ''}`)
    if (!c) throw new Error('La nota no trae cifra.')
    salida = [await componerFicha({ original, nombre: 'Pont3la10', concepto: c.concepto, cifra: c.cifra, logo: LOGO })]
  } else if (formato === 'carrusel') {
    const puntos = puntosDeNota(articulo)
    if (puntos.length < 3) throw new Error('La nota no tiene tres puntos.')
    salida = await componerCarrusel({ original, recorte, palabra, subtitulo: titular, puntos, pregunta: '¿Qué opinas de esta noticia?', logo: LOGO })
  } else throw new Error(`Formato sin generador: ${formato}.`)
  // Todas las imágenes llevan la dirección del sitio al pie.
  return validarImagenes(await Promise.all(salida.map(conSitio)))
}
