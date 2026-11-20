// Encargo de miniaturas para Codex: reúne las fotos reales del día (con su crédito), un fotograma de la cara
// de Juan tomado del gancho, el logo y las especificaciones, en videos/diario/<proyecto>/renders/miniaturas/.
// Codex diseña las 3 variantes; Juan las sube al estudio.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const ejecutar = promisify(execFile)
const RAIZ = fileURLToPath(new URL('..', import.meta.url))

/** Solo las tomas con video tienen un fotograma de la cara; en modo «Sin cámara» el gancho es solo audio (.m4a). */
export function esTomaConVideo(archivo) {
  return /\.(mp4|mov|webm|mkv)$/i.test(String(archivo || ''))
}

// Elige las fotos del encargo: la principal (primer bloque) y la de la segunda noticia, con su crédito.
export function fotosDelEncargo(guion, estudio = {}) {
  const fotos = []
  const vistas = new Set()
  for (const bloque of guion?.bloques || []) {
    const planos = [...(bloque.planos || []).filter(p => p?.imagen).map(p => ({ url: p.imagen, credito: p.credito || '' })), ...((estudio.fotosExtra || {})[bloque.id] || []).map(f => ({ url: f.ruta, credito: f.credito || '' }))]
    const primera = planos.find(p => !vistas.has(p.url))
    if (!primera) continue
    vistas.add(primera.url)
    fotos.push({ bloque: bloque.id, club: bloque.club || '', titular: bloque.titular || '', ...primera })
    if (fotos.length >= 3) break
  }
  return fotos
}

export function textoEncargo({ guion, fotos, conCara, carpeta }) {
  const titulos = (guion.titulos?.length ? guion.titulos : [guion.tituloVideo]).filter(Boolean)
  const miniatura = guion.miniatura || {}
  const lineaFotos = fotos.map((f, i) => `- insumos/foto-${i + 1}.jpg — ${f.club || f.bloque}${f.titular ? ` — Noticia: «${f.titular}»` : ''} — Crédito: ${f.credito || 'sin crédito'}`).join('\n')
  return `# Encargo de miniaturas — video diario de Pont3la10 (${guion.fecha})

Hola, Codex. Necesito **3 miniaturas de YouTube** para la prueba A/B del video de hoy.

## Entregables
- 3 imágenes **1280×720 (16:9)**, JPG, de menos de 2 MB cada una.
- Guárdalas en esta misma carpeta con estos nombres: \`miniatura-a.jpg\`, \`miniatura-b.jpg\`, \`miniatura-c.jpg\`.
- Carpeta: \`${carpeta}\`

## Títulos que se van a probar
${titulos.map((t, i) => `${i + 1}. ${t}`).join('\n')}

## Texto de la miniatura
- **${miniatura.texto || '(define 2 a 5 palabras que sumen al título, sin repetirlo)'}**${miniatura.resaltar ? ` — resalta en amarillo la palabra **${miniatura.resaltar}**` : ''}.
- De 2 a 5 palabras, en mayúsculas, letra gruesa condensada, con borde oscuro para que se lea en el celular.

## Cómo diseñarlas
Sigue el skill \`.agents/skills/pont3la10-miniaturas-codex/SKILL.md\`: sus medidas salen de las 20 últimas miniaturas de La Gambeta y de Cracks (\`docs/METRICAS_MINIATURAS_COMPETENCIA.md\`).

## Variantes
- **A — Doble panel con dos titulares:** \`insumos/foto-1.jpg\` y \`insumos/foto-2.jpg\` en dos paneles 50/50 con línea blanca; el titular de cada panel es la noticia de su foto (la de la lista de fotos de abajo), recortada a 3–7 palabras en dos líneas (blanca y amarilla), en el tercio inferior.
- **B — Collage de protagonistas:** de 2 a 4 caras grandes recortadas y solapadas, 1 a 3 círculos con borde blanco (entrenador, rival, periodista) y, si el video habla de un marcador o una cifra, la cifra en texto grande. Casi sin titular.
- **C — Protagonista y cara de Juan:** ${conCara ? 'usa `insumos/cara.jpg` (fotograma real de Juan) a la derecha, grande y con expresión clara, y el protagonista de `insumos/foto-1.jpg` a la izquierda, con el texto de miniatura abajo.' : 'no hay toma de cara todavía: repite la receta A con otras dos noticias (fotos 2 y 3).'}

## Antes de entregar
Ejecuta \`node scripts/video-medir-miniatura.mjs miniatura-a.jpg miniatura-b.jpg miniatura-c.jpg\` en esta carpeta; si dice REVISAR, corrige lo que indica y repite.

## Identidad
- Azul marino \`#08204a\`, amarillo \`#ffd800\`, blanco. Logo: \`insumos/logo-blanco.png\`, pequeño, en una esquina.
- Colores saturados, brillo medio y la imagen bien llena (sin fondos lisos grandes); nada de texto pequeño.

## Fotos (reales, con crédito)
${lineaFotos}

## Reglas (obligatorias)
1. **Solo fotos reales** de esta carpeta. Puedes recortar, ajustar color, desenfocar el fondo y componer, pero **no generes ni inventes personas, caras, escenas, escudos ni jugadas**, y no cambies lo que pasó en la foto.
2. No pongas en la miniatura algo que el video no cuenta (nada de engaños).
3. No uses logos de clubes, marcas ni televisoras; solo el logo de Pont3la10.
4. Los créditos de las fotos van en la descripción del video (ya están preparados); no hace falta ponerlos en la imagen.
`
}

export async function crearEncargo(carpeta) {
  const guion = JSON.parse(await readFile(join(carpeta, 'guion.json'), 'utf8'))
  const estudio = existsSync(join(carpeta, 'estudio.json')) ? JSON.parse(await readFile(join(carpeta, 'estudio.json'), 'utf8')) : {}
  const destino = join(carpeta, 'renders', 'miniaturas')
  const insumos = join(destino, 'insumos')
  await mkdir(insumos, { recursive: true })
  const fotos = fotosDelEncargo(guion, estudio)
  // Las fotos ya están descargadas en el proyecto (assets/fotos): se copian como insumos.
  for (const [i, foto] of fotos.entries()) {
    const local = String(foto.url).startsWith('assets/') ? join(carpeta, foto.url) : null
    const salida = join(insumos, `foto-${i + 1}.jpg`)
    if (local && existsSync(local)) await copyFile(local, salida)
    else {
      const indice = [...new Set((guion.bloques || []).flatMap(b => (b.planos || []).map(p => p?.imagen).filter(Boolean)))].indexOf(foto.url)
      const descargada = join(carpeta, 'assets', 'fotos', `foto-${indice + 1}.jpg`)
      if (indice >= 0 && existsSync(descargada)) await copyFile(descargada, salida)
    }
  }
  const logo = join(carpeta, 'assets', 'logo-blanco.png')
  if (existsSync(logo)) await copyFile(logo, join(insumos, 'logo-blanco.png'))
  // Fotograma de la cara: mitad de la toma del gancho, si ya está grabada.
  const gancho = estudio.grabaciones?.gancho?.archivo
  let conCara = false
  if (gancho && esTomaConVideo(gancho) && existsSync(join(carpeta, gancho))) {
    const duracion = Number(estudio.grabaciones.gancho.duracion) || 2
    try {
      await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(Math.max(0.5, duracion / 2)), '-i', join(carpeta, gancho), '-frames:v', '1', '-q:v', '2', join(insumos, 'cara.jpg')])
    } catch {
      // Sin fotograma el encargo sigue: Codex trabaja con las fotos reales, sin la cara.
    }
    conCara = existsSync(join(insumos, 'cara.jpg'))
  }
  const texto = textoEncargo({ guion, fotos, conCara, carpeta: destino })
  await writeFile(join(destino, 'ENCARGO-CODEX.md'), texto)
  return { carpeta: destino, texto, fotos: fotos.length, conCara }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const entrada = process.argv[2]
  if (!entrada) { process.stderr.write('Uso: node scripts/video-encargo-miniaturas.mjs <proyecto|carpeta>\n'); process.exit(2) }
  const carpeta = entrada.includes('/') || entrada.includes('\\') ? resolve(entrada) : join(RAIZ, 'videos', 'diario', entrada)
  const r = await crearEncargo(carpeta)
  process.stdout.write(`Encargo en ${r.carpeta}\\ENCARGO-CODEX.md (${r.fotos} fotos${r.conCara ? ', con cara' : ', sin cara'})\n`)
}
