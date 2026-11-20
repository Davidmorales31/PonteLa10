// Estado del render que ve el estudio: fase, porcentaje y tiempo transcurrido.
// Vive aparte del servidor para poder probarlo sin abrir el puerto.

/** Último porcentaje que imprimió HyperFrames en su registro (null si todavía no imprimió ninguno). */
export function porcentajeDeRegistro(registro) {
  const valores = [...String(registro || '').matchAll(/(\d{1,3})\s?%/g)].map(m => Number(m[1])).filter(n => n <= 100)
  return valores.length ? valores[valores.length - 1] : null
}

/** Render nuevo: arranca en la fase «armando» (el estudio vuelve a armar el video antes de renderizar). */
export function nuevoRender(ahora = Date.now()) {
  return { estado: 'renderizando', fase: 'armando', registro: '', iniciado: ahora, terminado: 0 }
}

/** Cierra el render con su resultado final y deja la hora de término para congelar el cronómetro. */
export function terminarRender(render, estado, ahora = Date.now()) {
  render.estado = estado
  render.fase = estado
  render.terminado = ahora
}

/** Lo que la página recibe: así el aviso sobrevive a recargar la página o cambiar de proyecto. */
export function estadoDeRender(render, ahora = Date.now()) {
  if (!render) return null
  const fin = render.estado === 'renderizando' ? ahora : (render.terminado || ahora)
  return {
    estado: render.estado,
    fase: render.fase,
    porcentaje: porcentajeDeRegistro(render.registro),
    segundos: Math.max(0, Math.round((fin - render.iniciado) / 1000)),
    registro: String(render.registro || '').slice(-1200)
  }
}
