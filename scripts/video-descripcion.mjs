// Descripción de YouTube del video diario: resumen, capítulos con tiempos reales, enlaces a las notas,
// créditos de las fotos y atribución de la música.
const SITIO = 'https://www.pont3la10.com'

export const marcaTiempo = segundos => {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

const recortar = (texto, maximo) => {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim()
  return limpio.length <= maximo ? limpio : `${limpio.slice(0, maximo - 1).replace(/\s+\S*$/, '')}…`
}

// Capítulos de YouTube: el primero en 0:00, al menos 3 y cada uno de 10 s o más.
export function capitulos({ guion, manifiesto, titulares = {} }) {
  const segmentos = manifiesto?.segmentos || []
  const lista = [{ inicio: 0, texto: 'Lo más importante del día' }]
  for (const bloque of guion?.bloques || []) {
    const cara = segmentos.find(s => s.id === `${bloque.id}-cara`)
    if (!cara) continue
    const titular = bloque.titular || titulares[bloque.articuloSlug] || bloque.caraBreve
    lista.push({ inicio: cara.inicio, texto: `${bloque.club ? `${bloque.club}: ` : ''}${recortar(titular, 60)}` })
  }
  const pregunta = segmentos.find(s => s.id === 'pregunta')
  if (pregunta) lista.push({ inicio: pregunta.inicio, texto: 'Tu opinión' })
  const limpia = []
  for (const capitulo of lista) {
    const anterior = limpia.at(-1)
    if (anterior && capitulo.inicio - anterior.inicio < 10) continue
    limpia.push(capitulo)
  }
  return limpia.length >= 3 ? limpia : []
}

export function creditosFotos(guion, estudio = {}) {
  const creditos = new Set()
  for (const bloque of guion?.bloques || []) {
    for (const plano of bloque.planos || []) if (plano?.imagen && plano.credito) creditos.add(plano.credito)
    for (const foto of (estudio.fotosExtra || {})[bloque.id] || []) if (foto.credito) creditos.add(foto.credito)
  }
  for (const clave of ['presentacion', 'pregunta']) for (const foto of (estudio.fotosExtra || {})[clave] || []) if (foto.credito) creditos.add(foto.credito)
  return [...creditos]
}

export function descripcionYoutube({ guion, manifiesto, estudio = {}, titulares = {}, atribucionMusica = '' }) {
  const partes = []
  const resumen = guion?.presentacion?.texto || guion?.gancho?.texto || ''
  if (resumen) partes.push(recortar(resumen, 300))
  const lista = capitulos({ guion, manifiesto, titulares })
  if (lista.length) partes.push(lista.map(c => `${marcaTiempo(c.inicio)} ${c.texto}`).join('\n'))
  const enlaces = (guion?.bloques || []).filter(b => b.articuloSlug).map(b => `• ${b.club ? `${b.club}: ` : ''}${SITIO}/articulos/${b.articuloSlug}?utm_source=youtube&utm_medium=video&utm_campaign=video_diario`)
  if (enlaces.length) partes.push(`Lee las notas completas:\n${enlaces.join('\n')}`)
  const creditos = creditosFotos(guion, estudio)
  if (creditos.length) partes.push(`Fotos: ${creditos.join(' · ')}`)
  if (atribucionMusica) partes.push(atribucionMusica)
  partes.push('Suscríbete y activa la campana para el resumen diario del fútbol colombiano.\n#FutbolColombiano #LigaBetPlay #Pont3la10')
  return partes.join('\n\n').slice(0, 5000)
}
