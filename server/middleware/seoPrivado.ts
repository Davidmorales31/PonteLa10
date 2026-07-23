export default defineEventHandler((evento) => {
  const ruta = getRequestPath(evento)

  if (ruta === '/login' || ruta.startsWith('/admin')) {
    evento.node?.res?.setHeader('X-Robots-Tag', 'noindex, nofollow')
  }

  if (ruta.startsWith('/admin')) {
    evento.node?.res?.setHeader('Cache-Control', 'private, no-store')
  }
})
