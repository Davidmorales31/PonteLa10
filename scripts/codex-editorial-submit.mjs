import { createHmac, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [recurso, archivo] = process.argv.slice(2)
const rutas = {
  contexto: '/api/internal/codex/context',
  agenda: '/api/internal/codex/agenda',
  media: '/api/internal/codex/media',
  propuesta: '/api/internal/codex/proposals',
  salud: '/api/internal/codex/health'
}

function terminar(mensaje, codigo = 1) {
  process.stderr.write(`${mensaje}\n`)
  process.exit(codigo)
}

if (!rutas[recurso] || !archivo) {
  terminar('Uso: node scripts/codex-editorial-submit.mjs <contexto|agenda|media|propuesta|salud> <archivo-json>')
}

const baseUrl = process.env.PONT3LA10_CODEX_API_BASE_URL
const secreto = process.env.NUXT_CODEX_EDITORIAL_API_SECRET
if (!baseUrl || !secreto) {
  terminar('Falta configuración local de la API privada editorial.')
}

let destino
try {
  destino = new URL(rutas[recurso], baseUrl)
} catch {
  terminar('La URL base de la API privada no es válida.')
}

if ((destino.protocol !== 'https:'
  && !['localhost', '127.0.0.1'].includes(destino.hostname))
  || !['pont3la10.com', 'www.pont3la10.com', 'localhost', '127.0.0.1'].includes(destino.hostname)) {
  terminar('La API privada debe usar HTTPS fuera de localhost.')
}

let cuerpo
try {
  cuerpo = await readFile(resolve(process.cwd(), archivo))
} catch {
  terminar('No se pudo leer el archivo JSON indicado.')
}

const limite = recurso === 'media' ? 3_500_000 : 1_000_000
if (cuerpo.byteLength > limite) {
  terminar(`El archivo supera el límite de ${limite} bytes.`)
}

const timestamp = String(Math.floor(Date.now() / 1000))
const requestId = randomUUID()
const firma = createHmac('sha256', secreto)
  .update(`${timestamp}.POST.${destino.pathname}.${requestId}.`)
  .update(cuerpo)
  .digest('hex')

let respuesta
try {
  respuesta = await fetch(destino, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-pont3la10-timestamp': timestamp,
      'x-pont3la10-request-id': requestId,
      'x-pont3la10-signature': firma
    },
    body: cuerpo,
    signal: AbortSignal.timeout(45_000)
  })
} catch {
  terminar('La API privada no respondió; conserva la misma clave de idempotencia para reintentar.')
}

let resultado
try {
  resultado = await respuesta.json()
} catch {
  terminar(`La API privada respondió HTTP ${respuesta.status} sin JSON válido.`)
}

if (!respuesta.ok) {
  const codigo = typeof resultado?.data?.codigo === 'string'
    ? ` (${resultado.data.codigo})`
    : ''
  terminar(`La API privada rechazó la solicitud: HTTP ${respuesta.status}${codigo}.`)
}

if (recurso === 'media') {
  process.stdout.write(JSON.stringify({
    mediaId: resultado.mediaId,
    hash: resultado.hash,
    dimensiones: resultado.dimensiones,
    bytes: resultado.bytes,
    yaExistia: resultado.yaExistia
  }) + '\n')
} else if (recurso === 'propuesta') {
  process.stdout.write(JSON.stringify({
    articleId: resultado.articleId,
    estado: resultado.estado,
    duplicado: resultado.duplicado
  }) + '\n')
} else {
  process.stdout.write(JSON.stringify(resultado) + '\n')
}
