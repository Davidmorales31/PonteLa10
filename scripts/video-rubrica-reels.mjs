// Rúbrica ejecutable de los Reels/Shorts con guion propio (guion-reels.json).
// Uso: node scripts/video-rubrica-reels.mjs <guion-reels.json> [--json]
// Sale con código 1 si algún Reel no se aprueba. Parámetros: config/reelsDiario.json (+ atribución de videoDiario.json).
// Reglas de fondo (investigación): docs/REELS_PROPIOS.md.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const contarPalabras = texto => String(texto || '').trim().split(/\s+/).filter(Boolean).length
const minusculas = valor => String(valor || '').toLowerCase()
const sinTildes = valor => minusculas(valor).normalize('NFD').replace(/[̀-ͯ]/g, '')
const contieneAlguno = (fuente, lista) => lista.some(palabra => sinTildes(fuente).includes(sinTildes(palabra)))
const tieneNombrePropio = texto => String(texto).split(/\s+/).some((palabra, i) => (i > 0 && /^[¡¿"«(]?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/.test(palabra)) || /^[¡¿"«(]?[A-ZÁÉÍÓÚÑ]{2,}\b/.test(palabra))
const NUMEROS = /\d|\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|veinte|treinta|cuarenta|cincuenta|cien|mil|millones?|primer[oa]?|segund[oa]|últim[oa])\b/i
const VOZ_CERCANA = ['les cuento', 'miren', 'ojo', 'para mí', 'imagínense', 'la verdad', 'fíjense', 'yo creo', 'atentos', 'mi gente', 'parce', 'qué tal esto']

/** Texto hablado completo del Reel (gancho + beats + cierre), en orden. */
export function textoHablado(reel) {
  return [reel?.gancho?.texto, ...(reel?.beats || []).map(b => b?.texto), reel?.cierre?.texto].filter(Boolean).join(' ')
}

export function duracionEstimada(reel, ppm) {
  return Math.round((contarPalabras(textoHablado(reel)) / ppm * 60 + 0.8) * 10) / 10
}

/** Todas las imágenes del Reel con su crédito (gancho y visuales de cada beat). */
export function imagenesDe(reel) {
  const lista = []
  if (reel?.gancho?.imagen) lista.push({ url: reel.gancho.imagen, credito: reel.gancho.credito })
  for (const beat of reel?.beats || []) {
    const v = beat?.visual || {}
    if (v.imagen) lista.push({ url: v.imagen, credito: v.credito })
    if (v.imagen2) lista.push({ url: v.imagen2, credito: v.credito2 })
  }
  return lista
}

export function evaluarReel(reel, config, atribucion) {
  const { formato, gancho, beats: cfgBeats, rehook, cierre, titulo, aprobacion } = config
  const criterios = []
  const agregar = (id, nombre, peso, ok, detalle) => criterios.push({ id, titulo: nombre, peso, ok: Boolean(ok), detalle })
  const beats = Array.isArray(reel?.beats) ? reel.beats : []
  const hablado = textoHablado(reel)
  const segundos = duracionEstimada(reel, formato.palabrasPorMinuto)

  agregar('duracion', `Dura entre ${formato.duracionMinimaSegundos} y ${formato.duracionMaximaSegundos} s`, 10,
    segundos >= formato.duracionMinimaSegundos && segundos <= formato.duracionMaximaSegundos, `${segundos} s a ${formato.palabrasPorMinuto} ppm`)

  const voz = String(reel?.gancho?.texto || '').trim()
  agregar('gancho-sin-saludo', 'El gancho no abre con saludo ni con «en este video»', 10,
    voz && !gancho.prohibidoEmpezarCon.some(p => sinTildes(voz).startsWith(sinTildes(p))), voz ? `«${voz.split(/\s+/).slice(0, 4).join(' ')}…»` : 'falta el gancho')
  agregar('gancho-corto', `Gancho hablado de máximo ${gancho.maximoPalabrasVoz} palabras (se resuelve antes del segundo 3)`, 6,
    contarPalabras(voz) > 0 && contarPalabras(voz) <= gancho.maximoPalabrasVoz, `${contarPalabras(voz)} palabras`)
  agregar('gancho-concreto', 'El gancho trae un nombre propio o una cifra', 8,
    tieneNombrePropio(voz) || NUMEROS.test(voz), voz ? 'ok si hay nombre o cifra' : 'falta el gancho')

  const pantalla = String(reel?.gancho?.pantalla || '').trim()
  const nPantalla = contarPalabras(pantalla)
  const resaltar = String(reel?.gancho?.resaltar || '').trim()
  agregar('pantalla-gancho', `Texto en pantalla del gancho de ${gancho.pantallaMinimoPalabras}–${gancho.pantallaMaximoPalabras} palabras con la palabra a resaltar dentro`, 8,
    nPantalla >= gancho.pantallaMinimoPalabras && nPantalla <= gancho.pantallaMaximoPalabras && (!resaltar || sinTildes(pantalla).includes(sinTildes(resaltar))),
    `${nPantalla} palabras${resaltar && !sinTildes(pantalla).includes(sinTildes(resaltar)) ? '; «resaltar» no está en el texto' : ''}`)

  agregar('beats-cantidad', `Entre ${cfgBeats.minimo} y ${cfgBeats.maximo} beats`, 5,
    beats.length >= cfgBeats.minimo && beats.length <= cfgBeats.maximo, `${beats.length} beats`)
  const largos = beats.filter(b => contarPalabras(b?.texto) > cfgBeats.palabrasMaximas).map(b => b.id)
  agregar('beats-cortos', `Cada beat de máximo ${cfgBeats.palabrasMaximas} palabras (una idea por beat)`, 5, !largos.length, largos.length ? `largos: ${largos.join(', ')}` : 'ok')

  const tipos = beats.map(b => b?.visual?.tipo || 'punch')
  const desconocidos = tipos.filter(t => !cfgBeats.tiposVisuales.includes(t))
  const repetidos = tipos.filter((t, i) => i > 0 && t === tipos[i - 1] && !['punch', 'paneo', 'tarjeta'].includes(t))
  agregar('variedad-visual', 'Al menos 3 tipos de visual distintos, sin repetir gráficos seguidos', 6,
    new Set(tipos).size >= 3 && !desconocidos.length && !repetidos.length,
    `${[...new Set(tipos)].join(', ')}${desconocidos.length ? `; desconocidos: ${desconocidos.join(', ')}` : ''}${repetidos.length ? '; gráficos repetidos seguidos' : ''}`)

  const encadenados = beats.slice(1).filter(b => contieneAlguno(String(b?.texto || '').split(/\s+/).slice(0, 6).join(' '), cfgBeats.conectores)).length
  agregar('encadenado', 'Los beats se encadenan con «pero / por eso / entonces», no con «y luego» (≥ 40 %)', 5,
    beats.length > 1 && encadenados / (beats.length - 1) >= 0.4, `${encadenados} de ${Math.max(0, beats.length - 1)}`)

  agregar('rehook', `Si pasa de ${rehook.desdeSegundos} s, un beat hace de re-gancho`, 5,
    segundos <= rehook.desdeSegundos || beats.some(b => b?.rehook === true), segundos <= rehook.desdeSegundos ? 'no hace falta' : beats.some(b => b?.rehook) ? 'ok' : 'falta un beat con «rehook»: true')

  const fuente = String(reel?.fuente || '').trim()
  agregar('fuente', 'Nombra la fuente en la voz («según …», «informó …»)', 10,
    fuente && (sinTildes(hablado).includes(sinTildes(fuente)) || contieneAlguno(hablado, atribucion.verbosValidos)), fuente ? `fuente: ${fuente}` : 'falta «fuente»')

  const imagenes = imagenesDe(reel)
  const sinCredito = imagenes.filter(i => !String(i.credito || '').trim())
  agregar('creditos', 'Toda foto es real y lleva crédito', 10, imagenes.length > 0 && !sinCredito.length,
    !imagenes.length ? 'no hay fotos' : sinCredito.length ? `${sinCredito.length} foto(s) sin crédito` : `${imagenes.length} fotos con crédito`)

  const esRumor = reel?.rumor === true
  agregar('rumor', 'Un rumor se cuenta como rumor y nunca lleva el sello «OFICIAL»', 10,
    !esRumor || (contieneAlguno(hablado, atribucion.marcasDeRumor) && sinTildes(reel?.alerta) !== 'oficial'), esRumor ? 'es rumor' : 'no es rumor')

  const textoCierre = String(reel?.cierre?.texto || '').trim()
  const ctaEnCuerpo = contieneAlguno([reel?.gancho?.texto, ...beats.map(b => b?.texto)].join(' '), ['suscríbete', 'síguenos', 'sígueme', 'dale like', 'comenta'])
  agregar('un-cta', `Un solo llamado a la acción, al final y en máximo ${cierre.maximoPalabras} palabras`, 8,
    textoCierre && contarPalabras(textoCierre) <= cierre.maximoPalabras && contieneAlguno(textoCierre, cierre.debeTraerUna) && !ctaEnCuerpo,
    !textoCierre ? 'falta el cierre' : ctaEnCuerpo ? 'hay un llamado a la acción antes del final' : `${contarPalabras(textoCierre)} palabras`)
  agregar('bucle', 'El cierre engancha con el inicio (bucle) o deja una pregunta', 3,
    reel?.cierre?.bucle === true || /\?/.test(textoCierre), reel?.cierre?.bucle ? 'bucle' : /\?/.test(textoCierre) ? 'pregunta' : 'no')

  const t = String(reel?.titulo || '').trim()
  agregar('titulo', `Título de ${titulo.caracteresMinimos}–${titulo.caracteresMaximos} caracteres que no repite el texto en pantalla`, 4,
    t.length >= titulo.caracteresMinimos && t.length <= titulo.caracteresMaximos && (!pantalla || !sinTildes(t).includes(sinTildes(pantalla))), `${t.length} caracteres`)

  agregar('voz-cercana', 'Voz cercana (les cuento, miren, ojo, para mí…)', 4, contieneAlguno(hablado, VOZ_CERCANA), contieneAlguno(hablado, VOZ_CERCANA) ? 'ok' : 'suena a noticiero')

  const club = String(reel?.club || '').split(/\s+/).filter(p => p.length > 3)
  agregar('palabra-clave', 'El club o protagonista se dice en el gancho (YouTube indexa lo hablado)', 3,
    !club.length || club.some(p => sinTildes(`${voz} ${pantalla}`).includes(sinTildes(p))), club.length ? reel.club : 'sin club')

  const pesoTotal = criterios.reduce((s, c) => s + c.peso, 0)
  const logrado = criterios.filter(c => c.ok).reduce((s, c) => s + c.peso, 0)
  const puntaje = Math.round(logrado / pesoTotal * 100)
  const obligatoriosFallidos = criterios.filter(c => aprobacion.criteriosObligatorios.includes(c.id) && !c.ok).map(c => c.id)
  return { id: reel?.id || '', puntaje, aprobado: puntaje >= aprobacion.puntajeMinimo && !obligatoriosFallidos.length, obligatoriosFallidos, duracionEstimadaSegundos: segundos, criterios }
}

export function evaluarGuionReels(guion, config, atribucion) {
  const reels = Array.isArray(guion?.reels) ? guion.reels : []
  const { minimo, maximo } = config.formato.reelsPorDia
  const resultados = reels.map(r => evaluarReel(r, config, atribucion))
  const ids = reels.map(r => r?.id)
  const problemas = []
  if (reels.length < minimo || reels.length > maximo) problemas.push(`hay ${reels.length} Reels (rango ${minimo}–${maximo})`)
  if (new Set(ids).size !== ids.length || ids.some(id => !/^r\d{1,2}$/.test(String(id)))) problemas.push('los ids deben ser r1, r2… y únicos')
  return { aprobado: !problemas.length && resultados.length > 0 && resultados.every(r => r.aprobado), problemas, reels: resultados }
}

async function main() {
  const args = process.argv.slice(2)
  const archivo = args.find(a => !a.startsWith('--'))
  if (!archivo) { process.stderr.write('Uso: node scripts/video-rubrica-reels.mjs <guion-reels.json> [--json]\n'); process.exit(2) }
  const config = JSON.parse(await readFile(fileURLToPath(new URL('../config/reelsDiario.json', import.meta.url)), 'utf8'))
  const { atribucion } = JSON.parse(await readFile(fileURLToPath(new URL('../config/videoDiario.json', import.meta.url)), 'utf8'))
  const resultado = evaluarGuionReels(JSON.parse(await readFile(resolve(archivo), 'utf8')), config, atribucion)
  if (args.includes('--json')) process.stdout.write(`${JSON.stringify(resultado, null, 2)}\n`)
  else {
    for (const r of resultado.reels) {
      process.stdout.write(`\n== Reel ${r.id} · ${r.puntaje}/100 · ${r.duracionEstimadaSegundos} s · ${r.aprobado ? 'APROBADO' : `NO APROBADO${r.obligatoriosFallidos.length ? ` (obligatorios: ${r.obligatoriosFallidos.join(', ')})` : ''}`}\n`)
      for (const c of r.criterios) process.stdout.write(`${c.ok ? 'OK ' : 'FALLA'} ${c.titulo}: ${c.detalle}\n`)
    }
    for (const p of resultado.problemas) process.stdout.write(`FALLA ${p}\n`)
    process.stdout.write(`\n${resultado.aprobado ? 'APROBADO' : 'NO APROBADO'}\n`)
  }
  process.exit(resultado.aprobado ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
