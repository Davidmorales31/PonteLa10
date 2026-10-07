export interface JugadorConvocadoSeleccion {
  nombre: string
  club: string
}

export interface ConvocatoriaOficialSeleccion {
  id: 'masculina' | 'femenina'
  etiqueta: string
  ventana: string
  publicadaEn: string
  vigenteHasta: string
  cantidad: number
  fuenteUrl: string
  actualizacionUrl?: string
  notaActualizacion?: string
  jugadores: JugadorConvocadoSeleccion[]
}

export interface PartidoSeleccionOficial {
  fecha: string
  fechaIso?: string
  hora: string | null
  local: string
  visitante: string
  seleccion: string
  competencia: string
  estadio?: string
  sede?: string
  marcadorLocal?: number
  marcadorVisitante?: number
  fuenteUrl: string
}

export const fechaVerificacionSeleccion = '2026-10-06'

export const calendarioOficialSeleccion: PartidoSeleccionOficial[] = [
  {
    fecha: '2026-10-06',
    fechaIso: '2026-10-06T18:45:00-05:00',
    hora: '6:45 p. m. (hora de Colombia)',
    local: 'Colombia',
    visitante: 'Perú',
    seleccion: 'Masculina de mayores',
    competencia: 'Amistoso internacional',
    sede: 'Miami, Estados Unidos',
    fuenteUrl: 'https://www.fcf.com.co/calendario/'
  },
  {
    fecha: '2026-10-10',
    hora: null,
    local: 'Venezuela',
    visitante: 'Colombia',
    seleccion: 'Femenina de mayores',
    competencia: 'Amistoso internacional',
    sede: 'Isla de Margarita, Venezuela',
    estadio: 'Centro Nacional de Alto Rendimiento',
    fuenteUrl: 'https://fcf.com.co/2026/09/04/la-seleccion-colombia-femenina-de-mayores-enfrentara-a-venezuela-en-dos-amistosos-en-octubre/'
  },
  {
    fecha: '2026-10-13',
    hora: null,
    local: 'Venezuela',
    visitante: 'Colombia',
    seleccion: 'Femenina de mayores',
    competencia: 'Amistoso internacional',
    sede: 'Isla de Margarita, Venezuela',
    estadio: 'Centro Nacional de Alto Rendimiento',
    fuenteUrl: 'https://fcf.com.co/2026/09/04/la-seleccion-colombia-femenina-de-mayores-enfrentara-a-venezuela-en-dos-amistosos-en-octubre/'
  },
  {
    fecha: '2026-11-13',
    hora: null,
    local: 'Colombia',
    visitante: 'Chile',
    seleccion: 'Masculina de mayores',
    competencia: 'Amistoso internacional',
    fuenteUrl: 'https://www.fcf.com.co/calendario/'
  },
  {
    fecha: '2026-11-19',
    hora: null,
    local: 'Chile',
    visitante: 'Colombia',
    seleccion: 'Masculina de mayores',
    competencia: 'Amistoso internacional',
    fuenteUrl: 'https://www.fcf.com.co/calendario/'
  },
  {
    fecha: '2026-11-28',
    hora: '3:40 a. m. (hora de Colombia)',
    local: 'Australia',
    visitante: 'Colombia',
    seleccion: 'Femenina de mayores',
    competencia: 'Amistoso internacional',
    fuenteUrl: 'https://www.fcf.com.co/calendario/'
  }
]

export const resultadosOficialesSeleccion: PartidoSeleccionOficial[] = [
  {
    fecha: '2026-09-26',
    hora: null,
    local: 'México',
    visitante: 'Colombia',
    seleccion: 'Masculina de mayores',
    competencia: 'Amistoso internacional',
    marcadorLocal: 1,
    marcadorVisitante: 1,
    fuenteUrl: 'https://fcf.com.co/2026/09/26/colombia-obtiene-un-empate-en-la-primera-fecha-fifa-de-septiembre/'
  },
  {
    fecha: '2026-10-02',
    hora: null,
    local: 'Colombia',
    visitante: 'Paraguay',
    seleccion: 'Masculina de mayores',
    competencia: 'Amistoso internacional',
    marcadorLocal: 0,
    marcadorVisitante: 1,
    fuenteUrl: 'https://fcf.com.co/2026/10/02/la-seleccion-colombia-completa-su-segundo-compromiso-amistoso/'
  }
]

export const convocatoriasOficialesSeleccion: ConvocatoriaOficialSeleccion[] = [
  {
    id: 'masculina',
    etiqueta: 'Selección masculina de mayores',
    ventana: 'Amistosos internacionales · septiembre y octubre de 2026',
    publicadaEn: '2026-09-17',
    vigenteHasta: '2026-10-06',
    cantidad: 26,
    fuenteUrl: 'https://fcf.com.co/2026/09/17/convocatoria-de-la-seleccion-colombia-de-mayores-amistosos-internacionales-de-septiembre-octubre-2026/',
    jugadores: [
      { nombre: 'Aldair Quintana', club: 'Independiente del Valle' },
      { nombre: 'Álvaro Angulo', club: 'Pumas UNAM' },
      { nombre: 'Álvaro Montero', club: 'Boca Juniors' },
      { nombre: 'Camilo Durán', club: 'Celtic F.C.' },
      { nombre: 'Carlos Andrés Gómez', club: 'Vasco da Gama' },
      { nombre: 'Daniel Arcila', club: 'Club León' },
      { nombre: 'Daniel Muñoz', club: 'Nottingham Forest F.C.' },
      { nombre: 'Dávinson Sánchez', club: 'Galatasaray S.K.' },
      { nombre: 'Édier Ocampo', club: 'Vancouver Whitecaps F.C.' },
      { nombre: 'Gustavo Puerta', club: 'Olympiacos F.C.' },
      { nombre: 'Jaminton Campaz', club: 'Rosario Central' },
      { nombre: 'Jhon Arias', club: 'Palmeiras' },
      { nombre: 'Jhon Lucumí', club: 'Juventus F.C.' },
      { nombre: 'Jhon Solís', club: 'Birmingham City F.C.' },
      { nombre: 'Juan Manuel Rengifo', club: 'Atlético Nacional' },
      { nombre: 'Kevin Andrade', club: 'Zenit F.C.' },
      { nombre: 'Kevin Castaño', club: 'Atlético Mineiro' },
      { nombre: 'Kevin Mier', club: 'Cruz Azul' },
      { nombre: 'Kevin Viveros', club: 'Athletico Paranaense' },
      { nombre: 'Luis Suárez', club: 'Sporting C.P.' },
      { nombre: 'Matías Orozco', club: 'C.D. Castellón' },
      { nombre: 'Óscar Perea', club: 'Club América' },
      { nombre: 'Richard Ríos', club: 'Al-Ittihad Club' },
      { nombre: 'Royer Caicedo', club: 'Cercle Brugge' },
      { nombre: 'Samuel Velásquez', club: 'Atlético Nacional' },
      { nombre: 'Yáser Asprilla', club: 'Girona F.C.' }
    ]
  },
  {
    id: 'femenina',
    etiqueta: 'Selección femenina de mayores',
    ventana: 'Fecha FIFA · octubre de 2026',
    publicadaEn: '2026-10-02',
    vigenteHasta: '2026-10-14',
    cantidad: 23,
    fuenteUrl: 'https://fcf.com.co/2026/10/02/convocatoria-seleccion-colombia-femenina-de-mayores-fecha-fifa-octubre-2026/',
    actualizacionUrl: 'https://fcf.com.co/2026/10/05/ilana-izquierdo-no-se-unira-a-la-concentracion-de-la-seleccion-colombia-femenina/',
    notaActualizacion: 'La FCF informó el 5 de octubre que Sara Sofía Martínez reemplaza a Ilana Izquierdo.',
    jugadores: [
      { nombre: 'Ana María Guzmán', club: 'Palmeiras' },
      { nombre: 'Carolina Arias', club: 'América de Cali' },
      { nombre: 'Daniela Arias', club: 'C.D. León' },
      { nombre: 'Daniela Caracas', club: 'R.C.D. La Coruña' },
      { nombre: 'Daniela Garavito', club: 'Independiente Santa Fe' },
      { nombre: 'Daniela Montoya', club: 'Alianza Lima' },
      { nombre: 'Gabriela Rodríguez', club: 'Cruzeiro' },
      { nombre: 'Gisela Robledo', club: 'Corinthians' },
      { nombre: 'Ingrid Guerra', club: 'Deportivo Cali' },
      { nombre: 'Sara Sofía Martínez', club: 'Atlético Nacional' },
      { nombre: 'Jorelyn Carabalí', club: 'Boston Legacy' },
      { nombre: 'Kelly Ibargüen', club: 'Atlético Nacional' },
      { nombre: 'Mariana Muñoz', club: 'América de Cali' },
      { nombre: 'Manuela Pavi', club: 'Toluca Femenil' },
      { nombre: 'Marcela Restrepo', club: 'Rayadas de Monterrey' },
      { nombre: 'Manuela Vanegas', club: 'Brighton & Hove Albion' },
      { nombre: 'Lorena Bedoya', club: 'Cruzeiro' },
      { nombre: 'Natalia Giraldo', club: 'América de Cali' },
      { nombre: 'Luisa Agudelo', club: 'San Diego Wave' },
      { nombre: 'Luz Katherine Tapia', club: 'Palmeiras' },
      { nombre: 'Stefania Perlaza', club: 'Deportivo Cali' },
      { nombre: 'Valerin Loboa', club: 'Portland Thorns' },
      { nombre: 'Wendy Bonilla', club: 'Santos F.C.' }
    ]
  }
]
