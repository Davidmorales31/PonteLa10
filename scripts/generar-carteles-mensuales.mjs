import { existsSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const argumentos = new Map(process.argv.slice(2).map((argumento) => {
  const separador = argumento.indexOf('=')
  return separador > 0 ? [argumento.slice(0, separador), argumento.slice(separador + 1)] : [argumento, 'true']
}))
const mes = argumentos.get('--mes') || mesActualBogota()
const baseUrl = resolverBase(argumentos.get('--base') || 'https://www.pont3la10.com')
const forzar = argumentos.has('--forzar')
const limiteMensual = 80

if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes)) {
  throw new Error('El mes debe tener el formato AAAA-MM, por ejemplo 2026-10.')
}

const calendarioUrl = new URL('/api/liga-colombiana', baseUrl)
calendarioUrl.searchParams.set('mes', mes)
const respuestaCalendario = await fetch(calendarioUrl, { signal: AbortSignal.timeout(45_000) })
if (!respuestaCalendario.ok) throw new Error(`No se pudo consultar el calendario: HTTP ${respuestaCalendario.status}.`)

const calendario = await respuestaCalendario.json()
const partidos = Array.isArray(calendario?.partidos) ? calendario.partidos : []
const partidosValidos = partidos.filter(partido =>
  typeof partido?.slug === 'string'
  && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(partido.slug)
  && typeof partido?.fechaIso === 'string'
  && mesDeFechaBogota(partido.fechaIso) === mes)
  .sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso))
  .slice(0, limiteMensual)

if (!partidosValidos.length) {
  throw new Error(`El calendario público no tiene partidos verificables para ${mes}; no se generaron archivos.`)
}

const directorio = resolve('public', 'partidos', mes)
await mkdir(directorio, { recursive: true })
let generadas = 0
let reutilizadas = 0
let cursor = 0
const errores = []

await Promise.all(Array.from({ length: Math.min(4, partidosValidos.length) }, async () => {
  while (cursor < partidosValidos.length) {
    const indice = cursor++
    const partido = partidosValidos[indice]
    const destino = resolve(directorio, `${partido.slug}.webp`)
    if (existsSync(destino) && !forzar) {
      reutilizadas += 1
      continue
    }

    try {
      const imagenUrl = new URL(`/api/partidos-seo/${encodeURIComponent(partido.slug)}/imagen?formato=wide`, baseUrl)
      const respuestaImagen = await fetch(imagenUrl, { signal: AbortSignal.timeout(60_000) })
      if (!respuestaImagen.ok || !respuestaImagen.headers.get('content-type')?.includes('image/png')) {
        throw new Error(`El cartel no devolvió un PNG válido (HTTP ${respuestaImagen.status}).`)
      }
      const png = Buffer.from(await respuestaImagen.arrayBuffer())
      if (png.length < 10_000 || png.length > 15_000_000) throw new Error('El tamaño del cartel está fuera de límites.')
      const webp = await sharp(png).webp({ quality: 84, effort: 4, smartSubsample: true }).toBuffer()
      const temporal = `${destino}.tmp`
      await writeFile(temporal, webp)
      await rename(temporal, destino)
      generadas += 1
    } catch (error) {
      errores.push(`${partido.slug}: ${error instanceof Error ? error.message : 'fallo desconocido'}`)
    }
  }
}))

const manifiesto = {
  mes,
  generadoEn: new Date().toISOString(),
  origenCalendario: calendarioUrl.toString(),
  partidosEncontrados: partidosValidos.length,
  limiteMensual,
  imagenesGeneradas: generadas,
  imagenesReutilizadas: reutilizadas,
  imagenesFallidas: errores.length,
  carteles: partidosValidos.map(partido => ({
    slug: partido.slug,
    fechaIso: partido.fechaIso,
    competencia: partido.competencia,
    url: `/partidos/${mes}/${partido.slug}.webp`
  }))
}
await writeFile(resolve(directorio, 'manifest.json'), `${JSON.stringify(manifiesto, null, 2)}\n`, 'utf8')

console.log(`Carteles de ${mes}: ${generadas} generados, ${reutilizadas} reutilizados, ${errores.length} fallidos.`)
if (errores.length) {
  console.error(errores.join('\n'))
  process.exitCode = 1
}

function resolverBase(valor) {
  const url = new URL(valor)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('La base debe ser una URL HTTP(S) sin credenciales ni parámetros.')
  }
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('HTTP solo se permite para un servidor local.')
  }
  return url
}

function mesActualBogota() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit'
  }).format(new Date())
}

function mesDeFechaBogota(fechaIso) {
  const fecha = new Date(fechaIso)
  if (Number.isNaN(fecha.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit'
  }).format(fecha)
}
