// Mapas del documental: proyecta los lugares de un visual «mapa» (Mercator), calcula el encuadre de cada paso de la
// cámara y recorta las costas de Natural Earth (videos/pack-pont3la10/assets/mapa/land-10m.json, paquete world-atlas,
// dominio público) a lo que se ve. La escena doc-mapa solo anima lo que sale de aquí.
// Dos modos: «lugares» (la cámara se acerca de lo general a lo particular: país → isla → ciudad) y «recorrido» (la
// cámara viaja de un lugar al siguiente dibujando la ruta y termina con todo el recorrido a la vista).

const ESCALA = 10 // unidades del mapa por grado de longitud
const R = (360 * ESCALA) / (2 * Math.PI)
const ASPECTO = 16 / 9
const redondear = n => Math.round(n * 10) / 10

export function proyectar(lon, lat) {
  const phi = Math.max(-85, Math.min(85, lat)) * Math.PI / 180
  return { x: (lon + 180) * ESCALA, y: -R * Math.log(Math.tan(Math.PI / 4 + phi / 2)) }
}

/** Encuadre 16:9 centrado en (x, y) con `ancho` grados de longitud. */
export function vistaCentrada(x, y, ancho) {
  const w = ancho * ESCALA
  const h = w / ASPECTO
  return [redondear(x - w / 2), redondear(y - h / 2), redondear(w), redondear(h)]
}

/** Encuadre 16:9 que contiene todos los puntos con margen (y un ancho mínimo en grados). */
export function vistaQueContiene(puntos, { margen = 0.18, anchoMinimo = 20 } = {}) {
  const xs = puntos.map(p => p.x)
  const ys = puntos.map(p => p.y)
  let w = Math.max(...xs) - Math.min(...xs)
  let h = Math.max(...ys) - Math.min(...ys)
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  w = Math.max(w * (1 + 2 * margen), anchoMinimo * ESCALA)
  h = h * (1 + 2 * margen)
  if (w / h < ASPECTO) w = h * ASPECTO
  else h = w / ASPECTO
  return [redondear(cx - w / 2), redondear(cy - h / 2), redondear(w), redondear(h)]
}

// La etiqueta va a la derecha del punto, salvo que se salga del encuadre (texto de ~40 px por letra × 0,62).
function lado(punto, vista, nombre) {
  const escala = 1920 / vista[2]
  const xPantalla = (punto.x - vista[0]) * escala
  return xPantalla + 60 + String(nombre).length * 26 > 1860 ? 'izq' : 'der'
}

/**
 * Plan del mapa sin tocar disco: puntos proyectados y pasos de cámara. `lugares` es el diccionario de
 * config/lugaresDocumental.json. Devuelve también los nombres que no están en el diccionario.
 */
export function planMapa(visual, lugares = {}) {
  const recorrido = Array.isArray(visual?.recorrido) && visual.recorrido.length > 0
  const nombres = recorrido ? visual.recorrido : (visual?.lugares || [])
  const faltan = nombres.filter(n => !lugares[n])
  const conocidos = nombres.filter(n => lugares[n]).map(n => ({ nombre: n, ...lugares[n], ...proyectar(lugares[n].lon, lugares[n].lat) }))
  if (!conocidos.length) return { mapa: null, faltan }
  const pasos = []
  if (!recorrido) {
    conocidos.forEach((p, i) => pasos.push({ vista: vistaCentrada(p.x, p.y, p.ancho || 10), puntos: [i] }))
  } else {
    conocidos.forEach((p, i) => {
      const vista = i === 0 ? vistaCentrada(p.x, p.y, Math.max(16, p.ancho || 20)) : vistaQueContiene([conocidos[i - 1], p], { anchoMinimo: p.ancho || 20 })
      pasos.push({ vista, puntos: [i] })
    })
    if (conocidos.length > 2) pasos.push({ vista: vistaQueContiene(conocidos, { margen: 0.08 }), puntos: [], resumen: true })
  }
  const puntos = conocidos.map((p, i) => {
    const paso = pasos.find(s => s.puntos.includes(i))
    return { nombre: p.nombre, x: redondear(p.x), y: redondear(p.y), lado: lado(p, paso.vista, p.nombre) }
  })
  return { mapa: { ruta: recorrido, pasos, puntos }, faltan }
}

/** Decodifica las costas (TopoJSON) a anillos ya proyectados: [[x, y], …]. */
export function anillosDeTopologia(topologia) {
  const [sx, sy] = topologia.transform.scale
  const [tx, ty] = topologia.transform.translate
  const arcos = topologia.arcs.map(arco => {
    let x = 0
    let y = 0
    return arco.map(([dx, dy]) => {
      x += dx
      y += dy
      const p = proyectar(x * sx + tx, y * sy + ty)
      return [p.x, p.y]
    })
  })
  const anillo = indices => {
    const puntos = []
    indices.forEach((indice, k) => {
      const arco = indice >= 0 ? arcos[indice] : [...arcos[~indice]].reverse()
      puntos.push(...(k === 0 ? arco : arco.slice(1)))
    })
    return puntos
  }
  const anillos = []
  const geometrias = topologia.objects.land.geometries || [topologia.objects.land]
  for (const g of geometrias) {
    const poligonos = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []
    for (const poligono of poligonos) for (const indices of poligono) anillos.push(anillo(indices))
  }
  return anillos
}

/**
 * Camino SVG de las costas que tocan alguno de los encuadres (con margen). Simplifica: descarta los puntos a menos de
 * medio píxel del anterior en el encuadre más cercano de todos.
 */
export function caminoTierra(anillos, vistas) {
  const minX = Math.min(...vistas.map(v => v[0]))
  const minY = Math.min(...vistas.map(v => v[1]))
  const maxX = Math.max(...vistas.map(v => v[0] + v[2]))
  const maxY = Math.max(...vistas.map(v => v[1] + v[3]))
  const margenX = (maxX - minX) * 0.3
  const margenY = (maxY - minY) * 0.3
  const tolerancia = Math.min(...vistas.map(v => v[2])) / 1920 * 0.5
  const partes = []
  for (const anillo of anillos) {
    let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity
    for (const [x, y] of anillo) { if (x < ax) ax = x; if (y < ay) ay = y; if (x > bx) bx = x; if (y > by) by = y }
    if (bx < minX - margenX || ax > maxX + margenX || by < minY - margenY || ay > maxY + margenY) continue
    let ultimo = null
    const puntos = []
    for (const [x, y] of anillo) {
      if (ultimo && Math.abs(x - ultimo[0]) < tolerancia && Math.abs(y - ultimo[1]) < tolerancia) continue
      puntos.push(`${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`)
      ultimo = [x, y]
    }
    if (puntos.length > 2) partes.push(`M${puntos.join('L')}Z`)
  }
  return partes.join('')
}
