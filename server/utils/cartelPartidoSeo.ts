import type { PartidoSeoPublico } from '~/server/utils/partidosSeoPublicos'
import { obtenerEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'
import { etiquetaEstadoSeoPartido } from '~/utils/schemaPartidoSeo'

export function crearCartelSvg(
  partido: PartidoSeoPublico,
  ancho: number,
  alto: number
): string {
  const vertical = alto > ancho
  const competencia = partido.competencia === 'torneo-betplay'
    ? 'TORNEO BETPLAY'
    : partido.competencia === 'copa-colombia' ? 'COPA COLOMBIA' : 'LIGA BETPLAY'
  const estadoVisible = etiquetaEstadoSeoPartido(partido.estado)
  const fecha = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota'
  }).format(new Date(partido.fechaIso)) + ' · HORA DE COLOMBIA'
  const local = escaparSvg(partido.local)
  const visitante = escaparSvg(partido.visitante)
  const jornada = partido.jornada ? ` · ${escaparSvg(partido.jornada)}` : ''
  const marcador = partido.golesLocal !== null && partido.golesVisitante !== null
    ? `${partido.golesLocal} – ${partido.golesVisitante}`
    : 'VS'
  const radio = vertical ? 108 : Math.min(116, Math.floor(alto * 0.19))
  const centroY = vertical ? Math.round(alto * 0.44) : Math.round(alto * 0.51)
  const lateralLocal = vertical ? Math.round(ancho * 0.27) : Math.round(ancho * 0.28)
  const lateralVisitante = vertical ? Math.round(ancho * 0.73) : Math.round(ancho * 0.72)
  const fuenteEquipo = vertical ? 36 : Math.min(52, Math.floor(ancho * 0.046))
  const fuenteDetalle = vertical ? 24 : 26
  const anchoEstado = estadoVisible.length > 18 ? 460 : estadoVisible.length > 12 ? 360 : 290
  const altoEstado = 54
  const esEnVivo = estadoVisible === 'EN VIVO'
  const posicionTextoEstado = ancho / 2 + (esEnVivo ? 25 : 0)
  const inicialesLocal = escaparSvg(iniciales(partido.local))
  const inicialesVisitante = escaparSvg(iniciales(partido.visitante))
  const escudoLocal = obtenerEscudoPartidoSeo(partido.local)
  const escudoVisitante = obtenerEscudoPartidoSeo(partido.visitante)
  const logoLocal = escudoLocal
    ? `<image href="${escudoLocal}" x="${lateralLocal - radio + 12}" y="${centroY - radio + 12}" width="${(radio - 12) * 2}" height="${(radio - 12) * 2}" preserveAspectRatio="xMidYMid meet" clip-path="url(#mascara-local)"/>`
    : `<text x="${lateralLocal}" y="${centroY + 15}" text-anchor="middle" class="iniciales" font-size="${Math.min(radio * .55, 58)}">${inicialesLocal}</text>`
  const logoVisitante = escudoVisitante
    ? `<image href="${escudoVisitante}" x="${lateralVisitante - radio + 12}" y="${centroY - radio + 12}" width="${(radio - 12) * 2}" height="${(radio - 12) * 2}" preserveAspectRatio="xMidYMid meet" clip-path="url(#mascara-visitante)"/>`
    : `<text x="${lateralVisitante}" y="${centroY + 15}" text-anchor="middle" class="iniciales" font-size="${Math.min(radio * .55, 58)}">${inicialesVisitante}</text>`
  const estadio = partido.estadio ? escaparSvg(partido.estadio) : 'Estadio por confirmar'
  const ciudad = partido.ciudad ? escaparSvg(partido.ciudad) : ''
  const lugar = [estadio, ciudad].filter(Boolean).join(' · ')
  const textoEquipo = vertical
    ? `<text x="${ancho / 2}" y="${centroY + radio + 66}" text-anchor="middle" class="equipo" font-size="${fuenteEquipo}">${local}</text>
       <text x="${ancho / 2}" y="${centroY + radio + 116}" text-anchor="middle" class="equipo" font-size="${fuenteEquipo}">${visitante}</text>`
    : `<text x="${lateralLocal}" y="${centroY + radio + 54}" text-anchor="middle" class="equipo" font-size="${fuenteEquipo}">${local}</text>
       <text x="${lateralVisitante}" y="${centroY + radio + 54}" text-anchor="middle" class="equipo" font-size="${fuenteEquipo}">${visitante}</text>`
  const textoLugarY = Math.round(alto * 0.82)
  const textoFechaY = Math.round(alto * 0.88)
  const textoPieY = Math.round(alto * 0.94)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
    <defs>
      <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#031126"/><stop offset=".55" stop-color="#0c3156"/><stop offset="1" stop-color="#06162b"/></linearGradient>
      <radialGradient id="luz"><stop stop-color="#1f75a8" stop-opacity=".5"/><stop offset="1" stop-color="#071b34" stop-opacity="0"/></radialGradient>
      <linearGradient id="borde" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#46c9ed"/><stop offset="1" stop-color="#f6c943"/></linearGradient>
      <clipPath id="mascara-local"><circle cx="${lateralLocal}" cy="${centroY}" r="${radio - 12}"/></clipPath>
      <clipPath id="mascara-visitante"><circle cx="${lateralVisitante}" cy="${centroY}" r="${radio - 12}"/></clipPath>
    </defs>
    <rect width="100%" height="100%" fill="url(#fondo)"/>
    <ellipse cx="${ancho / 2}" cy="${centroY}" rx="${ancho * .53}" ry="${alto * .5}" fill="url(#luz)"/>
    <path d="M0 ${alto * .8} Q${ancho * .5} ${alto * .67} ${ancho} ${alto * .8} V${alto} H0Z" fill="#06172a" opacity=".82"/>
    <rect x="${ancho * .05}" y="${alto * .045}" width="${ancho * .9}" height="${alto * .91}" rx="32" fill="#05182f" fill-opacity=".48" stroke="url(#borde)" stroke-opacity=".7" stroke-width="3"/>
    <text x="${ancho * .09}" y="${alto * .13}" class="marca" font-size="${vertical ? 42 : 50}">Pont3la10</text>
    <text x="${ancho * .91}" y="${alto * .13}" text-anchor="end" class="competencia" font-size="${vertical ? 24 : 28}">${competencia}${jornada}</text>
    <rect x="${ancho / 2 - anchoEstado / 2}" y="${alto * .18}" width="${anchoEstado}" height="${altoEstado}" rx="27" fill="${esEnVivo ? '#b91c34' : '#123e61'}"/>
    ${esEnVivo ? `<circle cx="${ancho / 2 - anchoEstado / 2 + 38}" cy="${alto * .18 + 27}" r="8" fill="#fff"/>` : ''}
    <text x="${posicionTextoEstado}" y="${alto * .18 + 37}" text-anchor="middle" class="estado" font-size="${estadoVisible.length > 18 ? 21 : 24}">${estadoVisible}</text>
    <circle cx="${lateralLocal}" cy="${centroY}" r="${radio + 8}" fill="#f4f7fb" stroke="#ffd33f" stroke-width="8"/>
    <circle cx="${lateralLocal}" cy="${centroY}" r="${radio - 5}" fill="#12446b" stroke="#56dcff" stroke-width="5"/>
    <circle cx="${lateralVisitante}" cy="${centroY}" r="${radio + 8}" fill="#f4f7fb" stroke="#ffd33f" stroke-width="8"/>
    <circle cx="${lateralVisitante}" cy="${centroY}" r="${radio - 5}" fill="#12446b" stroke="#56dcff" stroke-width="5"/>
    ${logoLocal}
    ${logoVisitante}
    <text x="${ancho / 2}" y="${centroY + 18}" text-anchor="middle" class="versus" font-size="${vertical ? 64 : 72}">${escaparSvg(marcador)}</text>
    ${textoEquipo}
    <text x="${ancho / 2}" y="${textoLugarY}" text-anchor="middle" class="detalle" font-size="${fuenteDetalle}">${lugar}</text>
    <text x="${ancho / 2}" y="${textoFechaY}" text-anchor="middle" class="detalle" font-size="${fuenteDetalle}">${escaparSvg(fecha)}</text>
    <text x="${ancho / 2}" y="${textoPieY}" text-anchor="middle" class="marca-secundaria" font-size="${vertical ? 24 : 22}">Información de programación · Pont3la10.com</text>
    <style>.marca,.competencia,.estado,.iniciales,.versus,.equipo,.detalle,.marca-secundaria{font-family:Arial,sans-serif}.marca,.estado,.iniciales,.versus{font-weight:900}.competencia,.equipo{font-weight:800}.detalle,.marca-secundaria{font-weight:500}.marca,.iniciales,.equipo,.estado{fill:#fff}.competencia{fill:#8ceaff}.estado{letter-spacing:2px}.versus{fill:#ffd342}.detalle{fill:#d6e4f3}.marca-secundaria{fill:#a8c0d8}</style>
  </svg>`
}

function iniciales(nombre: string): string {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte[0]).join('').toLocaleUpperCase('es-CO')
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
