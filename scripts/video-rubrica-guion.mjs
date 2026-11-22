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

const EMOJI = /\p{Extended_Pictographic}/gu
const palabrasEnMayusculas = texto => (String(texto).match(/\b[A-ZÁÉÍÓÚÑ]{3,}\b/g) || []).length
// Nombre propio: una palabra con mayúscula inicial que no abre la frase, o una sigla (DIM, VAR).
const tieneNombrePropio = texto => String(texto).split(/\s+/).some((palabra, i) => (i > 0 && /^[¡¿"«(]?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/.test(palabra)) || /^[¡¿"«(]?[A-ZÁÉÍÓÚÑ]{2,}\b/.test(palabra))

// Revisa los títulos A/B: cantidad, largo, distintos entre sí y con un nombre propio en los primeros caracteres.
export function revisarTitulos(titulos, reglas) {
  const lista = Array.isArray(titulos) ? titulos.map(t => String(t || '').trim()) : []
  const problemas = []
  if (lista.length !== reglas.cantidad) problemas.push(`se esperan ${reglas.cantidad} títulos y hay ${lista.length}`)
  if (new Set(lista.map(t => t.toLowerCase())).size !== lista.length) problemas.push('hay títulos repetidos')
  lista.forEach((t, i) => {
    if (t.length < reglas.caracteresMinimos || t.length > reglas.caracteresMaximos) problemas.push(`título ${i + 1}: ${t.length} caracteres (rango ${reglas.caracteresMinimos}–${reglas.caracteresMaximos})`)
    if (!tieneNombrePropio(t.slice(0, reglas.claveEnLosPrimeros))) problemas.push(`título ${i + 1}: sin nombre propio en los primeros ${reglas.claveEnLosPrimeros} caracteres`)
    if (palabrasEnMayusculas(t) > reglas.maximoPalabrasEnMayusculas) problemas.push(`título ${i + 1}: demasiadas palabras en mayúsculas`)
    if ((t.match(EMOJI) || []).length > reglas.maximoEmojis) problemas.push(`título ${i + 1}: más de ${reglas.maximoEmojis} emoji`)
  })
  return problemas
}

// El texto de la miniatura es corto (2–5 palabras), no copia el título y marca una palabra a resaltar que está en el texto.
export function revisarMiniatura(miniatura, titulos, reglas) {
  const texto = String(miniatura?.texto || '').trim()
  const problemas = []
  const palabras = texto.split(/\s+/).filter(Boolean)
  if (palabras.length < reglas.palabrasMinimas || palabras.length > reglas.palabrasMaximas) problemas.push(`${palabras.length} palabras (rango ${reglas.palabrasMinimas}–${reglas.palabrasMaximas})`)
  if (texto.length > reglas.caracteresMaximos) problemas.push(`${texto.length} caracteres (máximo ${reglas.caracteresMaximos})`)
  if (texto && titulos.some(t => String(t).toLowerCase().includes(texto.toLowerCase()))) problemas.push('repite el título; debe sumar información')
  if (miniatura?.resaltar && !texto.toLowerCase().includes(String(miniatura.resaltar).toLowerCase())) problemas.push('la palabra a resaltar no está en el texto')
  return problemas
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

  // Estructura directa (2026-11-22): la noticia se cuenta de una vez, sin «intro» a cámara ni presentación larga.
  const estructura = config.estructura || {}
  const conIntro = bloques.filter(bloque => String(bloque.caraBreve || '').trim()).map(bloque => bloque.id)
  const palabrasPresentacion = contarPalabras(guion?.presentacion?.texto)
  const presentacionLarga = palabrasPresentacion > (estructura.presentacionMaximoPalabras ?? 15)
  const marcada = !estructura.requerida || guion?.estructura === estructura.requerida
  agregar('noticia_directa', 'Cada noticia va directa, sin intro a cámara ni presentación larga', 10, bloques.length > 0 && !conIntro.length && !presentacionLarga && marcada,
    [conIntro.length ? `con caraBreve: ${conIntro.join(', ')}` : '', presentacionLarga ? `presentación de ${palabrasPresentacion} palabras` : '', marcada ? '' : `falta "estructura": "${estructura.requerida}"`].filter(Boolean).join('; ') || 'ok')

  if (cfgBloques.tamanos) {
    const tamanoDe = palabras => (palabras <= cfgBloques.tamanos.rapida[1] ? 'rapida' : palabras >= cfgBloques.tamanos.fuerte[0] ? 'fuerte' : 'normal')
    const tamanos = bloques.map(bloque => tamanoDe(contarPalabras(bloque.voz)))
    let racha = 0
    let rachaMaxima = 0
    tamanos.forEach((tamano, i) => { racha = i && tamano === tamanos[i - 1] ? racha + 1 : 1; rachaMaxima = Math.max(rachaMaxima, racha) })
    const limite = cfgBloques.maximoSeguidosMismoTamano ?? 2
    const ok = tamanos.includes('rapida') && tamanos.includes('fuerte') && rachaMaxima <= limite
    agregar('ritmo_variado', 'Noticias de largo variado (rápidas, normales y fuertes)', 10, bloques.length > 0 && ok,
      `${tamanos.filter(t => t === 'rapida').length} rápidas, ${tamanos.filter(t => t === 'normal').length} normales, ${tamanos.filter(t => t === 'fuerte').length} fuertes; máximo ${rachaMaxima} seguidas del mismo largo (tope ${limite})`)
  }

  if (cfgBloques.bloquesPorPregunta) {
    const conPregunta = bloques.filter(bloque => /\?/.test(bloque.voz || '')).length
    const minimo = Math.floor(bloques.length / cfgBloques.bloquesPorPregunta)
    agregar('preguntas_publico', 'Preguntas al público a lo largo del video', 5, conPregunta >= minimo,
      `${conPregunta} noticias con pregunta (mínimo ${minimo}, una cada ${cfgBloques.bloquesPorPregunta})`)
  }

  const entradas = bloques.map(bloque => texto(bloque.voz).replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).join(' '))
  const repetidas = [...new Set(entradas.filter((entrada, i) => entrada && entradas.indexOf(entrada) !== i))]
  agregar('entradas_variadas', 'Ninguna noticia arranca igual que otra', 5, !repetidas.length,
    repetidas.length ? `se repite el arranque: ${repetidas.join(', ')}` : 'ok')

  const pocosPlanos = bloques.filter(bloque => {
    const segundos = segundosPara(palabrasDeBloque(bloque), formato.palabrasPorMinuto)
    return (bloque.planos?.length || 0) < Math.ceil(segundos / cfgBloques.segundosPorPlano)
  }).map(bloque => bloque.id)
  agregar('cambio_visual', `Un plano o zoom cada ${cfgBloques.segundosPorPlano} s`, 10, bloques.length > 0 && !pocosPlanos.length,
    pocosPlanos.length ? `planos insuficientes: ${pocosPlanos.join(', ')}` : 'ok')

  const sinCredito = bloques.filter(bloque => !(bloque.planos || []).some(plano => plano.imagen) || (bloque.planos || []).some(plano => plano.imagen && !plano.credito)).map(bloque => bloque.id)
  agregar('fotos_con_credito', 'Toda foto lleva crédito', 10, bloques.length > 0 && !sinCredito.length,
    sinCredito.length ? `foto sin crédito o bloque sin foto: ${sinCredito.join(', ')}` : 'ok')

  if (config.tono) {
    const marcas = config.tono.marcas.map(marca => new RegExp(`(^|[^\\p{L}])${marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}])`, 'iu'))
    const cercanos = bloques.filter(bloque => marcas.some(re => re.test(`${bloque.caraBreve || ''} ${bloque.voz || ''}`)))
    const proporcion = bloques.length ? cercanos.length / bloques.length : 0
    agregar('tono_cercano', 'Narración cercana (primera persona, le habla al público)', 5, proporcion >= config.tono.proporcionMinimaBloques,
      `${cercanos.length} de ${bloques.length} bloques con voz cercana (mínimo ${Math.round(config.tono.proporcionMinimaBloques * 100)} %)`)
  }

  agregar('pregunta_final', 'Pregunta final que invita a comentar', 5, /\?/.test(guion?.preguntaFinal || ''),
    /\?/.test(guion?.preguntaFinal || '') ? 'ok' : 'falta la pregunta final')

  const cierreTexto = guion?.cierre?.texto || ''
  agregar('cierre', 'Cierre corto con invitación a suscribirse', 5,
    contarPalabras(cierreTexto) > 0 && contarPalabras(cierreTexto) <= cierre.maximoPalabras && contieneAlguno(cierreTexto, cierre.debeInvitarA),
    `${contarPalabras(cierreTexto)} palabras (máximo ${cierre.maximoPalabras})`)

  const titulo = String(guion?.tituloVideo || guion?.titulos?.[0] || '')
  const partes = titulo.split('|').map(parte => parte.trim()).filter(Boolean)
  agregar('titulo_video', 'Título con largo adecuado y sin exceso de ganchos', 5,
    titulo.length >= tituloVideo.caracteresMinimos && titulo.length <= tituloVideo.caracteresMaximos && partes.length <= tituloVideo.maximoGanchosConBarra,
    `${titulo.length} caracteres, ${partes.length} parte(s)`)

  if (config.titulos) {
    const problemas = revisarTitulos(guion?.titulos, config.titulos)
    agregar('titulos_ab', `${config.titulos.cantidad} títulos distintos para la prueba A/B`, 5, !problemas.length, problemas.length ? problemas.join('; ') : 'ok')
  }
  if (config.miniatura) {
    const problemas = revisarMiniatura(guion?.miniatura, guion?.titulos || [titulo], config.miniatura)
    agregar('miniatura_texto', 'Texto corto de miniatura que no repite el título', 5, !problemas.length, problemas.length ? problemas.join('; ') : 'ok')
  }

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
