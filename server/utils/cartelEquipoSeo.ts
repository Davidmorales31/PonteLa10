import type { EquipoLigaPublico } from '~/server/utils/equiposLigaPublicos'

export async function crearCartelEquipoSvg(
  equipo: EquipoLigaPublico,
  ancho: number,
  alto: number,
  obtenerEscudo: (nombreEquipo: string) => Promise<string | null> = async () => null
): Promise<string> {
  const clasificacion = equipo.clasificaciones[0]
  const competencia = nombreCompetencia(clasificacion?.competencia || '')
  const temporada = clasificacion?.temporada || 'Temporada actual'
  const fase = clasificacion?.fase ? ` · ${escaparSvg(clasificacion.fase)}` : ''
  const metadatos = clasificacion
    ? `Posición #${clasificacion.posicion} · ${clasificacion.puntos} puntos · ${temporada}${fase}`
    : 'Calendario, resultados y noticias verificadas'
  const radio = Math.round(alto * 0.22)
  const centroX = Math.round(ancho / 2)
  const centroY = Math.round(alto * 0.42)
  const nombre = escaparSvg(equipo.nombre)
  const escudo = await obtenerEscudo(equipo.nombre)
  const logo = escudo
    ? `<image href="${escudo}" x="${centroX - radio + 14}" y="${centroY - radio + 14}" width="${(radio - 14) * 2}" height="${(radio - 14) * 2}" preserveAspectRatio="xMidYMid meet" clip-path="url(#mascara-equipo)"/>`
    : `<text x="${centroX}" y="${centroY + 24}" text-anchor="middle" class="iniciales">${escaparSvg(iniciales(equipo.nombre))}</text>`
  const fuenteEquipo = Math.min(72, Math.floor(ancho * 0.78 / Math.max(equipo.nombre.length * 0.56, 1)))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
    <defs>
      <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#031126"/><stop offset=".55" stop-color="#0c3156"/><stop offset="1" stop-color="#06162b"/></linearGradient>
      <radialGradient id="luz"><stop stop-color="#1f75a8" stop-opacity=".62"/><stop offset="1" stop-color="#071b34" stop-opacity="0"/></radialGradient>
      <linearGradient id="borde" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#46c9ed"/><stop offset="1" stop-color="#f6c943"/></linearGradient>
      <clipPath id="mascara-equipo"><circle cx="${centroX}" cy="${centroY}" r="${radio - 15}"/></clipPath>
    </defs>
    <rect width="100%" height="100%" fill="url(#fondo)"/>
    <ellipse cx="${centroX}" cy="${centroY}" rx="${ancho * .48}" ry="${alto * .6}" fill="url(#luz)"/>
    <path d="M0 ${alto * .8} Q${ancho * .5} ${alto * .68} ${ancho} ${alto * .8} V${alto} H0Z" fill="#06172a" opacity=".82"/>
    <rect x="${ancho * .045}" y="${alto * .055}" width="${ancho * .91}" height="${alto * .89}" rx="32" fill="#05182f" fill-opacity=".48" stroke="url(#borde)" stroke-opacity=".72" stroke-width="3"/>
    <text x="${ancho * .09}" y="${alto * .14}" class="marca">Pont3la10</text>
    <text x="${ancho * .91}" y="${alto * .14}" text-anchor="end" class="competencia">${competencia}</text>
    <circle cx="${centroX}" cy="${centroY}" r="${radio + 9}" fill="#f4f7fb" stroke="#ffd33f" stroke-width="8"/>
    <circle cx="${centroX}" cy="${centroY}" r="${radio - 7}" fill="#12446b" stroke="#56dcff" stroke-width="5"/>
    ${logo}
    <text x="${centroX}" y="${alto * .77}" text-anchor="middle" class="equipo" font-size="${fuenteEquipo}">${nombre}</text>
    <text x="${centroX}" y="${alto * .86}" text-anchor="middle" class="detalle">${escaparSvg(metadatos)}</text>
    <text x="${centroX}" y="${alto * .93}" text-anchor="middle" class="marca-secundaria">Fútbol colombiano · Pont3la10.com</text>
    <style>.marca,.competencia,.iniciales,.equipo,.detalle,.marca-secundaria{font-family:Arial,sans-serif}.marca,.iniciales{font-weight:900}.competencia,.equipo{font-weight:800}.detalle,.marca-secundaria{font-weight:500}.marca,.iniciales,.equipo{fill:#fff}.marca{font-size:50px}.competencia{font-size:28px;fill:#8ceaff}.iniciales{font-size:${Math.round(radio * .55)}px}.detalle{font-size:27px;fill:#d6e4f3}.marca-secundaria{font-size:22px;fill:#a8c0d8}</style>
  </svg>`
}

function nombreCompetencia(valor: string): string {
  if (valor === 'torneo-betplay') return 'TORNEO BETPLAY'
  if (valor === 'copa-colombia') return 'COPA COLOMBIA'
  return 'LIGA BETPLAY'
}

function iniciales(nombre: string): string {
  return nombre.split(/\s+/).filter(parte => /[\p{L}\p{N}]/u.test(parte)).slice(0, 2)
    .map(parte => parte[0]).join('').toLocaleUpperCase('es-CO')
}

function escaparSvg(valor: string): string {
  const entidades: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }
  return valor.replace(/[&<>"']/g, caracter => entidades[caracter]!)
}
