// Gráficos PNG para los motion graphics del pack: genera el encargo para Codex y revisa lo que entrega.
// Todo sale de un solo catálogo (config/graficosCodex.json), así el encargo y la revisión nunca se desalinean.
//
// Uso:
//   node scripts/graficos-codex.mjs --encargo [--prioridad 1]   escribe docs/agents/prompts/encargo-graficos-codex.md
//   node scripts/graficos-codex.mjs --revisar [--json]           revisa cada PNG entregado (tamaño, transparencia, magenta, peso)
//   node scripts/graficos-codex.mjs --contacto                   hoja de contactos en videos/pack-pont3la10/assets/graficos/contacto.jpg
import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const RAIZ = resolve(import.meta.dirname, '..')
const CATEGORIAS = ['overlays', 'marcos', 'anotaciones', 'sellos', 'iconos', 'texturas']
const TITULOS = {
  overlays: 'Overlays (capas que van encima de fotos y video)',
  marcos: 'Marcos, papeles y cintas',
  anotaciones: 'Anotaciones dibujadas a mano',
  sellos: 'Sellos de tinta (interior vacío)',
  iconos: 'Iconos y objetos',
  texturas: 'Texturas y fondos'
}

export async function cargarCatalogo() {
  return JSON.parse(await readFile(join(RAIZ, 'config', 'graficosCodex.json'), 'utf8'))
}

export const rutaRelativa = (catalogo, recurso) => `${catalogo.carpeta}/${recurso.categoria}/${recurso.id}.png`

/** Errores del catálogo (ids repetidos, medidas, categorías o prioridades inválidas). Vacío = bien. */
export function validarCatalogo(catalogo) {
  const errores = []
  const ids = new Set()
  for (const r of catalogo?.recursos || []) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.id || '')) errores.push(`Id inválido: «${r.id}».`)
    if (ids.has(r.id)) errores.push(`Id repetido: ${r.id}.`)
    ids.add(r.id)
    if (!CATEGORIAS.includes(r.categoria)) errores.push(`${r.id}: categoría desconocida «${r.categoria}».`)
    if (!(r.ancho > 0 && r.alto > 0 && r.ancho <= 4000 && r.alto <= 4000)) errores.push(`${r.id}: medidas inválidas.`)
    if (![1, 2].includes(r.prioridad)) errores.push(`${r.id}: la prioridad debe ser 1 o 2.`)
    if (!String(r.descripcion || '').trim()) errores.push(`${r.id}: falta la descripción.`)
    if (!Array.isArray(r.escenas) || !r.escenas.length) errores.push(`${r.id}: indica al menos una escena que lo use.`)
  }
  return errores
}

const tablaDe = (recursos, catalogo) => [
  '| Archivo | Tamaño (px) | Qué dibujar | Lo usan |',
  '| --- | --- | --- | --- |',
  ...recursos.map(r => `| \`${rutaRelativa(catalogo, r).replace(`${catalogo.carpeta}/`, '')}\` | ${r.ancho}×${r.alto}${r.opaco ? ' (opaco)' : ''} | ${r.descripcion.replace(/\|/g, '/')} | ${r.escenas.join(', ')} |`)
].join('\n')

/** Encargo completo para Codex, en español, con todas las reglas y la lista de recursos. */
export function generarEncargo(catalogo, { prioridad = 2 } = {}) {
  const e = catalogo.estilo
  const recursos = catalogo.recursos.filter(r => r.prioridad <= prioridad)
  const secciones = CATEGORIAS.map(cat => {
    const lista = recursos.filter(r => r.categoria === cat)
    return lista.length ? `### ${TITULOS[cat]}\n\n${tablaDe(lista, catalogo)}` : ''
  }).filter(Boolean).join('\n\n')
  const p1 = recursos.filter(r => r.prioridad === 1).length
  return `# Encargo para Codex: gráficos PNG de los motion graphics de Ponte la 10

> Generado por \`node scripts/graficos-codex.mjs --encargo\` desde \`config/graficosCodex.json\`. No lo edites a mano: cambia el catálogo y vuelve a generarlo.

## Qué necesito

Los videos de Ponte la 10 (noticias y documentales de fútbol) se animan con código: HTML y GSAP. Quiero reemplazar los
elementos dibujados con código por **gráficos PNG hechos por ti**, que yo animaré (entrada, salida, zoom, rotación, flotar,
paralaje, brillo) en tres formatos: video diario 16:9 (1920×1080), Reels y Shorts 9:16 (1080×1920) y documental 16:9.

Son **${recursos.length} gráficos** (${p1} de prioridad 1 y ${recursos.length - p1} de prioridad 2). Empieza por los de prioridad 1.

## Reglas duras (no se negocian)

1. **Solo elementos gráficos y abstractos.** Nada de personas, caras, manos reales, multitudes, jugadas, estadios ni escenas.
   Los gráficos de este encargo son decoración y nunca sustituyen una foto de noticia (el pack exige fotos reales para eso).
2. **Cero texto dentro de las imágenes:** ni letras, ni números, ni palabras de relleno. El texto lo escribo yo encima
   (cambia en cada video). Las únicas excepciones son los símbolos «?», «!», «$» y las comillas, cuando el recurso los pide.
3. **Sin marcas ni derechos de terceros:** ningún escudo de club, logo de liga, televisora, patrocinador, fabricante o red
   social; ninguna bandera; ningún trofeo, balón, camiseta ni estadio que copie un diseño real (copa del Mundo, Champions, etc.).
4. **Sin magenta, fucsia ni rosa intenso** en ningún píxel visible. ${e.prohibidoMagenta}
5. **Ante la duda, lo más simple:** si una descripción deja un detalle abierto, elige la opción más limpia y anótalo en tu reporte final.
6. No hagas commit ni push, no toques ningún otro archivo del repositorio y no borres nada.

## Estilo

- **Paleta de marca:** azul marino \`${e.colores.azulMarino}\`, amarillo \`${e.colores.amarillo}\`, blanco \`${e.colores.blanco}\`; de apoyo,
  rojo alarma \`${e.colores.rojoAlarma}\`, verde \`${e.colores.verde}\` y cian \`${e.colores.cian}\`. Si un recurso pide un color, úsalo exacto.
- **Estética:** deportiva y editorial de noticiero: formas limpias y de buen tamaño, contornos gruesos, brillos y sombras
  cortas suaves. Las anotaciones y sellos son «hechos a mano» (trazo de marcador, tinta desgastada), no vectores perfectos.
- **Legible en pequeño:** cada gráfico debe entenderse a un tercio de su tamaño. Evita detalles finos que se pierdan.
- **Consistencia:** todos deben parecer de la misma familia (mismo grosor de contorno, mismo tipo de sombra y de brillo).
- **Bordes limpios:** sin halos blancos ni verdes alrededor del contorno; borde suavizado (antialias) sobre transparencia real.

## Transparencia (lo más importante)

- Entrega **PNG RGBA con canal alfa real**. Lo «transparente» debe tener alfa 0; **nunca pintes el cuadriculado gris y blanco**
  de los editores ni un fondo blanco o negro.
- Si tu generador de imágenes puede hacer fondo transparente, úsalo. Si no, genera el recurso sobre un **verde croma puro
  \`#00FF00\`** (que no aparezca en el diseño) y quita ese fondo con un script (por ejemplo Pillow o \`ffmpeg colorkey\`),
  limpiando el borde para que no queden halos verdes. Comprueba el resultado sobre un fondo azul oscuro.
- **Excepción:** los dos fondos \`fondo-azul-textura-*\` van opacos a propósito. Los **sellos** y el **marco polaroid** llevan
  el interior vacío y transparente.
- Los overlays de grano, viñeta, partículas y similares usan transparencia gradual (alfa parcial); es lo esperado.

## Entrega

- **Carpeta:** \`${catalogo.carpeta}/<categoría>/<id>.png\` (la ruta exacta de cada uno está en las tablas de abajo).
- **Tamaño exacto** en píxeles, como dice la tabla. Si tu generador entrega otro tamaño, reescala sin deformar y deja
  transparente el sobrante; no recortes el dibujo.
- **Peso:** menos de ${e.tamanoMaximoKB} KB por archivo (optimiza el PNG si hace falta).
- **Nombres:** exactamente el \`id\` de la tabla, en minúsculas y con guiones.
- **No dejes subcarpetas ni archivos extra** (ni variantes, ni previsualizaciones) en esa carpeta.

## Verifica antes de terminar

Cuando termines (o cada vez que entregues una tanda), ejecuta desde la raíz del repositorio:

\`\`\`bash
node scripts/graficos-codex.mjs --revisar
\`\`\`

Corrige todo lo que marque en **rojo (error)** y revisa los avisos. Reporta al final: cuántos archivos entregaste, cuáles
faltan y por qué, y cuáles quedaron con aviso. También puedes pedir una hoja de contactos con \`--contacto\`.

## Lista de gráficos

${secciones}
`
}

/**
 * Evalúa las medidas de una imagen entregada. `datos`: { ancho, alto, tieneAlfa, pesoKB, transparente (0–1), magenta (0–1) }.
 * Devuelve { errores, avisos }: los errores se corrigen antes de usarla; los avisos los arreglo yo al integrarla.
 */
export function evaluarImagen(datos, recurso, estilo) {
  const errores = []
  const avisos = []
  const opaco = Boolean(recurso.opaco)
  if (!opaco && !datos.tieneAlfa) errores.push('no tiene canal alfa (transparencia)')
  if (!opaco && datos.tieneAlfa && datos.transparente < (estilo.transparenciaMinima ?? 0.02)) errores.push(`casi no tiene transparencia (${(datos.transparente * 100).toFixed(1)} %): ¿fondo pintado o cuadriculado horneado?`)
  if (opaco && datos.tieneAlfa && datos.transparente > 0.05) avisos.push(`debía ser opaco y tiene ${(datos.transparente * 100).toFixed(0)} % transparente`)
  const esperado = recurso.ancho / recurso.alto
  const real = datos.ancho / datos.alto
  if (Math.abs(real / esperado - 1) > 0.04) errores.push(`proporción distinta: ${datos.ancho}×${datos.alto} (se pedía ${recurso.ancho}×${recurso.alto})`)
  else if (datos.ancho !== recurso.ancho || datos.alto !== recurso.alto) avisos.push(`tamaño ${datos.ancho}×${datos.alto} en vez de ${recurso.ancho}×${recurso.alto}`)
  if (datos.pesoKB > estilo.tamanoMaximoKB) errores.push(`pesa ${Math.round(datos.pesoKB)} KB (máximo ${estilo.tamanoMaximoKB})`)
  if (datos.magenta > 0.0005) errores.push(`tiene magenta o rosa fuerte (${(datos.magenta * 100).toFixed(2)} % de los píxeles): choca con la llave de color del documental`)
  return { errores, avisos }
}

/** Mide un PNG con sharp: tamaño, canal alfa, fracción transparente y fracción de píxeles magenta o rosa fuerte. */
export async function analizarArchivo(ruta) {
  const { default: sharp } = await import('sharp')
  const info = await stat(ruta)
  const meta = await sharp(ruta).metadata()
  const { data, info: crudo } = await sharp(ruta).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparentes = 0
  let magenta = 0
  const total = crudo.width * crudo.height
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a <= 8) { transparentes++; continue }
    if (a > 40 && data[i] > 200 && data[i + 2] > 170 && data[i + 1] < 110) magenta++
  }
  return { ancho: meta.width, alto: meta.height, tieneAlfa: Boolean(meta.hasAlpha), pesoKB: info.size / 1024, transparente: transparentes / total, magenta: magenta / total }
}

/** Revisa todo el catálogo contra los archivos entregados. */
export async function revisar(catalogo, { raiz = RAIZ, analizar = analizarArchivo } = {}) {
  const filas = []
  for (const recurso of catalogo.recursos) {
    const ruta = join(raiz, rutaRelativa(catalogo, recurso))
    if (!existsSync(ruta)) { filas.push({ recurso, estado: 'falta' }); continue }
    try {
      const datos = await analizar(ruta)
      const { errores, avisos } = evaluarImagen(datos, recurso, catalogo.estilo)
      filas.push({ recurso, estado: errores.length ? 'error' : avisos.length ? 'aviso' : 'ok', errores, avisos, datos })
    } catch (error) {
      filas.push({ recurso, estado: 'error', errores: [`no se pudo leer: ${error.message}`], avisos: [] })
    }
  }
  return filas
}

export function resumen(filas) {
  const cuenta = estado => filas.filter(f => f.estado === estado).length
  const p1 = filas.filter(f => f.recurso.prioridad === 1)
  return {
    total: filas.length, ok: cuenta('ok'), aviso: cuenta('aviso'), error: cuenta('error'), falta: cuenta('falta'),
    prioridad1: { total: p1.length, entregados: p1.filter(f => f.estado !== 'falta').length, listos: p1.filter(f => ['ok', 'aviso'].includes(f.estado)).length }
  }
}

async function hojaDeContactos(catalogo) {
  const { default: sharp } = await import('sharp')
  const celda = 240
  const columnas = 8
  const existentes = catalogo.recursos.map(recurso => ({ recurso, ruta: join(RAIZ, rutaRelativa(catalogo, recurso)) })).filter(x => existsSync(x.ruta))
  if (!existentes.length) throw new Error('No hay ningún PNG entregado todavía.')
  const filas = Math.ceil(existentes.length / columnas)
  const capas = []
  for (const [i, { ruta }] of existentes.entries()) {
    const miniatura = await sharp(ruta).resize(celda - 16, celda - 16, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    capas.push({ input: miniatura, left: (i % columnas) * celda + 8, top: Math.floor(i / columnas) * celda + 8 })
  }
  const salida = join(RAIZ, catalogo.carpeta, 'contacto.jpg')
  await mkdir(dirname(salida), { recursive: true })
  await sharp({ create: { width: columnas * celda, height: filas * celda, channels: 3, background: '#2b3b5c' } }).composite(capas).jpeg({ quality: 88 }).toFile(salida)
  process.stdout.write(`Hoja de contactos con ${existentes.length} gráficos (orden del catálogo, ${columnas} por fila): ${salida}\n`)
}

async function main() {
  const args = process.argv.slice(2)
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : null }
  const catalogo = await cargarCatalogo()
  const invalidos = validarCatalogo(catalogo)
  if (invalidos.length) { process.stderr.write(`Catálogo inválido:\n${invalidos.map(e => `  · ${e}`).join('\n')}\n`); process.exit(1) }
  if (args.includes('--encargo')) {
    const destino = join(RAIZ, 'docs', 'agents', 'prompts', 'encargo-graficos-codex.md')
    await writeFile(destino, generarEncargo(catalogo, { prioridad: Number(valor('--prioridad')) || 2 }))
    process.stdout.write(`Encargo escrito: ${destino}\n`)
    return
  }
  if (args.includes('--contacto')) { await hojaDeContactos(catalogo); return }
  if (args.includes('--revisar')) {
    const filas = await revisar(catalogo)
    if (args.includes('--json')) { process.stdout.write(`${JSON.stringify({ resumen: resumen(filas), filas: filas.map(f => ({ id: f.recurso.id, estado: f.estado, errores: f.errores, avisos: f.avisos })) }, null, 2)}\n`); return }
    for (const f of filas.filter(x => x.estado !== 'ok')) {
      const detalle = f.estado === 'falta' ? 'no entregado' : [...(f.errores || []), ...(f.avisos || [])].join('; ')
      process.stdout.write(`${f.estado.toUpperCase().padEnd(6)} P${f.recurso.prioridad} ${f.recurso.id.padEnd(30)} ${detalle}\n`)
    }
    const r = resumen(filas)
    process.stdout.write(`\n${r.ok} bien · ${r.aviso} con aviso · ${r.error} con error · ${r.falta} faltan de ${r.total}. Prioridad 1: ${r.prioridad1.listos} listos de ${r.prioridad1.total}.\n`)
    if (r.error) process.exitCode = 1
    return
  }
  process.stdout.write('Uso: node scripts/graficos-codex.mjs --encargo | --revisar [--json] | --contacto\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
