export default defineEventHandler((evento) => {
  const ruta = getRequestURL(evento).pathname
  const esRutaPrivada = ruta === '/login'
    || ruta === '/acceso-denegado'
    || ruta.startsWith('/admin')

  if (esRutaPrivada) {
    setResponseHeaders(evento, {
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
    })
  }

  if (ruta === '/acceso-denegado' || ruta.startsWith('/admin')) {
    setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  }
})
