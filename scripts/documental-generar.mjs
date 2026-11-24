// Generador del documental de los viernes (fase 3 de docs/PLAN_DOCUMENTAL_SEMANAL.md): convierte el guion.json del
// documental y las tomas de voz grabadas en el estudio en un proyecto de HyperFrames 16:9 armado con el pack
// videos/pack-pont3la10 (escenas doc-* más galeria, clip, rotulo, suscribete y cierre).
// Uso:
//   node scripts/documental-generar.mjs <carpeta del proyecto | guion.json> [--salida <dir>] [--sin-red]
// Sin --salida usa videos/diario/<fecha>-documental-<tema>/ (el proyecto que crea documental-proyecto.mjs).
// Reglas: voz continua por capítulo; mitad fotos y mitad video o animación; ninguna foto más de 3 veces; cada foto y
// clip lleva su crédito; tarjeta por acto y música por acto; capítulos de YouTube con los tiempos reales.
// La historia la cuenta el narrador: un video de alguien hablando a cámara (visual con «entrevista»: true) nunca rellena
// tiempo. Esa persona solo aparece en «testimonio»: 2 o 3 citas cortas con su voz real y subtítulo, entre capítulos.
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { armarIndex, instanciarEscena, IMAGEN_VACIA, textoTeleprompter } from './video-generar-proyecto.mjs'
import { nombreProyecto } from './documental-proyecto.mjs'
import { anillosDeTopologia, caminoTierra, planMapa } from './documental-mapa.mjs'
import { marcaTiempo } from './video-descripcion.mjs'

const ejecutar = promisify(execFile)
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const PACK = join(RAIZ, 'videos', 'pack-pont3la10')
const AGENTE = 'Pont3la10-documental/1.0 (https://www.pont3la10.com)'
const PNG_VACIO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

export const TIEMPOS = { tarjetaActo: 3, tarjetaTitulo: 4, cierre: 6, suscribete: 4.5, rotulo: 5, toma: 6.5, minimoToma: 1.5, minimoAnimacion: 3 }
export const MAXIMO_USOS_FOTO = 3
export const MAXIMO_TESTIMONIOS = 3
export const TESTIMONIO_MAXIMO_SEGUNDOS = 12
export const PRESTAMO_MAXIMO_CLIP = 15
export const ANIMACIONES = { mapa: 'doc-mapa', 'linea-tiempo': 'doc-linea', ficha: 'doc-ficha', titular: 'doc-titular', cita: 'doc-cita', contador: 'doc-contador' }
const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
const PICO = { 'whoosh-a': 0.162, 'whoosh-b': 0.197, pop: 0.12, clic: 0.073 }
const DURACION_SONIDO = { 'whoosh-a': 0.575, 'whoosh-b': 0.701, pop: 0.72, clic: 0.366 }

const redondear = n => Math.round(n * 100) / 100
export const FPS = 30
// Los cortes caen siempre en un cuadro exacto: la composición con ffmpeg (componerDocumental) depende de ello.
export const aCuadro = n => Math.round(Math.round(n * FPS) / FPS * 10000) / 10000
const contar = texto => String(texto || '').trim().split(/\s+/).filter(Boolean).length

/** Clave de un medio del guion: la foto por su URL; el video por URL y punto de partida (dos tramos del mismo video son dos clips). */
export function claveMedio(visual) {
  if (visual?.tipo === 'foto') return visual.imagen ? `foto:${visual.imagen}` : ''
  if (visual?.tipo === 'video' || visual?.tipo === 'testimonio') return visual.video ? `video:${visual.video}#${Number(visual.desde) || 0}` : ''
  if (visual?.tipo === 'stock') return visual.busqueda ? `stock:${visual.busqueda}` : ''
  return ''
}

/** «0-0 · 7 ATAJADAS · DEBUT 2012 · VICECAPITÁN» → [{valor, etiqueta}] (máximo 4). */
export function itemsFicha(texto) {
  return String(texto || '').split('·').map(s => s.trim()).filter(Boolean).slice(0, 4).map(parte => {
    let m = /^(\d[\d.,]*)\s+(.+)$/.exec(parte)
    if (m) return { valor: m[1], etiqueta: m[2] }
    m = /^(\d[\d.,-]*)$/.exec(parte)
    if (m) return { valor: m[1], etiqueta: '' }
    m = /^(.+?)\s+(\d{4})$/.exec(parte)
    if (m) return { valor: m[2], etiqueta: m[1] }
    return { valor: '', etiqueta: parte }
  })
}

/** Segundos que pide cada animación (luego se recortan si el capítulo es corto). */
export function duracionAnimacion(visual) {
  switch (visual?.tipo) {
    case 'mapa': {
      const n = (visual.recorrido || visual.lugares || []).length
      return visual.recorrido ? 3 + 1.7 * n : 1.5 + 2.6 * n
    }
    case 'linea-tiempo': return 3 + 1.1 * (visual.hitos || []).length
    case 'ficha': return 3 + itemsFicha(visual.texto).length
    case 'titular': return visual.sello ? 6.5 : 5.5
    case 'cita': return Math.min(11, 5.5 + 0.3 * contar(visual.texto))
    case 'contador': return 6.5
    default: return 0
  }
}

/** Ordena los medios extra con el patrón clip, clip, foto (decisión del responsable: más video que fotos fijas). */
function patronExtra(medios) {
  const videos = medios.filter(m => m.tipo !== 'foto')
  const fotos = medios.filter(m => m.tipo === 'foto')
  const salida = []
  while (videos.length || fotos.length) {
    for (let k = 0; k < 2 && videos.length; k++) salida.push(videos.shift())
    if (fotos.length) salida.push(fotos.shift())
  }
  return salida
}

/**
 * Línea de tiempo completa del documental, sin tocar disco ni red.
 * - `medio(visual)` → { ruta, credito, licencia, disponible } o null (foto que no bajó, stock sin llave…).
 * - `mapa(visual)` → { mapa, tierra } o null.
 * Devuelve escenas, voz grabada, efectos, segmentos del estudio, capítulos de YouTube, tramos de música por acto,
 * los segundos que se usan de cada clip (para recortarlos) y el reparto fotos / video / animación.
 */
export function planificarDocumental(guion, { ppm = 160, estudio = {}, medio = () => null, mapa = () => null } = {}) {
  const escenas = []
  const sonidos = []
  const segmentos = []
  const grabadas = []
  const capitulos = []
  const tramosMusica = []
  const avisos = []
  const usosFoto = new Map()
  const usoClip = new Map()
  const reparto = { foto: 0, video: 0, animacion: 0, tarjeta: 0 }
  const grabaciones = estudio.grabaciones || {}
  const actos = Array.isArray(guion?.actos) ? guion.actos : []
  const protagonista = String(guion?.protagonista || '').trim()
  let t = 0

  const sonido = (archivo, momento, volumen = 0.6, extra = {}) => {
    sonidos.push({ archivo, inicio: redondear(Math.max(0, momento + 1 / 30 - (PICO[archivo] ?? 0))), duracion: DURACION_SONIDO[archivo] ?? 1.5, volumen, ...extra })
  }
  const recurso = visual => {
    const m = medio(visual)
    return m?.ruta ? { ...m, tipo: visual.tipo, clave: claveMedio(visual), visual } : null
  }
  // Foto de fondo (desenfocada) de las animaciones: la primera foto del capítulo o, si no hay, la última que se vio.
  let ultimoFondo = ''
  const fondoDe = visuales => {
    const foto = (visuales || []).filter(v => v.tipo === 'foto').map(recurso).find(Boolean)
    if (foto) ultimoFondo = foto.ruta
    return ultimoFondo
  }
  const tarjeta = (segundos, variables) => {
    const inicio = aCuadro(t)
    const duracion = aCuadro(aCuadro(t + segundos) - inicio)
    escenas.push({ escena: 'doc-acto', inicio, duracion, capa: 1, duracionInterna: duracion, variables: { ...variables, duracion } })
    reparto.tarjeta += duracion
    t = aCuadro(t + segundos)
  }
  const voz = (id, texto, etiqueta, bloque) => {
    const grabada = grabaciones[id]
    const duracion = grabada?.duracion > 0 ? redondear(grabada.duracion) : redondear(Math.max(2, contar(texto) / ppm * 60))
    if (grabada?.archivo) grabadas.push({ tipo: 'audio', id, archivo: grabada.archivo, inicio: t, duracion })
    segmentos.push({ id, tipo: 'voz', etiqueta, bloque, inicio: t, fin: redondear(t + duracion), texto: String(texto || '').trim(), grabado: Boolean(grabada?.archivo) })
    return duracion
  }

  const variablesAnimacion = (visual, fondo, duracion) => {
    switch (visual.tipo) {
      case 'mapa': {
        const m = mapa(visual)
        if (!m?.mapa) return null
        return { variables: { mapa: JSON.stringify(m.mapa), titulo: visual.titulo || (visual.recorrido ? 'SU RECORRIDO' : ''), duracion }, tierra: m.tierra || '' }
      }
      case 'linea-tiempo': return { variables: { hitos: JSON.stringify((visual.hitos || []).slice(0, 6)), titulo: visual.titulo || 'EL CAMINO', fondo, duracion } }
      case 'ficha': return { variables: { items: JSON.stringify(itemsFicha(visual.texto)), fondo, duracion } }
      case 'titular': return { variables: { texto: visual.texto || '', sello: visual.sello || '', etiqueta: visual.etiqueta || (visual.sello ? 'LO QUE CIRCULÓ EN REDES' : protagonista.toUpperCase()), duracion } }
      case 'cita': return { variables: { texto: visual.texto || '', autor: visual.autor || '', fondo, duracion } }
      case 'contador': return { variables: { hasta: Number(visual.hasta) || 0, texto: visual.texto || '', fuente: visual.fuente || '', fondo, duracion } }
      default: return null
    }
  }

  /** Cubre [inicio, inicio + D] con los visuales del capítulo. Devuelve las tomas en orden. */
  const rellenar = (visuales, inicio, D, etiqueta, prestamo = []) => {
    const fondo = fondoDe(visuales)
    const lista = visuales || []
    const animaciones = []
    const medios = []
    lista.forEach((visual, idx) => {
      if (ANIMACIONES[visual.tipo]) animaciones.push({ idx, visual, largo: duracionAnimacion(visual) })
      // Alguien hablando a cámara no rellena: la historia la cuenta el narrador (solo sale en «testimonio»).
      else if (visual.entrevista) return
      else if (['foto', 'video', 'stock'].includes(visual.tipo)) {
        const r = recurso(visual)
        if (r) medios.push({ ...r, idx })
        else if (visual.tipo !== 'stock') avisos.push(`${etiqueta}: no se pudo usar ${visual.tipo === 'foto' ? 'la foto' : 'el video'} ${visual.imagen || visual.video}.`)
      }
    })
    const disponible = m => m.tipo === 'foto' ? (usosFoto.get(m.clave) || 0) < MAXIMO_USOS_FOTO : (Number(m.disponible ?? Infinity) - (usoClip.get(m.clave) || 0)) >= TIEMPOS.minimoToma + 1
    // Si al capítulo no le alcanza su material, toma prestado de los capítulos más cercanos (clips con metraje sin
    // usar y fotos con usos libres), en ese orden, hasta cubrir lo que falta. Nunca estira una animación para tapar.
    const capacidad = m => m.tipo === 'foto' ? Math.max(0, MAXIMO_USOS_FOTO - (usosFoto.get(m.clave) || 0)) * TIEMPOS.toma : Math.max(0, Number(m.disponible ?? 600) - (usoClip.get(m.clave) || 0))
    const natural = animaciones.reduce((s, a) => s + a.largo, 0)
    let tengo = medios.reduce((s, m) => s + capacidad(m), 0)
    const vistas = new Set(medios.map(m => m.clave))
    for (const visual of prestamo) {
      if (tengo >= (D - natural) * 1.1) break
      if (visual.entrevista || !['foto', 'video'].includes(visual.tipo)) continue
      const original = recurso(visual)
      // Un clip prestado aporta como mucho 15 s por capítulo: así se reparte entre varias fuentes y ninguna domina.
      const r = original && original.tipo !== 'foto' ? { ...original, disponible: Math.min(Number(original.disponible ?? 600), (usoClip.get(original.clave) || 0) + PRESTAMO_MAXIMO_CLIP) } : original
      if (!r || vistas.has(r.clave) || capacidad(r) < TIEMPOS.minimoToma + 1) continue
      vistas.add(r.clave)
      medios.push({ ...r, idx: lista.length, prestado: true })
      tengo += capacidad(r)
    }
    // Las animaciones ocupan lo que piden, salvo que no quede al menos 45 % del capítulo para fotos y clips.
    let sumaAnimaciones = animaciones.reduce((s, a) => s + a.largo, 0)
    const conMedios = medios.some(disponible)
    const tope = conMedios ? D * 0.55 : D
    if (sumaAnimaciones > tope || (!conMedios && animaciones.length)) {
      const factor = tope / Math.max(0.01, sumaAnimaciones)
      animaciones.forEach(a => { a.largo = Math.max(TIEMPOS.minimoAnimacion, a.largo * factor) })
      sumaAnimaciones = animaciones.reduce((s, a) => s + a.largo, 0)
    }
    const resto = Math.max(0, D - sumaAnimaciones)
    // Tomas de foto o clip: primero cada medio una vez en el orden del guion; luego más tomas (clip, clip, foto)
    // hasta que cada una dure unos 6,5 s, sin pasar de 3 usos por foto ni del largo de cada clip.
    const deseadas = conMedios ? Math.max(1, Math.round(resto / TIEMPOS.toma)) : 0
    const nominal = deseadas ? resto / deseadas : 0
    const consumo = new Map()
    const usosTemporales = new Map()
    // En la primera pasada un clip corto entra aunque dure menos que la toma (las demás se alargan); en las
    // siguientes solo entra si le queda casi una toma entera.
    const puede = (m, primera = false) => m.tipo === 'foto'
      ? (usosFoto.get(m.clave) || 0) + (usosTemporales.get(m.clave) || 0) < MAXIMO_USOS_FOTO
      : Number(m.disponible ?? Infinity) - (usoClip.get(m.clave) || 0) - (consumo.get(m.clave) || 0) >= (primera ? TIEMPOS.minimoToma + 0.5 : Math.min(nominal, TIEMPOS.toma) * 0.8)
    const tomar = m => {
      if (m.tipo === 'foto') usosTemporales.set(m.clave, (usosTemporales.get(m.clave) || 0) + 1)
      else consumo.set(m.clave, (consumo.get(m.clave) || 0) + nominal)
      return { ...m }
    }
    const tomas = []
    for (const m of medios) if (tomas.length < deseadas && puede(m, true)) tomas.push(tomar(m))
    const extra = patronExtra(medios)
    let vueltas = 0
    while (tomas.length < deseadas && extra.length && vueltas < 50) {
      const candidato = extra.find(m => puede(m) && m.clave !== tomas.at(-1)?.clave) || extra.find(puede)
      if (!candidato) break
      tomas.push(tomar(candidato))
      extra.push(extra.splice(extra.indexOf(candidato), 1)[0])
      vueltas++
    }
    if (conMedios && !tomas.length) {
      // Todas las fotos ya salieron 3 veces y no hay clips: el tiempo pasa a las animaciones.
      avisos.push(`${etiqueta}: sin fotos ni clips disponibles; las animaciones cubren el capítulo.`)
    }
    // Largo de cada toma: un clip no dura más de lo que queda de él; lo que sobra pasa a las demás.
    // Reparto iterativo: lo que sobra va solo a tomas con margen (fotos o clips a los que aún les queda material).
    const largos = tomas.map(() => tomas.length ? resto / tomas.length : 0)
    let sobrante = 0
    for (let vuelta = 0; vuelta < 8; vuelta++) {
      const usado = new Map()
      const libres = []
      tomas.forEach((m, i) => {
        if (m.tipo === 'foto') { libres.push(i); return }
        const queda = Math.max(0, Number(m.disponible ?? Infinity) - (usoClip.get(m.clave) || 0) - (usado.get(m.clave) || 0))
        if (largos[i] > queda) { sobrante += largos[i] - queda; largos[i] = queda } else if (largos[i] < queda - 0.05) libres.push(i)
        usado.set(m.clave, (usado.get(m.clave) || 0) + largos[i])
      })
      if (sobrante < 0.01 || !libres.length) break
      libres.forEach(i => { largos[i] += sobrante / libres.length })
      sobrante = 0
    }
    if (sobrante >= 0.01 && animaciones.length) {
      for (const a of animaciones) {
        const margen = Math.max(0, Math.max(a.largo * 1.5, a.largo + 4) - a.largo)
        const extra = Math.min(margen, sobrante / animaciones.length)
        a.largo += extra
        a.sobrante = extra
      }
      sobrante -= animaciones.reduce((s, a) => s + (a.sobrante || 0), 0)
    }
    if (sobrante >= 0.01) {
      avisos.push(`${etiqueta}: faltan ${Math.round(sobrante)} s de material; la última toma se alarga.`)
      if (largos.length) largos[largos.length - 1] += sobrante
    }
    const items = tomas.map((m, i) => ({ ...m, largo: largos[i] })).filter(m => m.largo >= 0.5)
    const prestado = items.filter(m => m.prestado).reduce((s, m) => s + m.largo, 0)
    if (prestado >= 1) avisos.push(`${etiqueta}: le faltaba material; ${Math.round(prestado)} s son de otros capítulos (más fotos, clips o stock del tema lo arreglan).`)
    if (!items.length && !animaciones.length) {
      avisos.push(`${etiqueta}: el capítulo no tiene visuales; queda la tarjeta del acto de fondo.`)
      escenas.push({ escena: 'doc-acto', inicio: aCuadro(inicio), duracion: aCuadro(aCuadro(inicio + D) - aCuadro(inicio)), capa: 1, duracionInterna: aCuadro(aCuadro(inicio + D) - aCuadro(inicio)), variables: { kicker: '', titulo: protagonista.toUpperCase(), subtitulo: '', fondo, duracion: redondear(D) } })
      reparto.tarjeta += D
      return []
    }
    // Las animaciones entran en la posición relativa que tienen en la lista del guion.
    const total = items.length + animaciones.length
    const secuencia = [...items]
    animaciones.forEach(a => {
      const posicion = Math.min(secuencia.length, Math.round(a.idx / Math.max(1, lista.length) * total))
      secuencia.splice(posicion, 0, { animacion: true, ...a })
    })
    // El total exacto: el redondeo de cada toma se compensa en la última.
    const suma = secuencia.reduce((s, x) => s + x.largo, 0)
    if (secuencia.length) secuencia.at(-1).largo += D - suma
    let cursor = inicio
    const salida = []
    for (const item of secuencia) {
      const desde = aCuadro(cursor)
      const largo = aCuadro(aCuadro(cursor + item.largo) - desde)
      if (largo < 0.3) { cursor += item.largo; continue }
      if (item.animacion) {
        const datos = variablesAnimacion(item.visual, fondo, largo)
        if (datos) {
          escenas.push({ escena: ANIMACIONES[item.visual.tipo], inicio: desde, duracion: largo, capa: 1, duracionInterna: largo, variables: datos.variables, tierra: datos.tierra })
          reparto.animacion += largo
          salida.push({ inicio: desde, largo, tipo: 'animacion' })
          if (item.visual.tipo === 'titular' && item.visual.sello) sonido('impacto', desde + Math.min(largo * 0.45, 2.4) + 0.2, 0.55, { duracion: 1.5, mediaStart: 1.07 })
          else sonido('whoosh-b', desde, 0.35)
        } else {
          avisos.push(`${etiqueta}: el ${item.visual.tipo} no se pudo armar (revisa los lugares en config/lugaresDocumental.json).`)
          escenas.push({ escena: 'doc-acto', inicio: desde, duracion: largo, capa: 1, duracionInterna: largo, variables: { kicker: '', titulo: protagonista.toUpperCase(), subtitulo: '', fondo, duracion: largo } })
          reparto.tarjeta += largo
        }
      } else if (item.tipo === 'foto') {
        usosFoto.set(item.clave, (usosFoto.get(item.clave) || 0) + 1)
        escenas.push({ escena: 'galeria', inicio: desde, duracion: largo, capa: 1, duracionInterna: largo, variables: { cantidad: 1, segundosPorFoto: largo, foto1: item.ruta, credito1: item.credito ? `Foto: ${item.credito}` : '', foto2: '', credito2: '', foto3: '', credito3: '' } })
        reparto.foto += largo
        salida.push({ inicio: desde, largo, tipo: 'foto' })
      } else {
        const mediaInicio = redondear(usoClip.get(item.clave) || 0)
        usoClip.set(item.clave, mediaInicio + largo)
        const credito = item.credito ? `Video: ${item.credito}${item.licencia ? ` (${item.licencia})` : ''}` : ''
        // Render híbrido: HyperFrames solo dibuja el hueco (magenta) y el crédito; ffmpeg pone el clip debajo.
        escenas.push({ escena: 'doc-clip', inicio: desde, duracion: largo, capa: 1, duracionInterna: largo, mediaInicio, archivo: item.ruta, variables: { credito, duracion: largo } })
        reparto.video += largo
        salida.push({ inicio: desde, largo, tipo: 'video' })
      }
      cursor += item.largo
    }
    return salida
  }

  // La tarjeta de suscripción tiene sombras y fundidos: va sobre una foto o animación, nunca sobre el hueco de un clip.
  let suscribeteTemprano = false
  const suscribete = tomas => {
    const toma = tomas.find(x => x.tipo !== 'video' && x.largo >= TIEMPOS.suscribete + 0.4)
    if (!toma) return false
    const inicio = aCuadro(toma.inicio + 0.2)
    escenas.push({ escena: 'suscribete', inicio, duracion: TIEMPOS.suscribete, capa: 6, variables: { nombre: 'Pont3la10', lema: 'Una historia de fútbol cada viernes' } })
    sonido('clic', inicio + 1.35, 0.7)
    sonido('clic', inicio + 2.4, 0.7)
    return true
  }

  // Testimonio: la persona habla con su voz real (subtitulada) entre dos capítulos; el narrador calla.
  let testimonios = 0
  const testimonio = (visual, etiqueta) => {
    if (testimonios >= MAXIMO_TESTIMONIOS) { avisos.push(`${etiqueta}: ya hay ${MAXIMO_TESTIMONIOS} testimonios; este se omite.`); return }
    const m = medio(visual)
    const pedido = Number(visual.hasta) - Number(visual.desde)
    if (!m?.ruta || !m?.audio || !(pedido > 0)) { avisos.push(`${etiqueta}: el testimonio ${visual.desde}–${visual.hasta} s no se pudo usar.`); return }
    const inicio = aCuadro(t)
    const largo = aCuadro(Math.min(pedido, TESTIMONIO_MAXIMO_SEGUNDOS, Number(m.disponible ?? Infinity)))
    if (largo < 2) return
    const clave = claveMedio(visual)
    usoClip.set(clave, Math.max(usoClip.get(clave) || 0, largo))
    const credito = m.credito ? `Video: ${m.credito}${m.licencia ? ` (${m.licencia})` : ''}` : ''
    escenas.push({ escena: 'doc-clip', inicio, duracion: largo, capa: 1, duracionInterna: largo, mediaInicio: 0, archivo: m.ruta, variables: { credito, duracion: largo, subtitulo: visual.texto || '', quien: visual.quien || protagonista } })
    grabadas.push({ tipo: 'audio', id: `testimonio-${testimonios + 1}`, archivo: m.audio, inicio, duracion: largo })
    reparto.video += largo
    testimonios++
    t = aCuadro(inicio + largo)
  }

  // Préstamo: los visuales de los demás capítulos, del más cercano al más lejano.
  const todos = actos.flatMap(acto => acto.capitulos || [])
  const prestamoPara = id => {
    const i = todos.findIndex(c => c.id === id)
    return todos.map((c, j) => ({ c, d: i < 0 ? j : Math.abs(j - i) + (j < i ? 0.5 : 0) })).filter(x => x.c.id !== id).sort((x, y) => x.d - y.d).flatMap(x => x.c.visuales || [])
  }

  actos.forEach((acto, a) => {
    const inicioActo = t
    const fondo = fondoDe(acto.capitulos?.[0]?.visuales)
    if (a > 0) {
      tarjeta(TIEMPOS.tarjetaActo, { kicker: `ACTO ${ROMANOS[a] || a}`, titulo: String(acto.titulo || acto.id).toUpperCase(), subtitulo: acto.capitulos?.[0]?.titulo || '', fondo })
      sonido('whoosh-a', inicioActo + 0.1, 0.5)
    }
    tramosMusica.push({ clave: acto.id, inicio: redondear(inicioActo) })
    ;(acto.capitulos || []).forEach((capitulo, c) => {
      const etiqueta = `${acto.titulo} · ${capitulo.titulo}`
      capitulos.push({ inicio: redondear(c === 0 ? inicioActo : t), texto: capitulo.titulo || acto.titulo })
      const inicio = t
      const duracion = voz(`${capitulo.id}-voz`, capitulo.voz, etiqueta, acto.id)
      const tomas = rellenar(capitulo.visuales, inicio, duracion, etiqueta, prestamoPara(capitulo.id))
      // Rótulo del capítulo (salvo la pregunta inicial) sobre la primera foto o clip que dure lo suficiente.
      const primera = a > 0 && tomas.find(x => x.tipo !== 'animacion' && x.largo >= TIEMPOS.rotulo + 0.4)
      if (primera) {
        escenas.push({ escena: 'rotulo', inicio: redondear(primera.inicio + 0.3), duracion: TIEMPOS.rotulo, capa: 5, variables: { etiqueta: String(acto.titulo).toUpperCase(), titular: capitulo.titulo || '', fuente: '' } })
        sonido('pop', primera.inicio + 0.4, 0.45)
      }
      if (a === 1 && !suscribeteTemprano) suscribeteTemprano = suscribete(tomas)
      t = redondear(inicio + duracion)
      for (const visual of (capitulo.visuales || []).filter(v => v.tipo === 'testimonio')) testimonio(visual, etiqueta)
    })
    // Tras la pregunta inicial, el título del documental.
    if (a === 0) {
      tarjeta(TIEMPOS.tarjetaTitulo, { kicker: 'UN DOCUMENTAL DE PONT3LA10', titulo: protagonista.toUpperCase(), subtitulo: '', fondo })
      sonido('impacto', t - TIEMPOS.tarjetaTitulo + 0.1, 0.6, { duracion: 1.5, mediaStart: 1.07 })
    }
  })

  // Cierre: pregunta al público y despedida sobre las fotos y clips del último capítulo y del primero.
  const textoCierre = [guion?.preguntaFinal, guion?.cierre].filter(Boolean).join(' ')
  if (textoCierre) {
    const inicio = t
    capitulos.push({ inicio: redondear(inicio), texto: 'Tu opinión' })
    const duracion = voz('cierre', textoCierre, 'Cierre', null)
    const ultimo = actos.at(-1)?.capitulos?.at(-1)?.visuales || []
    const primero = actos[0]?.capitulos?.[0]?.visuales || []
    const pool = [...ultimo, ...primero].filter(v => ['foto', 'video'].includes(v.tipo))
    const tomasCierre = rellenar(pool, inicio, duracion, 'Cierre', prestamoPara(''))
    if (guion?.preguntaFinal) {
      escenas.push({ escena: 'rotulo', inicio: redondear(inicio + 0.3), duracion: TIEMPOS.rotulo, capa: 5, variables: { etiqueta: 'TU OPINIÓN', titular: guion.preguntaFinal, fuente: 'Déjalo en los comentarios' } })
      sonido('pop', inicio + 0.4, 0.45)
    }
    suscribete(tomasCierre)
    t = redondear(inicio + duracion)
  }
  const portada = actos.flatMap(a => a.capitulos || []).flatMap(c => c.visuales || []).filter(v => v.tipo === 'foto').map(recurso).find(Boolean)
  escenas.push({ escena: 'cierre', inicio: aCuadro(t), duracion: aCuadro(aCuadro(t + TIEMPOS.cierre) - aCuadro(t)), capa: 1, variables: { fondo: portada?.ruta || '', web: 'pont3la10.com' } })
  t = aCuadro(t + TIEMPOS.cierre)

  if (grabadas.some(g => !String(g.id).startsWith('testimonio-'))) for (const s of sonidos) s.volumen = redondear(s.volumen * 0.6)
  const tramos = tramosMusica.map((tramo, i) => ({ ...tramo, fin: tramosMusica[i + 1]?.inicio ?? t }))
  const visual = reparto.foto + reparto.video + reparto.animacion
  const proporcion = {
    foto: visual ? redondear(reparto.foto / visual) : 0,
    video: visual ? redondear(reparto.video / visual) : 0,
    animacion: visual ? redondear(reparto.animacion / visual) : 0
  }
  return {
    duracion: t, escenas, sonidos, medios: grabadas, segmentos, capitulos, tramosMusica: tramos, avisos,
    clipsBase: escenas.filter(e => e.escena === 'doc-clip').map(e => ({ inicio: e.inicio, duracion: e.duracion, archivo: e.archivo, mediaInicio: e.mediaInicio })),
    recortes: [...usoClip.entries()].map(([clave, segundos]) => ({ clave, segundos: redondear(segundos) })),
    usosFoto: Object.fromEntries(usosFoto), reparto: Object.fromEntries(Object.entries(reparto).map(([k, v]) => [k, redondear(v)])), proporcion
  }
}

/** Descripción de YouTube y Facebook: pregunta, capítulos con tiempos reales, fuentes, créditos y música. */
export function descripcionDocumental({ guion, manifiesto, atribucionMusica = '' }) {
  const partes = []
  if (guion?.preguntaCentral) partes.push(guion.preguntaCentral)
  const capitulos = []
  for (const c of manifiesto?.capitulos || []) {
    const anterior = capitulos.at(-1)
    if (anterior && c.inicio - anterior.inicio < 10) continue
    capitulos.push(c)
  }
  if (capitulos.length >= 3 && capitulos[0].inicio === 0) partes.push(`Capítulos:\n${capitulos.map(c => `${marcaTiempo(c.inicio)} ${c.texto}`).join('\n')}`)
  const fuentes = (guion?.fuentes || []).filter(f => f?.url)
  if (fuentes.length) partes.push(`Fuentes:\n${fuentes.map(f => `• ${f.medio}: ${f.titulo} — ${f.url}`).join('\n')}`)
  const creditos = new Set()
  let conMapa = false
  for (const acto of guion?.actos || []) for (const capitulo of acto.capitulos || []) for (const v of capitulo.visuales || []) {
    if (v.tipo === 'foto' && v.credito) creditos.add(`Foto: ${v.credito}`)
    if ((v.tipo === 'video' || v.tipo === 'testimonio') && v.credito) creditos.add(`Video: ${v.credito}${v.licencia ? ` (${v.licencia})` : ''}`)
    if (v.tipo === 'mapa') conMapa = true
  }
  for (const credito of manifiesto?.creditosStock || []) creditos.add(credito)
  if (conMapa) creditos.add('Mapas: Natural Earth (dominio público)')
  if (creditos.size) partes.push(`Imágenes:\n${[...creditos].map(c => `• ${c}`).join('\n')}`)
  if (atribucionMusica) partes.push(atribucionMusica)
  if (guion?.preguntaFinal) partes.push(guion.preguntaFinal)
  const etiqueta = texto => `#${String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '')}`
  partes.push(['Cada viernes, una historia de fútbol en Pont3la10.', [etiqueta(guion?.protagonista), '#Documental', '#Futbol', '#Pont3la10'].filter(h => h.length > 1).join(' ')].join('\n'))
  return partes.join('\n\n').slice(0, 5000)
}

// ───────────────────────────── Disco y red ─────────────────────────────

// Número libre para un archivo nuevo (foto-7.jpg…): nunca reutiliza el de otro aunque se hayan borrado entradas.
export const siguienteNumero = rutas => 1 + Math.max(0, ...rutas.map(r => Number(/-(\d+)\.\w+$/.exec(String(r))?.[1]) || 0))

async function leerJson(ruta, porDefecto) {
  try { return JSON.parse(await readFile(ruta, 'utf8')) } catch { return porDefecto }
}

async function bajar(url, destino, { cabeceras = {} } = {}) {
  const respuesta = await fetch(url, { headers: { 'User-Agent': AGENTE, ...cabeceras }, signal: AbortSignal.timeout(120_000) })
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
  await writeFile(destino, Buffer.from(await respuesta.arrayBuffer()))
}

async function bajarFoto(url, destino) {
  const temporal = `${destino}.descarga`
  await bajar(url, temporal)
  // JPG de máximo 2400 px de ancho: suficiente para el paneo sin cargar el render.
  await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', temporal, '-vf', "scale='min(2400,iw)':-2", '-frames:v', '1', '-update', '1', '-q:v', '2', destino])
  await rm(temporal, { force: true })
}

async function duracionFuente(url) {
  const { stdout } = await ejecutar('ffprobe', ['-v', 'error', '-user_agent', AGENTE, '-show_entries', 'format=duration', '-of', 'csv=p=0', url], { timeout: 120_000 })
  const segundos = Number(String(stdout).trim())
  return Number.isFinite(segundos) ? segundos : null
}

/** Recorta un tramo de un video remoto (o local) a MP4 1920×1080, 30 fps, sin sonido. Si el original se acaba, congela el último cuadro. */
async function recortarClip(origen, desde, segundos, destino) {
  const remoto = /^https?:/.test(origen) ? ['-user_agent', AGENTE] : []
  // Franjas negras del original (videos con letterbox): se detectan en unos segundos y se recortan antes de escalar.
  let recorte = ''
  try {
    const { stderr } = await ejecutar('ffmpeg', ['-hide_banner', ...remoto, '-ss', String(desde + 1), '-i', origen, '-t', '4', '-an', '-vf', 'cropdetect=limit=24:round=2:reset=0', '-f', 'null', '-'], { timeout: 300_000, maxBuffer: 20 * 1024 * 1024 })
    const ultimo = [...String(stderr).matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].at(-1)
    const tam = /Stream .*Video:.*?(\d{3,5})x(\d{3,5})/.exec(String(stderr))
    if (ultimo && tam) {
      const [w, h] = [Number(ultimo[1]), Number(ultimo[2])]
      const [W, H] = [Number(tam[1]), Number(tam[2])]
      if ((w < W * 0.97 || h < H * 0.97) && w > W * 0.5 && h > H * 0.5) recorte = `crop=${ultimo[1]}:${ultimo[2]}:${ultimo[3]}:${ultimo[4]},`
    }
  } catch { /* sin detección: se escala tal cual */ }
  const filtro = `${recorte}scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1,tpad=stop_mode=clone:stop_duration=${Math.ceil(segundos) + 1}`
  const temporal = `${destino}.parcial.mp4`
  await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', ...remoto, '-ss', String(desde), '-i', origen, '-t', String(redondear(segundos + 0.5)), '-an', '-vf', filtro, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', temporal], { timeout: 900_000, maxBuffer: 10 * 1024 * 1024 })
  await rm(destino, { force: true })
  await copyFile(temporal, destino)
  await rm(temporal, { force: true })
}

/** Busca un video libre en Pixabay (requiere PIXABAY_API_KEY) y lo deja normalizado en el proyecto. */
async function buscarPixabay(busqueda, destino, llave) {
  const url = `https://pixabay.com/api/videos/?${new URLSearchParams({ key: llave, q: busqueda.slice(0, 100), per_page: '10', safesearch: 'true' })}`
  const respuesta = await fetch(url, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(30_000) })
  if (!respuesta.ok) throw new Error(`Pixabay respondió ${respuesta.status}`)
  const datos = await respuesta.json()
  for (const video of datos.hits || []) {
    if ((video.duration || 0) < 6) continue
    const archivo = ['large', 'medium'].map(t => video.videos?.[t]).find(v => v?.url && v.width >= 1280 && v.width >= v.height)
    if (!archivo) continue
    const temporal = `${destino}.descarga.mp4`
    await bajar(archivo.url, temporal)
    const segundos = Math.min(40, video.duration)
    await recortarClip(temporal, 0, segundos, destino)
    await rm(temporal, { force: true })
    return { credito: `${video.user || 'Autor'} / Pixabay`, licencia: 'Licencia de Pixabay', disponible: segundos, pagina: video.pageURL }
  }
  return null
}

/** Busca un video libre en Pexels (requiere PEXELS_API_KEY) y lo deja normalizado en el proyecto. */
async function buscarPexels(busqueda, destino, llave) {
  const url = `https://api.pexels.com/videos/search?${new URLSearchParams({ query: busqueda, orientation: 'landscape', size: 'medium', per_page: '8' })}`
  const respuesta = await fetch(url, { headers: { Authorization: llave, 'User-Agent': AGENTE }, signal: AbortSignal.timeout(30_000) })
  if (!respuesta.ok) throw new Error(`Pexels respondió ${respuesta.status}`)
  const datos = await respuesta.json()
  for (const video of datos.videos || []) {
    if ((video.duration || 0) < 6) continue
    const archivo = (video.video_files || []).filter(f => f.file_type === 'video/mp4' && f.width >= 1280 && f.width >= f.height).sort((a, b) => Math.abs(a.width - 1920) - Math.abs(b.width - 1920))[0]
    if (!archivo?.link) continue
    const temporal = `${destino}.descarga.mp4`
    await bajar(archivo.link, temporal)
    const segundos = Math.min(40, video.duration)
    await recortarClip(temporal, 0, segundos, destino)
    await rm(temporal, { force: true })
    return { credito: `${video.user?.name || 'Autor'} / Pexels`, licencia: 'Licencia de Pexels', disponible: segundos, pagina: video.url }
  }
  return null
}

// Stock: Pexels si hay PEXELS_API_KEY; si no, Pixabay con PIXABAY_API_KEY (Pexels pausó las llaves nuevas en 2026-11).
function cargarStock() {
  try { process.loadEnvFile(join(RAIZ, '.env')) } catch { /* sin .env: el documental se arma sin stock */ }
  if (process.env.PEXELS_API_KEY) return { nombre: 'Pexels', buscar: (b, d) => buscarPexels(b, d, process.env.PEXELS_API_KEY) }
  if (process.env.PIXABAY_API_KEY) return { nombre: 'Pixabay', buscar: (b, d) => buscarPixabay(b, d, process.env.PIXABAY_API_KEY) }
  return null
}

/**
 * Arma (o vuelve a armar) el proyecto del documental en `salida`. Usa las tomas de voz de estudio.json y reutiliza
 * las fotos, clips y stock ya bajados en assets/.
 */
export async function generarDocumental({ guion, salida, sinRed = false, registro = () => {} }) {
  const config = await leerJson(join(RAIZ, 'config', 'documental.json'), {})
  const lugares = (await leerJson(join(RAIZ, 'config', 'lugaresDocumental.json'), {})).lugares || {}
  const estudio = await leerJson(join(salida, 'estudio.json'), {})
  for (const carpeta of ['compositions', 'assets/fotos', 'assets/clips', 'assets/stock', 'assets/sonidos', 'renders']) await mkdir(join(salida, carpeta), { recursive: true })
  await writeFile(join(salida, 'guion.json'), JSON.stringify(guion, null, 2))
  const visuales = (guion.actos || []).flatMap(a => a.capitulos || []).flatMap(c => c.visuales || [])
  const avisos = []

  // Fotos: una por URL, con índice propio para que reordenar el guion no cruce archivos.
  const indiceFotos = await leerJson(join(salida, 'assets', 'fotos', 'fotos.json'), {})
  const urlsFotos = [...new Set(visuales.filter(v => v.tipo === 'foto' && v.imagen).map(v => v.imagen))]
  for (const url of urlsFotos) {
    const actual = indiceFotos[url]
    if (actual && existsSync(join(salida, actual))) continue
    if (sinRed) continue
    const archivo = `assets/fotos/foto-${siguienteNumero(Object.values(indiceFotos))}.jpg`
    try { registro(`Bajando foto ${url}`); await bajarFoto(url, join(salida, archivo)); indiceFotos[url] = archivo } catch (error) { avisos.push(`No se pudo bajar la foto ${url} (${error.message}).`) }
  }
  await writeFile(join(salida, 'assets', 'fotos', 'fotos.json'), JSON.stringify(indiceFotos, null, 2))

  // Clips: duración de cada video de origen (para no pasarse) y un archivo por URL + «desde».
  const indiceClips = await leerJson(join(salida, 'assets', 'clips', 'clips.json'), { fuentes: {}, clips: {} })
  const fallidos = new Set()
  const conVideo = v => (v.tipo === 'video' || v.tipo === 'testimonio') && v.video
  for (const url of [...new Set(visuales.filter(conVideo).map(v => v.video))]) {
    if (indiceClips.fuentes[url] || sinRed) continue
    try { indiceClips.fuentes[url] = await duracionFuente(url) } catch (error) { fallidos.add(url); avisos.push(`No se pudo leer el video ${url} (${error.message.split(/\r?\n/)[0]}).`) }
  }
  for (const v of visuales.filter(conVideo)) {
    const clave = claveMedio(v)
    if (!indiceClips.clips[clave]) indiceClips.clips[clave] = { archivo: `assets/clips/clip-${siguienteNumero(Object.values(indiceClips.clips).map(c => c.archivo))}.mp4`, segundos: 0 }
  }
  // Audio de cada testimonio: el tramo exacto, nivelado a −16 LUFS (un poco bajo la voz del narrador, a −14).
  indiceClips.audios = indiceClips.audios || {}
  await mkdir(join(salida, 'assets', 'testimonios'), { recursive: true })
  for (const v of visuales.filter(x => x.tipo === 'testimonio' && x.video)) {
    const clave = `${claveMedio(v)}-${Number(v.hasta) || 0}`
    const actual = indiceClips.audios[clave]
    if (actual && existsSync(join(salida, actual))) continue
    if (sinRed || fallidos.has(v.video)) continue
    const segundos = Math.min(TESTIMONIO_MAXIMO_SEGUNDOS, Number(v.hasta) - Number(v.desde))
    if (!(segundos > 0)) continue
    const archivo = `assets/testimonios/testimonio-${siguienteNumero(Object.values(indiceClips.audios))}.m4a`
    try {
      registro(`Audio del testimonio ${v.desde}–${v.hasta} s`)
      await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-user_agent', AGENTE, '-ss', String(v.desde), '-i', v.video, '-t', String(segundos), '-vn', '-af', `loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,afade=t=in:d=0.08,afade=t=out:st=${Math.max(0, segundos - 0.25)}:d=0.25`, '-c:a', 'aac', '-b:a', '192k', join(salida, archivo)], { timeout: 600_000, maxBuffer: 10 * 1024 * 1024 })
      indiceClips.audios[clave] = archivo
    } catch (error) { avisos.push(`No se pudo sacar el audio del testimonio ${v.desde} s (${error.message.split(/\r?\n/)[0]}).`) }
  }

  // Stock (Pexels): sin llave, esos espacios se cubren con más tiempo de los clips y fotos del capítulo.
  const proveedor = sinRed ? null : cargarStock()
  const indiceStock = await leerJson(join(salida, 'assets', 'stock', 'stock.json'), {})
  const busquedas = [...new Set(visuales.filter(v => v.tipo === 'stock' && v.busqueda).map(v => v.busqueda))]
  if (busquedas.length && !proveedor && !busquedas.every(b => indiceStock[b])) avisos.push(`Sin PIXABAY_API_KEY ni PEXELS_API_KEY en el .env: ${busquedas.length} espacios de stock se cubren con los clips y fotos de otros capítulos.`)
  if (proveedor) {
    for (const busqueda of busquedas) {
      if (indiceStock[busqueda] !== undefined && (indiceStock[busqueda] === null || existsSync(join(salida, indiceStock[busqueda].archivo)))) continue
      const archivo = `assets/stock/stock-${siguienteNumero(Object.values(indiceStock).filter(Boolean).map(x => x.archivo))}.mp4`
      try { registro(`Buscando en ${proveedor.nombre}: ${busqueda}`); const r = await proveedor.buscar(busqueda, join(salida, archivo)); indiceStock[busqueda] = r ? { archivo, ...r } : null } catch (error) { avisos.push(`${proveedor.nombre} «${busqueda}»: ${error.message}`) }
    }
    await writeFile(join(salida, 'assets', 'stock', 'stock.json'), JSON.stringify(indiceStock, null, 2))
  }

  const medio = visual => {
    if (visual.tipo === 'foto') { const ruta = indiceFotos[visual.imagen]; return ruta && existsSync(join(salida, ruta)) ? { ruta, credito: visual.credito || '' } : null }
    if (visual.tipo === 'video' || visual.tipo === 'testimonio') {
      const fuente = indiceClips.fuentes[visual.video]
      if (fuente === undefined && sinRed && !existsSync(join(salida, indiceClips.clips[claveMedio(visual)]?.archivo || '-'))) return null
      if (fuente === null || fallidos.has(visual.video)) return null
      // «duracionMaxima» limita el tramo útil (p. ej., hasta que la entrevista corta al entrevistador).
      const restante = Number.isFinite(fuente) ? Math.max(0, fuente - (Number(visual.desde) || 0)) : Infinity
      const disponible = Number(visual.duracionMaxima) > 0 ? Math.min(restante, Number(visual.duracionMaxima)) : restante
      const audio = visual.tipo === 'testimonio' ? indiceClips.audios[`${claveMedio(visual)}-${Number(visual.hasta) || 0}`] : undefined
      if (visual.tipo === 'testimonio' && !(audio && existsSync(join(salida, audio)))) return null
      return disponible >= 2 ? { ruta: indiceClips.clips[claveMedio(visual)].archivo, credito: visual.credito || '', licencia: visual.licencia || '', disponible, audio } : null
    }
    if (visual.tipo === 'stock') { const s = indiceStock[visual.busqueda]; return s && existsSync(join(salida, s.archivo)) ? { ruta: s.archivo, credito: s.credito, licencia: s.licencia, disponible: s.disponible } : null }
    return null
  }
  const topologia = await leerJson(join(PACK, 'assets', 'mapa', 'land-10m.json'), null)
  const anillos = topologia ? anillosDeTopologia(topologia) : []
  const mapa = visual => {
    const { mapa: datos, faltan } = planMapa(visual, lugares)
    if (faltan.length) avisos.push(`Mapa: faltan ${faltan.join(', ')} en config/lugaresDocumental.json.`)
    return datos ? { mapa: datos, tierra: caminoTierra(anillos, datos.pasos.map(p => p.vista)) } : null
  }

  const plan = planificarDocumental(guion, { ppm: config.palabrasPorMinuto || 160, estudio, medio, mapa })
  avisos.push(...plan.avisos)

  // Recorta de cada video solo lo que el plan usa (y lo reutiliza si ya alcanza).
  for (const { clave, segundos } of plan.recortes) {
    const clip = indiceClips.clips[clave]
    if (!clip || clave.startsWith('stock:')) continue
    if (clip.segundos >= segundos + 0.3 && existsSync(join(salida, clip.archivo))) continue
    if (sinRed) { avisos.push(`Falta recortar ${clave} (sin red).`); continue }
    const [, url, desde] = /^video:(.*)#([\d.]+)$/.exec(clave) || []
    try {
      registro(`Recortando ${Math.round(segundos)} s de ${decodeURIComponent(url.split('/').pop())} desde ${desde} s`)
      await recortarClip(url, Number(desde), segundos + 1, join(salida, clip.archivo))
      clip.segundos = redondear(segundos + 1)
    } catch (error) { avisos.push(`No se pudo recortar ${url} (${error.message.split('\n')[0]}).`) }
  }
  await writeFile(join(salida, 'assets', 'clips', 'clips.json'), JSON.stringify(indiceClips, null, 2))

  // Escenas: se borran las de una generación anterior (el número de instancias cambia con los tiempos).
  for (const nombre of await readdir(join(salida, 'compositions'))) if (nombre.endsWith('.html')) await rm(join(salida, 'compositions', nombre), { force: true })
  await writeFile(join(salida, 'index.html'), armarIndex(plan, guion.titulos?.[0] || `Documental · ${guion.protagonista}`))
  const plantillas = new Map()
  for (const escena of plan.escenas) {
    if (!plantillas.has(escena.escena)) plantillas.set(escena.escena, await readFile(join(PACK, 'compositions', `${escena.escena}.html`), 'utf8'))
    let html = instanciarEscena(plantillas.get(escena.escena), escena.escena, escena.numero, escena.duracionInterna, escena.variables)
    if (escena.escena === 'doc-mapa') html = html.replace('data-tierra d=""', `data-tierra d="${escena.tierra || ''}"`)
    await writeFile(join(salida, 'compositions', `${escena.instancia}.html`), html)
  }
  await writeFile(join(salida, IMAGEN_VACIA), Buffer.from(PNG_VACIO, 'base64'))
  for (const nombre of ['logo-blanco.png', 'isotipo.png']) await copyFile(join(PACK, 'assets', nombre), join(salida, 'assets', nombre))
  for (const nombre of await readdir(join(PACK, 'assets', 'sonidos'))) await copyFile(join(PACK, 'assets', 'sonidos', nombre), join(salida, 'assets', 'sonidos', nombre))
  for (const nombre of ['hyperframes.json', 'package.json', 'meta.json']) if (existsSync(join(PACK, nombre))) await copyFile(join(PACK, nombre), join(salida, nombre))

  const creditosStock = [...new Set(Object.values(indiceStock).filter(Boolean).map(s => `Video: ${s.credito}`))]
  const manifiesto = {
    fecha: guion.fecha, tipo: 'documental', tituloVideo: guion.titulos?.[0] || guion.protagonista, sinCamara: true,
    duracion: plan.duracion, segmentos: plan.segmentos, fotos: [], titulares: guion.titulos || [],
    capitulos: plan.capitulos, tramosMusica: plan.tramosMusica, clipsBase: plan.clipsBase, reparto: plan.reparto, proporcion: plan.proporcion, creditosStock, avisos
  }
  await writeFile(join(salida, 'manifiesto.json'), JSON.stringify(manifiesto, null, 2))
  await writeFile(join(salida, 'teleprompter.txt'), textoTeleprompter(plan))
  await writeFile(join(salida, 'descripcion.txt'), descripcionDocumental({ guion, manifiesto }))
  return { salida, duracion: plan.duracion, escenas: plan.escenas.length, grabados: plan.segmentos.filter(s => s.grabado).length, tramos: plan.segmentos.length, proporcion: plan.proporcion, usosFoto: plan.usosFoto, avisos }
}

/**
 * Tramos de la pista de clips en cuadros: cada clip del plan y los espacios negros entre ellos, pegados y sin huecos,
 * dentro de [inicio, fin) en segundos (todo el video por defecto).
 */
export function tramosBase(clips, duracion, { inicio = 0, fin = duracion } = {}) {
  const f0 = Math.round(inicio * FPS)
  const f1 = Math.round(fin * FPS)
  const tramos = []
  let cursor = f0
  for (const clip of [...clips].sort((a, b) => a.inicio - b.inicio)) {
    const a = Math.max(f0, Math.round(clip.inicio * FPS))
    const b = Math.min(f1, Math.round((clip.inicio + clip.duracion) * FPS))
    if (b <= a) continue
    if (a > cursor) tramos.push({ tipo: 'negro', cuadros: a - cursor })
    // Si el tramo pedido empieza a mitad del clip, el clip también se adelanta.
    const adelanto = (a - Math.round(clip.inicio * FPS)) / FPS
    tramos.push({ tipo: 'clip', cuadros: b - a, archivo: clip.archivo, desde: Math.round(((clip.mediaInicio || 0) + adelanto) * 1000) / 1000 })
    cursor = b
  }
  if (f1 > cursor) tramos.push({ tipo: 'negro', cuadros: f1 - cursor })
  return tramos
}

const CODIFICAR = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-video_track_timescale', '15360']

/**
 * Render híbrido, paso 2: arma con ffmpeg la pista de clips (cuadro a cuadro, sin sonido) y le pone encima el render
 * de HyperFrames, quitando el magenta de los huecos de clip. El audio (voz y efectos) sale del render de HyperFrames.
 * `inicio` y `fin` sirven para componer un render parcial (hyperframes render --start/--end).
 */
export async function componerDocumental({ carpeta, graficos = 'renders/graficos.mp4', salida = 'renders/final-voz.mp4', inicio = 0, fin, registro = () => {} }) {
  const manifiesto = await leerJson(join(carpeta, 'manifiesto.json'), null)
  if (!manifiesto?.clipsBase) throw new Error('El manifiesto no tiene clipsBase: vuelve a armar el documental.')
  const temporal = join(carpeta, 'renders', 'base-tmp')
  await rm(temporal, { recursive: true, force: true })
  await mkdir(temporal, { recursive: true })
  const tramos = tramosBase(manifiesto.clipsBase, manifiesto.duracion, { inicio, fin: fin ?? manifiesto.duracion })
  const lista = []
  for (const [i, tramo] of tramos.entries()) {
    const nombre = `t${String(i).padStart(4, '0')}.mp4`
    const entrada = tramo.tipo === 'clip'
      ? ['-ss', String(tramo.desde), '-i', join(carpeta, tramo.archivo), '-vf', `fps=${FPS},tpad=stop_mode=clone:stop_duration=10`]
      : ['-f', 'lavfi', '-i', `color=black:s=1920x1080:r=${FPS}`]
    await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', ...entrada, '-an', '-frames:v', String(tramo.cuadros), ...CODIFICAR, join(temporal, nombre)], { maxBuffer: 10 * 1024 * 1024 })
    lista.push(`file '${nombre}'`)
    if (i % 25 === 0) registro(`Pista de clips: ${i + 1}/${tramos.length}`)
  }
  await writeFile(join(temporal, 'lista.txt'), lista.join('\n'))
  const base = join(temporal, 'base.mp4')
  await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(temporal, 'lista.txt'), '-c', 'copy', base], { maxBuffer: 10 * 1024 * 1024 })
  registro('Componiendo gráficos sobre los clips…')
  const final = join(carpeta, salida)
  await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(carpeta, graficos), '-i', base,
    '-filter_complex', '[0:v]colorkey=0xFF00FF:0.3:0.08[g];[1:v][g]overlay=shortest=1:format=auto,format=yuv420p[v]',
    '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'copy', '-movflags', '+faststart', final], { maxBuffer: 10 * 1024 * 1024, timeout: 4 * 3600_000 })
  await rm(temporal, { recursive: true, force: true })
  return { salida: final, tramos: tramos.length }
}

async function main() {
  const args = process.argv.slice(2)
  const objetivo = args.find(a => !a.startsWith('--'))
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined }
  if (!objetivo) { process.stderr.write('Uso: node scripts/documental-generar.mjs <carpeta del proyecto | guion.json> [--salida <dir>] [--sin-red]\n       node scripts/documental-generar.mjs <carpeta> --componer [--graficos <mp4>] [--salida <mp4>] [--inicio s --fin s]\n'); process.exit(2) }
  const ruta = resolve(objetivo)
  if (args.includes('--componer')) {
    const inicioMs = Date.now()
    const r = await componerDocumental({ carpeta: ruta, graficos: valor('--graficos') || 'renders/graficos.mp4', salida: valor('--salida') || 'renders/final-voz.mp4', inicio: Number(valor('--inicio') || 0), fin: valor('--fin') ? Number(valor('--fin')) : undefined, registro: texto => process.stdout.write(`· ${texto}\n`) })
    process.stdout.write(`Compuesto ${r.salida} (${r.tramos} tramos, ${Math.round((Date.now() - inicioMs) / 1000)} s)\n`)
    return
  }
  const archivoGuion = (await stat(ruta)).isDirectory() ? join(ruta, 'guion.json') : ruta
  const guion = JSON.parse(await readFile(archivoGuion, 'utf8'))
  if (guion.tipo !== 'documental') throw new Error('El guion no es de tipo documental.')
  const salida = resolve(valor('--salida') || ((await stat(ruta)).isDirectory() ? ruta : join(RAIZ, 'videos', 'diario', nombreProyecto(guion))))
  const inicio = Date.now()
  const r = await generarDocumental({ guion, salida, sinRed: args.includes('--sin-red'), registro: texto => process.stdout.write(`· ${texto}\n`) })
  const minutos = m => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`
  process.stdout.write(`Documental armado en ${r.salida} (${Math.round((Date.now() - inicio) / 1000)} s)
Duración: ${minutos(r.duracion)} · ${r.escenas} escenas · ${r.grabados}/${r.tramos} tramos de voz grabados
Pantalla: ${Math.round(r.proporcion.foto * 100)} % fotos · ${Math.round(r.proporcion.video * 100)} % video · ${Math.round(r.proporcion.animacion * 100)} % animación
${r.avisos.length ? `Avisos:\n${r.avisos.map(a => `  ! ${a}`).join('\n')}\n` : ''}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
