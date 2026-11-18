// Rúbrica ejecutable del guion del video diario de Pont3la10.
// Uso: node scripts/video-rubrica-guion.mjs <guion.json> [--json]
// Sale con código 1 si el guion no se aprueba. Los parámetros viven en config/videoDiario.json.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function contarPalabras(texto) {
  return String(texto || '').trim().split(/\s+/).filter(Boolean).length
}

export function segundosPara(palabras, palabrasPorMinuto) {
  return (palabras / palabrasPorMinuto) * 60
}

const texto = valor => String(valor || '').toLowerCase()
const contieneAlguno = (fuente, lista) => lista.some(palabra => texto(fuente).includes(palabra))

function palabrasDeBloque(bloque) {
  return contarPalabras(bloque.caraBreve) + contarPalabras(bloque.voz)
}

export function evaluarGuion(guion, config) {
  const { formato, gancho, bloques: cfgBloques, cierre, tituloVideo, atribucion, aprobacion } = config
  const bloques = Array.isArray(guion?.bloques) ? guion.bloques : []
  const criterios = []
  const agregar = (id, titulo, peso, ok, detalle) => criterios.push({ id, titulo, peso, ok: Boolean(ok), detalle })

  const palabrasGancho = contarPalabras(guion?.gancho?.texto)
  const palabrasTotales = palabrasGancho
    + contarPalabras(guion?.presentacion?.texto)
    + bloques.reduce((suma, bloque) => suma + palabrasDeBloque(bloque), 0)
    + contarPalabras(guion?.preguntaFinal)
    + contarPalabras(guion?.cierre?.texto)
  const duracion = Math.round(segundosPara(palabrasTotales, formato.palabrasPorMinuto))

  agregar('duracion_total', 'Duración estimada dentro del rango', 15,
    duracion >= formato.duracionMinimaSegundos && duracion <= formato.duracionMaximaSegundos,
    `${duracion} s estimados (${palabrasTotales} palabras a ${formato.palabrasPorMinuto} ppm); rango ${formato.duracionMinimaSegundos}–${formato.duracionMaximaSegundos} s`)

  const empiezaConSaludo = contieneAlguno(texto(guion?.gancho?.texto).slice(0, 25), gancho.prohibidoEmpezarCon)
  agregar('gancho_sin_saludo', 'Gancho sin saludo y de ≤ 10 s', 15,
    palabrasGancho > 0 && palabrasGancho <= gancho.maximoPalabras && !empiezaConSaludo,
    `${palabrasGancho} palabras (máximo ${gancho.maximoPalabras})${empiezaConSaludo ? '; empieza con saludo' : ''}`)

  const ganchoConDato = /\d/.test(guion?.gancho?.texto || '') || /["“”«»]/.test(guion?.gancho?.texto || '') || Boolean(guion?.gancho?.fuente)
  agregar('gancho_con_dato', 'Gancho con cifra, cita o fuente', 10, ganchoConDato, ganchoConDato ? 'ok' : 'el gancho no trae dato duro, cita ni fuente')

  agregar('numero_bloques', 'Cantidad de bloques de noticia', 10,
    bloques.length >= cfgBloques.minimo && bloques.length <= cfgBloques.maximo,
    `${bloques.length} bloques (rango ${cfgBloques.minimo}–${cfgBloques.maximo})`)

  const fueraDeLargo = bloques.filter(bloque => {
    const palabras = contarPalabras(bloque.voz)
    return palabras < cfgBloques.palabrasMinimas || palabras > cfgBloques.palabrasMaximas
  }).map(bloque => bloque.id)
  agregar('largo_bloques', 'Largo de cada bloque (voz)', 10, bloques.length > 0 && !fueraDeLargo.length,
    fueraDeLargo.length ? `fuera de ${cfgBloques.palabrasMinimas}–${cfgBloques.palabrasMaximas} palabras: ${fueraDeLargo.join(', ')}` : 'ok')

  const sinFuente = bloques.filter(bloque => {
    const atribuido = contieneAlguno(bloque.voz, atribucion.verbosValidos) || (bloque.fuente && texto(bloque.voz).includes(texto(bloque.fuente)))
    return !bloque.fuente || !bloque.articuloSlug || !atribuido
  }).map(bloque => bloque.id)
  agregar('bloques_con_fuente', 'Cada bloque nombra su fuente en el texto y enlaza su artículo', 15, bloques.length > 0 && !sinFuente.length,
    sinFuente.length ? `sin fuente atribuida o sin artículo: ${sinFuente.join(', ')}` : 'ok')

  const rumoresSueltos = bloques.filter(bloque => bloque.rumor && !contieneAlguno(bloque.voz, atribucion.marcasDeRumor)).map(bloque => bloque.id)
  agregar('rumor_atribuido', 'Los rumores se cuentan como rumor', 10, !rumoresSueltos.length,
    rumoresSueltos.length ? `rumor sin marca de duda: ${rumoresSueltos.join(', ')}` : 'ok')

  const sinCara = bloques.filter(bloque => !bloque.caraBreve || contarPalabras(bloque.caraBreve) > cfgBloques.caraBreveMaximoPalabras).map(bloque => bloque.id)
  agregar('cara_por_noticia', 'Toma breve con tu cara en cada noticia', 5, bloques.length > 0 && !sinCara.length,
    sinCara.length ? `falta o es larga (máx. ${cfgBloques.caraBreveMaximoPalabras} palabras): ${sinCara.join(', ')}` : 'ok')

  const pocosPlanos = bloques.filter(bloque => {
    const segundos = segundosPara(palabrasDeBloque(bloque), formato.palabrasPorMinuto)
    return (bloque.planos?.length || 0) < Math.ceil(segundos / cfgBloques.segundosPorPlano)
  }).map(bloque => bloque.id)
  agregar('cambio_visual', `Un plano o zoom cada ${cfgBloques.segundosPorPlano} s`, 10, bloques.length > 0 && !pocosPlanos.length,
    pocosPlanos.length ? `planos insuficientes: ${pocosPlanos.join(', ')}` : 'ok')

  const sinCredito = bloques.filter(bloque => !(bloque.planos || []).some(plano => plano.imagen) || (bloque.planos || []).some(plano => plano.imagen && !plano.credito)).map(bloque => bloque.id)
  agregar('fotos_con_credito', 'Toda foto lleva crédito', 10, bloques.length > 0 && !sinCredito.length,
    sinCredito.length ? `foto sin crédito o bloque sin foto: ${sinCredito.join(', ')}` : 'ok')

  agregar('pregunta_final', 'Pregunta final que invita a comentar', 5, /\?/.test(guion?.preguntaFinal || ''),
    /\?/.test(guion?.preguntaFinal || '') ? 'ok' : 'falta la pregunta final')

  const cierreTexto = guion?.cierre?.texto || ''
  agregar('cierre', 'Cierre corto con invitación a suscribirse', 5,
    contarPalabras(cierreTexto) > 0 && contarPalabras(cierreTexto) <= cierre.maximoPalabras && contieneAlguno(cierreTexto, cierre.debeInvitarA),
    `${contarPalabras(cierreTexto)} palabras (máximo ${cierre.maximoPalabras})`)

  const titulo = String(guion?.tituloVideo || '')
  const partes = titulo.split('|').map(parte => parte.trim()).filter(Boolean)
  agregar('titulo_video', 'Título con largo adecuado y sin exceso de ganchos', 5,
    titulo.length >= tituloVideo.caracteresMinimos && titulo.length <= tituloVideo.caracteresMaximos && partes.length <= tituloVideo.maximoGanchosConBarra,
    `${titulo.length} caracteres, ${partes.length} parte(s)`)

  const pesoTotal = criterios.reduce((suma, criterio) => suma + criterio.peso, 0)
  const pesoLogrado = criterios.filter(criterio => criterio.ok).reduce((suma, criterio) => suma + criterio.peso, 0)
  const puntaje = Math.round((pesoLogrado / pesoTotal) * 100)
  const obligatoriosFallidos = criterios.filter(criterio => aprobacion.criteriosObligatorios.includes(criterio.id) && !criterio.ok).map(criterio => criterio.id)
  return {
    puntaje,
    aprobado: puntaje >= aprobacion.puntajeMinimo && !obligatoriosFallidos.length,
    obligatoriosFallidos,
    duracionEstimadaSegundos: duracion,
    palabrasTotales,
    criterios
  }
}

async function main() {
  const args = process.argv.slice(2)
  const archivo = args.find(argumento => !argumento.startsWith('--'))
  if (!archivo) {
    process.stderr.write('Uso: node scripts/video-rubrica-guion.mjs <guion.json> [--json]\n')
    process.exit(2)
  }
  const config = JSON.parse(await readFile(fileURLToPath(new URL('../config/videoDiario.json', import.meta.url)), 'utf8'))
  const guion = JSON.parse(await readFile(resolve(archivo), 'utf8'))
  const resultado = evaluarGuion(guion, config)
  if (args.includes('--json')) process.stdout.write(`${JSON.stringify(resultado, null, 2)}\n`)
  else {
    for (const criterio of resultado.criterios) process.stdout.write(`${criterio.ok ? 'OK ' : 'FALLA'} ${criterio.titulo}: ${criterio.detalle}\n`)
    process.stdout.write(`\nPuntaje ${resultado.puntaje}/100 · ${resultado.duracionEstimadaSegundos} s · ${resultado.aprobado ? 'APROBADO' : `NO APROBADO${resultado.obligatoriosFallidos.length ? ` (obligatorios: ${resultado.obligatoriosFallidos.join(', ')})` : ''}`}\n`)
  }
  process.exit(resultado.aprobado ? 0 : 1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
