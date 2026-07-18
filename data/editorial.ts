import type { ArticuloResumen, ModuloInteractivo, TendenciaEditorial } from '~/types/editorial'

export const categoriasPrincipales = [
  'Futbol mundial',
  'Futbol colombiano',
  'Tecnologia deportiva',
  'Gaming deportivo',
  'Especiales',
  'Opinion'
]

export const articuloPrincipal: ArticuloResumen = {
  slug: 'mundial-2026-tambien-se-juega-en-los-datos',
  titulo: 'El Mundial 2026 tambien se empieza a jugar en los datos',
  bajada:
    'Calendario, sedes, selecciones y nuevos habitos digitales abren una oportunidad grande para contar el torneo con otra mirada.',
  categoria: 'Futbol mundial',
  autor: 'Mesa Pont3la10',
  publicadoHace: 'Hace 18 min',
  lecturaMinutos: 5,
  imagen: '/editorial/plantilla_visual_para_publicaciones_deportivas.png',
  destacado: true
}

export const articulosRecientes: ArticuloResumen[] = [
  articuloPrincipal,
  {
    slug: 'mercado-colombiano-se-calienta',
    titulo: 'Ojo con este movimiento: el mercado colombiano se calienta',
    bajada: 'Fichajes, rumores y decisiones silenciosas empiezan a mover la tabla antes de que ruede la pelota.',
    categoria: 'Futbol colombiano',
    autor: 'Redaccion Pont3la10',
    publicadoHace: 'Hace 42 min',
    lecturaMinutos: 4,
    imagen: '/editorial/futbol_colombiano_el_mercado_se_calienta.png'
  },
  {
    slug: 'la-hinchada-tambien-empuja-la-conversacion',
    titulo: 'La hinchada tambien empuja la conversacion digital',
    bajada: 'Comunidades, clips y formatos cortos ya pesan tanto como la rueda de prensa tradicional.',
    categoria: 'Tendencias',
    autor: 'Laura Rios',
    publicadoHace: 'Hace 1 h',
    lecturaMinutos: 3,
    imagen: '/editorial/la_hinchada_colombiana_celebra_con_fuerza.png'
  },
  {
    slug: 'victoria-en-el-estadio-y-en-las-redes',
    titulo: 'Una victoria ya no termina cuando pita el arbitro',
    bajada: 'El partido sigue en estadisticas, memes, analisis y piezas sociales que alargan la emocion.',
    categoria: 'Opinion',
    autor: 'Juan Medina',
    publicadoHace: 'Hace 2 h',
    lecturaMinutos: 6,
    imagen: '/editorial/victoria_en_el_estadio_colombiano.png'
  },
  {
    slug: 'tecnologia-deportiva-se-puso-la-10',
    titulo: 'La tecnologia deportiva tambien se puso la 10',
    bajada: 'Datos, automatizacion y nuevas experiencias estan cambiando la forma de leer y compartir el deporte.',
    categoria: 'Tecnologia deportiva',
    autor: 'Equipo Tech',
    publicadoHace: 'Hace 3 h',
    lecturaMinutos: 5,
    imagen: '/editorial/plantilla_visual_para_publicaciones_deportivas.png'
  },
  {
    slug: 'gaming-deportivo-crece-fuera-de-la-consola',
    titulo: 'El gaming deportivo crece fuera de la consola',
    bajada: 'Fantasy, simuladores y creadores estan conectando deporte real con experiencias jugables.',
    categoria: 'Gaming deportivo',
    autor: 'Mesa Digital',
    publicadoHace: 'Hace 4 h',
    lecturaMinutos: 4,
    imagen: '/editorial/futbol_colombiano_el_mercado_se_calienta.png'
  }
]

export const tendenciasEditoriales: TendenciaEditorial[] = [
  {
    posicion: 1,
    titulo: 'Los fichajes que pueden cambiar la tabla esta semana',
    categoria: 'Futbol colombiano'
  },
  {
    posicion: 2,
    titulo: 'Cinco datos que explican por que el Mundial sera mas digital',
    categoria: 'Futbol mundial'
  },
  {
    posicion: 3,
    titulo: 'La IA no reemplaza criterio: lo multiplica si hay editor',
    categoria: 'Tecnologia deportiva'
  },
  {
    posicion: 4,
    titulo: 'La jugada de redes que mejor conecta con hinchas jovenes',
    categoria: 'Tendencias'
  }
]

export const modulosInteractivos: ModuloInteractivo[] = [
  {
    slug: 'simulador-mundial',
    nombre: 'Simulador Mundial',
    resumen: 'Arma tu prediccion, mueve resultados y comparte tu camino favorito.',
    estado: 'Prioridad MVP'
  },
  {
    slug: 'album-panini',
    nombre: 'Control de album',
    resumen: 'Guarda obtenidas, repetidas y faltantes para pedir cambios con claridad.',
    estado: 'Fase posterior'
  },
  {
    slug: 'polla-mundialista',
    nombre: 'Polla mundialista',
    resumen: 'Predicciones por grupos, tabla de posiciones y ranking entre amigos.',
    estado: 'Fase posterior'
  }
]
