// Generador de Reels/Shorts con guion propio: convierte un Reel de guion-reels.json en un proyecto vertical
// (1080×1920) de HyperFrames armado con las escenas «reel-*» del pack videos/pack-pont3la10.
//
// Cada Reel es un proyecto del estudio (videos/diario/<fecha>-reel-<n>) con 3 tramos que graba Juan:
//   gancho (≤ 3 s) · cuerpo-voz (todos los beats, de una sola toma) · cierre (llamado a la acción y bucle).
// Al armar, cada toma se transcribe (faster-whisper local) y los cortes de imagen caen en la palabra donde
// empieza cada beat; los subtítulos salen de las mismas palabras. Sin tomas, los tiempos se estiman.
//
// Uso:
//   node scripts/video-generar-reel.mjs <proyecto-del-dia>            crea/actualiza todos sus Reels
//   node scripts/video-generar-reel.mjs --armar <proyecto-reel>       vuelve a armar un Reel
import { readFile, writeFile, mkdir, copyFile, readdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { instanciarEscena, descargarFoto, contarPalabras, IMAGEN_VACIA } from './video-generar-proyecto.mjs'
import { agruparPalabras } from './video-reels.mjs'

const ejecutar = promisify(execFile)
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const PACK = join(RAIZ, 'videos', 'pack-pont3la10')
const DIARIO = join(RAIZ, 'videos', 'diario')
const SITIO = 'https://www.pont3la10.com'
const PNG_VACIO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const redondear = valor => Math.round(valor * 100) / 100
export const ESCENA_VISUAL = {
  punch: 'reel-foto-punch', paneo: 'reel-foto-paneo', tarjeta: 'reel-foto-tarjeta', dividida: 'reel-foto-dividida',
  dato: 'reel-dato', cita: 'reel-cita', lista: 'reel-lista', marcador: 'reel-marcador', versus: 'reel-versus', pregunta: 'reel-pregunta'
}
const DE_FOTO = ['punch', 'tarjeta', 'paneo']
const TRANSICION = { 'reel-golpe': { corte: 0.15, duracion: 0.4, sonido: 'swoosh' }, 'reel-barrido': { corte: 0.3, duracion: 0.6, sonido: 'whoosh-a' }, 'reel-glitch': { corte: 0.12, duracion: 0.35, sonido: 'tic' } }
const DURACION_SONIDO = { 'whoosh-a': 0.575, 'whoosh-b': 0.701, pop: 0.72, clic: 0.366, impacto: 1.5, golpe: 0.7, subida: 1.2, tic: 0.05, swoosh: 0.35 }
export const INICIO_VOZ = 0.1
const COLA = 0.5

const segundosDeTexto = (texto, ppm) => redondear(Math.max(0.8, contarPalabras(texto) / ppm * 60))
const mayus = texto => String(texto || '').trim().toUpperCase()

/** Los 3 tramos que graba Juan para un Reel, con el texto de su teleprompter. */
export function tramosDeReel(reel) {
  return [
    { id: 'gancho', etiqueta: 'Gancho', texto: String(reel?.gancho?.texto || '').trim() },
    { id: 'cuerpo-voz', etiqueta: 'Desarrollo (todos los beats)', texto: (reel?.beats || []).map(b => String(b?.texto || '').trim()).filter(Boolean).join('\n') },
    { id: 'cierre', etiqueta: 'Cierre', texto: String(reel?.cierre?.texto || '').trim() }
  ]
}

/** Palabras con tiempos estimados (sin toma grabada): reparto por largo de cada palabra. */
export function palabrasEstimadas(texto, inicio, duracion) {
  const lista = String(texto || '').trim().split(/\s+/).filter(Boolean)
  const pesos = lista.map(p => Math.max(2, p.length) + 1)
  const total = pesos.reduce((s, n) => s + n, 0) || 1
  let t = inicio
  return lista.map((p, i) => {
    const d = duracion * pesos[i] / total
    const palabra = { texto: p, inicio: redondear(t), fin: redondear(t + d * 0.92) }
    t += d
    return palabra
  })
}

const normal = palabra => String(palabra).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '')
function parecidas(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  if (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))) return true
  if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false
  let distintas = 0
  for (let i = 0, j = 0; i < a.length && j < b.length; i++, j++) {
    if (a[i] === b[j]) continue
    if (++distintas > 1) return false
    if (a.length > b.length) j--; else if (b.length > a.length) i--
  }
  return true
}

/**
 * Subtítulos con el texto EXACTO del guion (Whisper se equivoca con nombres propios) y los tiempos de la toma:
 * cada palabra del guion toma el tiempo de la palabra transcrita que le corresponde; las que no se encuentran se
 * reparten entre sus vecinas. Si la toma casi no coincide con el guion (improvisó), se usan las palabras dichas.
 */
export function alinearConGuion(texto, transcritas, duracion) {
  const guion = String(texto || '').trim().split(/\s+/).filter(Boolean)
  if (!guion.length || !transcritas.length) return transcritas
  const asignadas = new Array(guion.length).fill(null)
  let j = 0
  let coinciden = 0
  guion.forEach((palabra, i) => {
    for (let k = 0; k <= 4 && j + k < transcritas.length; k++) {
      if (parecidas(normal(palabra), normal(transcritas[j + k].texto))) {
        asignadas[i] = { inicio: transcritas[j + k].inicio, fin: transcritas[j + k].fin }
        j += k + 1
        coinciden++
        return
      }
    }
  })
  if (coinciden / guion.length < 0.5) return transcritas
  for (let i = 0; i < guion.length; i++) {
    if (asignadas[i]) continue
    let fin = i
    while (fin < guion.length && !asignadas[fin]) fin++
    const desde = i > 0 ? asignadas[i - 1].fin : Math.max(0, (asignadas[fin]?.inicio ?? 0.2) - 0.3 * (fin - i))
    const hasta = fin < guion.length ? asignadas[fin].inicio : Math.max(desde + 0.3 * (fin - i), duracion)
    const paso = (hasta - desde) / (fin - i)
    for (let n = i; n < fin; n++) asignadas[n] = { inicio: redondear(desde + paso * (n - i)), fin: redondear(desde + paso * (n - i + 1) - 0.02) }
    i = fin - 1
  }
  return guion.map((palabra, i) => ({ texto: palabra, inicio: asignadas[i].inicio, fin: asignadas[i].fin }))
}

/**
 * Tiempos de cada beat dentro de la toma del desarrollo: cada beat empieza en la palabra de la transcripción
 * que corresponde, en proporción, a su posición en el guion (la transcripción nunca coincide palabra a palabra).
 */
export function tiemposDeBeats(beats, palabras, inicio, duracion) {
  const cuentas = beats.map(b => Math.max(1, contarPalabras(b?.texto)))
  const total = cuentas.reduce((s, n) => s + n, 0)
  const fin = redondear(inicio + duracion)
  if (!palabras.length) {
    let t = inicio
    return cuentas.map(n => { const a = t; t += duracion * n / total; return { inicio: redondear(a), fin: redondear(t) } })
  }
  let acumulado = 0
  const inicios = cuentas.map((n, i) => {
    const indice = Math.min(palabras.length - 1, Math.round(acumulado / total * palabras.length))
    acumulado += n
    return i === 0 ? inicio : palabras[indice].inicio
  })
  return inicios.map((a, i) => ({ inicio: redondear(a), fin: redondear(i + 1 < inicios.length ? Math.max(a + 0.4, inicios[i + 1]) : fin) }))
}

// Partes de un beat de foto: ninguna dura más de `maximo` s (cambio de patrón cada 2–4 s).
export function partirBeat(inicio, fin, maximo = 4) {
  const duracion = fin - inicio
  const n = Math.max(1, Math.ceil(duracion / maximo - 0.15))
  return Array.from({ length: n }, (_, i) => ({ inicio: redondear(inicio + duracion * i / n), fin: redondear(inicio + duracion * (i + 1) / n) }))
}

/** Arma la línea de tiempo completa del Reel sin tocar disco ni red. */
export function planificarReel(reel, { ppm = 170, estudio = {}, transcripciones = {}, rutaFoto = url => url, derivada = (ruta) => ruta, maximoPorPlano = 4 } = {}) {
  const escenas = []
  const sonidos = []
  const medios = []
  const segmentos = []
  const grabaciones = estudio.grabaciones || {}
  const sinCamara = estudio.sinCamara !== false
  const beats = Array.isArray(reel?.beats) ? reel.beats : []
  const tramos = tramosDeReel(reel)
  const extra = clave => (estudio.fotosExtra?.[clave] || []).filter(f => f?.ruta).map(f => ({ ruta: f.ruta, credito: f.credito || '' }))
  const foto = (url, credito) => (url ? { ruta: rutaFoto(url), credito: credito || '' } : null)
  const fotosDeBeat = beat => [...extra(beat.id), foto(beat?.visual?.imagen, beat?.visual?.credito), foto(beat?.visual?.imagen2, beat?.visual?.credito2)].filter(f => f?.ruta)
  const fotoGancho = [...extra('gancho'), foto(reel?.gancho?.imagen, reel?.gancho?.credito)].find(f => f?.ruta) || beats.map(fotosDeBeat).find(l => l.length)?.[0] || null
  const credito = f => (f?.credito ? `Foto: ${f.credito}` : '')
  const sonido = (archivo, momento, volumen = 0.7) => sonidos.push({ archivo, inicio: redondear(Math.max(0, momento)), duracion: DURACION_SONIDO[archivo] ?? 1, volumen })

  // Tiempos de cada tramo (la toma real manda; si no hay, se estima a `ppm`).
  let t = INICIO_VOZ
  const palabras = []
  const tiempos = {}
  for (const tramo of tramos) {
    const grabada = grabaciones[tramo.id]
    const duracion = grabada?.duracion > 0 ? redondear(grabada.duracion) : segundosDeTexto(tramo.texto, ppm)
    const esVideo = Boolean(grabada?.archivo) && !/\.m4a$/i.test(grabada.archivo) && !sinCamara
    if (grabada?.archivo) medios.push({ tipo: esVideo ? 'video' : 'audio', id: tramo.id, archivo: grabada.archivo, inicio: t, duracion })
    const propias = alinearConGuion(tramo.texto, (transcripciones[tramo.id] || []).filter(p => p.inicio < duracion + 0.2), duracion)
      .map(p => ({ texto: p.texto, inicio: redondear(t + p.inicio), fin: redondear(t + Math.min(p.fin, duracion)) }))
    const lista = propias.length ? propias : palabrasEstimadas(tramo.texto, t, duracion)
    palabras.push(...lista)
    tiempos[tramo.id] = { inicio: t, fin: redondear(t + duracion), palabras: lista, esVideo }
    segmentos.push({ id: tramo.id, tipo: ['gancho', 'cierre'].includes(tramo.id) && !sinCamara ? 'cara' : 'voz', etiqueta: tramo.etiqueta, bloque: null, inicio: t, fin: redondear(t + duracion), texto: tramo.texto, grabado: Boolean(grabada?.archivo) })
    t = redondear(t + duracion)
  }
  const duracionTotal = redondear(t + COLA)
  const gancho = tiempos.gancho
  const cuerpo = tiempos['cuerpo-voz']
  const cierre = tiempos.cierre

  // 1. Gancho: el cuadro 0 ya trae el texto (es la miniatura del Reel).
  escenas.push({ escena: 'reel-gancho', inicio: 0, duracion: gancho.fin, capa: gancho.esVideo ? 2 : 1, variables: {
    foto: fotoGancho?.ruta || '', credito: credito(fotoGancho), texto: mayus(reel?.gancho?.pantalla), resaltar: mayus(reel?.gancho?.resaltar),
    etiqueta: mayus(reel?.club), soloTexto: gancho.esVideo, foco: reel?.gancho?.foco || '50% 35%', duracion: gancho.fin } })
  sonido('golpe', 0, 0.8)

  // 2. Beats del desarrollo, cortados donde empieza cada uno en la voz.
  const limites = tiemposDeBeats(beats, cuerpo.palabras, cuerpo.inicio, cuerpo.fin - cuerpo.inicio)
  const cortes = []
  const resumenFotos = [{ clave: 'gancho', etiqueta: 'Gancho', fotos: fotoGancho ? 1 : 0, espacios: 1, vacios: fotoGancho ? 0 : 1 }]
  let giro = 0
  beats.forEach((beat, i) => {
    const { inicio, fin } = limites[i]
    const visual = beat?.visual || {}
    const tipo = ESCENA_VISUAL[visual.tipo] ? visual.tipo : DE_FOTO[i % DE_FOTO.length]
    const fotos = fotosDeBeat(beat)
    const base = fotos[0] || fotoGancho
    const fondo = base ? derivada(base.ruta, 'fondo') : ''
    resumenFotos.push({ clave: beat.id || `v${i + 1}`, etiqueta: `Beat ${i + 1} · ${visual.tipo || tipo}`, fotos: fotos.length, espacios: DE_FOTO.includes(tipo) ? Math.max(1, partirBeat(inicio, fin, maximoPorPlano).length) : 1, vacios: fotos.length || !DE_FOTO.includes(tipo) ? 0 : 1 })
    cortes.push({ momento: inicio, rehook: beat?.rehook === true, primero: i === 0 })
    if (DE_FOTO.includes(tipo)) {
      partirBeat(inicio, fin, maximoPorPlano).forEach((parte, j) => {
        const f = fotos.length ? fotos[j % fotos.length] : fotoGancho
        const modo = j === 0 ? tipo : DE_FOTO[(DE_FOTO.indexOf(tipo) + j + giro) % DE_FOTO.length]
        const d = redondear(parte.fin - parte.inicio)
        if (j > 0) cortes.push({ momento: parte.inicio, interno: true })
        const variables = modo === 'paneo'
          ? { foto: f ? derivada(f.ruta, 'pano') : '', credito: credito(f), direccion: (i + j) % 2 ? 'izquierda' : 'derecha', duracion: d }
          : modo === 'tarjeta'
            ? { fondo: f ? derivada(f.ruta, 'fondo') : '', foto: f?.ruta || '', credito: credito(f), foto2: fotos.length > 1 && d > 2.4 ? fotos[(j + 1) % fotos.length].ruta : '', duracion: d }
            : { foto: f?.ruta || '', credito: credito(f), foco: visual.foco || '50% 35%', clave: j === 0 ? mayus(visual.pantalla) : '', duracion: d }
        escenas.push({ escena: ESCENA_VISUAL[modo], inicio: parte.inicio, duracion: d, capa: 1, variables })
      })
      giro++
      return
    }
    const d = redondear(fin - inicio)
    const variablesPorTipo = {
      dividida: { foto1: fotos[0]?.ruta || fotoGancho?.ruta || '', foto2: fotos[1]?.ruta || fotos[0]?.ruta || '', nombre1: mayus(visual.nombre1), nombre2: mayus(visual.nombre2), credito: fotos.map(f => f.credito).filter(Boolean).join(' · ') ? `Fotos: ${fotos.map(f => f.credito).filter(Boolean).join(' · ')}` : '' },
      dato: { fondo, etiqueta: mayus(visual.dato?.etiqueta), valor: Number(visual.dato?.valor) || 0, prefijo: visual.dato?.prefijo || '', sufijo: visual.dato?.sufijo ? ` ${String(visual.dato.sufijo).trim()}` : '', descripcion: visual.dato?.descripcion || '', fuente: reel?.fuente ? `Según ${reel.fuente}` : '' },
      cita: { fondo, cita: visual.cita?.texto || '', autor: mayus(visual.cita?.autor) },
      lista: { fondo, titulo: mayus(visual.lista?.titulo), item1: visual.lista?.items?.[0] || '', item2: visual.lista?.items?.[1] || '', item3: visual.lista?.items?.[2] || '' },
      marcador: { fondo, competencia: mayus(visual.marcador?.competencia), local: mayus(visual.marcador?.local), golesLocal: String(visual.marcador?.golesLocal ?? ''), visita: mayus(visual.marcador?.visita), golesVisita: String(visual.marcador?.golesVisita ?? ''), estado: mayus(visual.marcador?.estado) },
      versus: { fondo, equipo1: mayus(visual.versus?.equipo1), equipo2: mayus(visual.versus?.equipo2), detalle: mayus(visual.versus?.detalle) },
      pregunta: { fondo, pregunta: visual.pregunta || '', pista: 'Te leo en los comentarios' }
    }
    escenas.push({ escena: ESCENA_VISUAL[tipo], inicio, duracion: d, capa: 1, variables: { ...variablesPorTipo[tipo], duracion: d } })
    if (tipo === 'dato') sonido('subida', inicio - 1.05, 0.45)
  })

  // 3. Cierre: un solo llamado a la acción, con la flecha de bucle.
  const fotoCierre = beats.map(fotosDeBeat).reverse().find(l => l.length)?.[0] || fotoGancho
  cortes.push({ momento: cierre.inicio })
  escenas.push({ escena: 'reel-cta', inicio: cierre.inicio, duracion: redondear(duracionTotal - cierre.inicio), capa: 1, variables: {
    fondo: fotoCierre ? derivada(fotoCierre.ruta, 'fondo') : '', cta: mayus(reel?.cierre?.cta || 'Sigue a Ponte la 10'), web: reel?.cierre?.web || 'La nota completa en pont3la10.com', duracion: redondear(duracionTotal - cierre.inicio) } })

  // 4. Transiciones en cada corte: golpe y barrido alternados; falla digital en el re-gancho.
  let alterna = 0
  for (const corte of cortes) {
    const nombre = corte.rehook ? 'reel-glitch' : corte.interno ? 'reel-golpe' : (alterna++ % 2 === 0 ? 'reel-golpe' : 'reel-barrido')
    const tr = TRANSICION[nombre]
    escenas.push({ escena: nombre, inicio: redondear(Math.max(0, corte.momento - tr.corte)), duracion: tr.duracion, capa: 9 })
    sonido(tr.sonido, corte.momento - 0.08, corte.interno ? 0.35 : 0.6)
  }

  // 5. Capas: progreso, club, fuente y sello (OFICIAL / RUMOR).
  escenas.push({ escena: 'reel-progreso', inicio: 0, duracion: duracionTotal, capa: 7, variables: { duracion: duracionTotal } })
  if (reel?.club) {
    escenas.push({ escena: 'reel-etiqueta', inicio: cuerpo.inicio, duracion: redondear(cuerpo.fin - cuerpo.inicio), capa: 7, variables: { texto: mayus(reel.club), duracion: redondear(cuerpo.fin - cuerpo.inicio) } })
    sonido('pop', cuerpo.inicio + 0.1, 0.4)
  }
  if (reel?.fuente) {
    const nombre = String(reel.fuente).toLowerCase().split(/\s+/)[0]
    const dicha = cuerpo.palabras.find(p => p.texto.toLowerCase().includes(nombre)) || gancho.palabras.find(p => p.texto.toLowerCase().includes(nombre))
    const momento = dicha ? dicha.inicio : cuerpo.inicio + 0.4
    escenas.push({ escena: 'reel-fuente', inicio: redondear(momento), duracion: 2.8, capa: 7, variables: { texto: `SEGÚN ${mayus(reel.fuente)}`, duracion: 2.8 } })
  }
  const sello = reel?.rumor === true ? 'RUMOR' : mayus(reel?.alerta)
  if (sello) {
    escenas.push({ escena: 'reel-alerta', inicio: 0.35, duracion: 1.8, capa: 8, variables: { texto: sello, duracion: 1.8 } })
    sonido('golpe', 0.4, 0.6)
  }

  // 6. Subtítulos de toda la voz (grupos de 2–3 palabras; la palabra dicha en amarillo).
  const grupos = agruparPalabras(palabras, { maxPalabras: 3, maxSegundos: 1.4 }).map(grupo => ({
    inicio: redondear(Math.max(0.12, grupo[0].inicio - 0.05)), fin: redondear(grupo.at(-1).fin + 0.04), palabras: grupo
  }))
  grupos.forEach((g, i) => { if (grupos[i + 1] && g.fin > grupos[i + 1].inicio) g.fin = redondear(grupos[i + 1].inicio - 0.01) })
  escenas.push({ escena: 'reel-subtitulos', inicio: 0, duracion: duracionTotal, capa: 8, subtitulos: grupos, variables: { duracion: duracionTotal } })

  if (medios.length) for (const s of sonidos) s.volumen = redondear(s.volumen * 0.6)
  return { duracion: duracionTotal, escenas, sonidos, medios, segmentos, resumenFotos, palabras }
}

const atributo = valor => String(valor).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const texto = valor => String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** Escena de subtítulos con los grupos y tiempos escritos en el HTML (editables en el desktop de HyperFrames). */
export function htmlSubtitulos(plantilla, grupos, numero) {
  const nuevo = `rsub${numero}-`
  const cuerpo = grupos.map((g, i) => `      <div id="${nuevo}g${i + 1}" class="rsub-grupo" data-inicio="${g.inicio}" data-fin="${g.fin}">${g.palabras.map((p, j) =>
    `<span id="${nuevo}g${i + 1}-w${j + 1}" class="rsub-palabra" data-inicio="${p.inicio}" data-fin="${p.fin}">${texto(mayus(p.texto))}</span>`).join('')}</div>`).join('\n')
  return plantilla.replace(/<!--GRUPOS-->[\s\S]*?<!--\/GRUPOS-->/, `<!--GRUPOS-->\n${cuerpo}\n      <!--/GRUPOS-->`)
}

export function armarIndexReel(plan, titulo) {
  const contadores = {}
  const hosts = plan.escenas.map((escena, i) => {
    contadores[escena.escena] = (contadores[escena.escena] || 0) + 1
    escena.numero = contadores[escena.escena]
    escena.instancia = `${escena.escena}-${escena.numero}`
    const valores = escena.variables ? ` data-variable-values='${atributo(JSON.stringify(escena.variables))}'` : ''
    const pista = escena.escena === 'reel-subtitulos' ? 6 : escena.capa === 1 ? 1 : escena.capa === 2 ? 2 : escena.capa === 9 ? 7 : 3 + (i % 3)
    const tipo = escena.escena === 'reel-subtitulos' ? 'captions' : 'graphics'
    return `      <div id="${escena.instancia}"${valores} data-composition-id="${escena.instancia}" data-composition-src="compositions/${escena.instancia}.html" data-start="${escena.inicio}" data-duration="${escena.duracion}" data-track-index="${pista}" data-track-kind="${tipo}" data-width="1080" data-height="1920" style="z-index: ${escena.capa}"></div>`
  })
  const tomas = plan.medios.map((m, i) => m.tipo === 'video'
    ? `      <video id="toma-${i + 1}" class="clip" src="${atributo(m.archivo)}" data-start="${m.inicio}" data-duration="${m.duracion}" data-track-index="0" playsinline data-has-audio="true" style="position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; z-index: 1"></video>`
    : `      <audio id="toma-${i + 1}" class="clip" src="${atributo(m.archivo)}" data-start="${m.inicio}" data-duration="${m.duracion}" data-track-index="12" data-volume="1"></audio>`)
  // Cada efecto va a la primera pista libre (dos sonidos que se pisan no comparten pista en el editor).
  const finPorPista = []
  const efectos = plan.sonidos.slice().sort((a, b) => a.inicio - b.inicio).map((s, i) => {
    let pista = finPorPista.findIndex(fin => fin <= s.inicio)
    if (pista < 0) { pista = finPorPista.length; finPorPista.push(0) }
    finPorPista[pista] = s.inicio + s.duracion
    return `      <audio id="sfx-${i + 1}" class="clip" src="assets/sonidos/${s.archivo}.mp3" data-start="${s.inicio}" data-duration="${s.duracion}" data-track-index="${13 + pista}" data-volume="${s.volumen}"></audio>`
  })
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>${atributo(titulo)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; font-family: "Montserrat", sans-serif; }
    </style>
  </head>
  <body>
    <!-- Generado por scripts/video-generar-reel.mjs (Reel con guion propio, 9:16). -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${plan.duracion}" data-width="1080" data-height="1920">
${hosts.join('\n')}
${tomas.join('\n')}
${efectos.join('\n')}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`
}

export function textoTeleprompterReel(plan, reel) {
  const formato = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const partes = plan.segmentos.map(s => `[${formato(s.inicio)}–${formato(s.fin)}] ${s.tipo === 'cara' ? 'CARA' : 'VOZ'} · ${s.etiqueta}\n${s.texto}\n`)
  return `REEL ${reel?.id || ''} · ${reel?.club || ''}\nGancho en pantalla: ${reel?.gancho?.pantalla || ''}\n\n${partes.join('\n')}`
}

/** Descripción para Reels/Shorts: gancho, enlace a la nota, créditos y hashtags. */
export function descripcionDeReel(guion, atribucionMusica = '') {
  const partes = [String(guion?.descripcion || guion?.gancho?.texto || '').trim()]
  if (guion?.articuloSlug) partes.push(`Nota completa: ${SITIO}/articulos/${guion.articuloSlug}?utm_source=shorts&utm_medium=video&utm_campaign=reels_propios`)
  const creditos = [...new Set([guion?.gancho?.credito, ...(guion?.beats || []).flatMap(b => [b?.visual?.credito, b?.visual?.credito2])].filter(Boolean))]
  if (creditos.length) partes.push(`Fotos: ${creditos.join(' · ')}`)
  if (atribucionMusica) partes.push(atribucionMusica)
  const etiquetas = [...new Set(['#Shorts', ...(guion?.hashtags || []), '#FutbolColombiano', '#PonteLa10'])]
  partes.push(etiquetas.join(' '))
  return partes.filter(Boolean).join('\n\n').slice(0, 2200)
}

// Variantes de cada foto para vertical: fondo desenfocado (tarjetas y gráficos) y panorámica 16:9 (paneo).
async function variante(carpeta, ruta, tipo) {
  if (!ruta) return ''
  const relativa = ruta.replace(/\.jpg$/i, `-${tipo}.jpg`)
  const origen = join(carpeta, ruta)
  const destino = join(carpeta, relativa)
  if (!existsSync(origen)) return ''
  if (existsSync(destino) && (await stat(destino)).mtimeMs >= (await stat(origen)).mtimeMs) return relativa
  const filtro = tipo === 'fondo'
    ? 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:4,eq=brightness=-0.08:saturation=1.15'
    : 'scale=3414:1920:force_original_aspect_ratio=increase,crop=3414:1920'
  await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', origen, '-vf', filtro, '-q:v', '3', destino])
  return relativa
}

// Transcribe una toma una sola vez (se repite si la toma cambia). Sin faster-whisper, devuelve [] y se estima.
async function transcripcion(carpeta, tramo, grabacion) {
  if (!grabacion?.archivo) return []
  const audio = join(carpeta, grabacion.archivo)
  const cache = join(carpeta, 'assets', 'grabaciones', `${tramo}.palabras.json`)
  try {
    if (existsSync(cache) && (await stat(cache)).mtimeMs >= (await stat(audio)).mtimeMs) return JSON.parse(await readFile(cache, 'utf8'))
    await ejecutar('python', [join(RAIZ, 'scripts', 'video-transcribir.py'), audio, cache], { maxBuffer: 10 * 1024 * 1024, timeout: 10 * 60_000 })
    return JSON.parse(await readFile(cache, 'utf8'))
  } catch { return [] }
}

/** Arma (o vuelve a armar) el proyecto de un Reel. `guion` es el Reel con `tipo: "reel"`. */
export async function generarReel({ guion, salida, sinRed = false, transcribir = true }) {
  const config = JSON.parse(await readFile(join(RAIZ, 'config', 'reelsDiario.json'), 'utf8'))
  const rutaEstudio = join(salida, 'estudio.json')
  const estudio = existsSync(rutaEstudio) ? JSON.parse(await readFile(rutaEstudio, 'utf8')) : {}
  await mkdir(join(salida, 'compositions'), { recursive: true })
  await mkdir(join(salida, 'assets', 'fotos'), { recursive: true })
  await mkdir(join(salida, 'assets', 'sonidos'), { recursive: true })
  await writeFile(join(salida, 'guion.json'), JSON.stringify(guion, null, 1))

  const urls = [...new Set([guion?.gancho?.imagen, ...(guion?.beats || []).flatMap(b => [b?.visual?.imagen, b?.visual?.imagen2])].filter(Boolean))]
  const rutas = new Map()
  for (const [i, url] of urls.entries()) {
    const destino = `assets/fotos/foto-${i + 1}.jpg`
    if (existsSync(join(salida, destino))) { rutas.set(url, destino); continue }
    // «origen:assets/fotos/x.jpg» = una foto ya conseguida en el proyecto del video largo del día.
    if (String(url).startsWith('origen:')) {
      const original = guion.origen ? join(DIARIO, guion.origen, String(url).slice(7)) : ''
      if (original && existsSync(original) && !original.includes('..')) { await copyFile(original, join(salida, destino)); rutas.set(url, destino) } else rutas.set(url, '')
      continue
    }
    if (sinRed || !/^https?:\/\//.test(url)) { rutas.set(url, String(url).startsWith('assets/') ? url : ''); continue }
    try { await descargarFoto(url, join(salida, destino)); rutas.set(url, destino) } catch (error) {
      process.stderr.write(`No se pudo descargar una foto (${error.message}); se usa otra del Reel.\n`)
      rutas.set(url, '')
    }
  }
  const rutaFoto = url => (String(url).startsWith('assets/') ? (existsSync(join(salida, url)) ? url : '') : (rutas.get(url) ?? ''))
  const variantes = new Map()
  const pedidas = new Set()
  const derivadaPendiente = (ruta, tipo) => { if (ruta) pedidas.add(`${tipo}|${ruta}`); return variantes.get(`${tipo}|${ruta}`) ?? ruta }

  const transcripciones = {}
  if (transcribir) for (const tramo of tramosDeReel(guion)) transcripciones[tramo.id] = await transcripcion(salida, tramo.id, estudio.grabaciones?.[tramo.id])

  // Primera pasada para saber qué variantes hacen falta; se crean y se planifica de nuevo con sus rutas.
  planificarReel(guion, { ppm: config.formato.palabrasPorMinuto, estudio, transcripciones, rutaFoto, derivada: derivadaPendiente, maximoPorPlano: config.beats.segundosMaximosPorPlano })
  for (const clave of pedidas) {
    const [tipo, ruta] = [clave.slice(0, clave.indexOf('|')), clave.slice(clave.indexOf('|') + 1)]
    variantes.set(clave, await variante(salida, ruta, tipo).catch(() => ''))
  }
  const plan = planificarReel(guion, { ppm: config.formato.palabrasPorMinuto, estudio, transcripciones, rutaFoto, derivada: (ruta, tipo) => variantes.get(`${tipo}|${ruta}`) || ruta, maximoPorPlano: config.beats.segundosMaximosPorPlano })

  for (const nombre of await readdir(join(salida, 'compositions'))) if (nombre.endsWith('.html')) await rm(join(salida, 'compositions', nombre), { force: true })
  await writeFile(join(salida, 'index.html'), armarIndexReel(plan, guion.titulo || `Ponte la 10 · ${guion.id}`))
  for (const escena of plan.escenas) {
    const plantilla = await readFile(join(PACK, 'compositions', `${escena.escena}.html`), 'utf8')
    let html = instanciarEscena(plantilla, escena.escena, escena.numero, escena.duracion, escena.variables)
    if (escena.escena === 'reel-subtitulos') html = htmlSubtitulos(html, escena.subtitulos, escena.numero)
    await writeFile(join(salida, 'compositions', `${escena.instancia}.html`), html)
  }
  await writeFile(join(salida, IMAGEN_VACIA), Buffer.from(PNG_VACIO, 'base64'))
  for (const nombre of ['logo-blanco.png', 'isotipo.png']) await copyFile(join(PACK, 'assets', nombre), join(salida, 'assets', nombre))
  for (const nombre of await readdir(join(PACK, 'assets', 'sonidos'))) await copyFile(join(PACK, 'assets', 'sonidos', nombre), join(salida, 'assets', 'sonidos', nombre))
  for (const nombre of ['hyperframes.json', 'package.json', 'meta.json']) if (existsSync(join(PACK, nombre))) await copyFile(join(PACK, nombre), join(salida, nombre))
  await writeFile(join(salida, 'teleprompter.txt'), textoTeleprompterReel(plan, guion))
  await writeFile(join(salida, 'manifiesto.json'), JSON.stringify({ fecha: guion.fecha, tipo: 'reel', tituloVideo: guion.titulo, sinCamara: estudio.sinCamara !== false, duracion: plan.duracion, segmentos: plan.segmentos, fotos: plan.resumenFotos, titulares: {} }, null, 2))
  const vacios = plan.resumenFotos.reduce((s, r) => s + r.vacios, 0)
  return { salida, duracion: plan.duracion, escenas: plan.escenas.length, tomas: 0, grabados: plan.segmentos.filter(s => s.grabado).length, tramos: plan.segmentos.length, vacios }
}

export const carpetaDeReel = (proyecto, id) => join(DIARIO, `${proyecto}-reel-${String(id).replace(/^r/, '')}`)

/** Crea (o actualiza) un proyecto del estudio por cada Reel de `<proyecto>/guion-reels.json`. */
export async function crearProyectosReels({ proyecto, sinRed = false }) {
  const origen = join(DIARIO, proyecto)
  const archivo = join(origen, 'guion-reels.json')
  if (!existsSync(archivo)) throw Object.assign(new Error('Este proyecto no tiene guion-reels.json: la tarea de las 6 p. m. lo escribe con la skill de Reels.'), { estado: 409 })
  const guionReels = JSON.parse(await readFile(archivo, 'utf8'))
  const creados = []
  for (const [n, reel] of (guionReels.reels || []).entries()) {
    const salida = carpetaDeReel(proyecto, reel.id || `r${n + 1}`)
    await mkdir(salida, { recursive: true })
    const rutaEstudio = join(salida, 'estudio.json')
    if (!existsSync(rutaEstudio)) await writeFile(rutaEstudio, JSON.stringify({ sinCamara: true, nombre: `Reel ${n + 1} · ${reel.club || reel.titulo || ''}`.slice(0, 60), origen: proyecto, creado: new Date().toISOString() }, null, 2))
    const r = await generarReel({ guion: { ...reel, tipo: 'reel', fecha: guionReels.fecha, origen: proyecto }, salida, sinRed, transcribir: false })
    creados.push({ proyecto: salida.split(/[\\/]/).pop(), ...r })
  }
  return creados
}

async function main() {
  const args = process.argv.slice(2)
  const entrada = args.find(a => !a.startsWith('--'))
  if (!entrada) { process.stderr.write('Uso: node scripts/video-generar-reel.mjs <proyecto-del-dia> | --armar <proyecto-reel>\n'); process.exit(2) }
  if (args.includes('--armar')) {
    const salida = join(DIARIO, entrada)
    const guion = JSON.parse(await readFile(join(salida, 'guion.json'), 'utf8'))
    const r = await generarReel({ guion, salida, sinRed: args.includes('--sin-red') })
    process.stdout.write(`Reel armado en ${r.salida} · ${r.duracion} s · ${r.escenas} escenas · ${r.grabados}/${r.tramos} tramos grabados\n`)
    return
  }
  const creados = await crearProyectosReels({ proyecto: entrada, sinRed: args.includes('--sin-red') })
  for (const c of creados) process.stdout.write(`${c.proyecto}: ${c.duracion} s · ${c.escenas} escenas · ${c.vacios} fotos por poner\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
