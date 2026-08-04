import type {
  BloqueEditorEditorial,
  DocumentoEditorial,
  EnlaceArticuloInternoEditorial,
  NodoBloqueEditorial,
  NodoElementoListaEditorial,
  TipoBloqueEditorEditorial
} from '~/types/contenidoEditorial'

const separadorLista = '\n'

export function crearBloqueEditorEditorial(
  tipo: TipoBloqueEditorEditorial = 'parrafo',
  texto = '',
  id?: string,
  articuloRelacionado: EnlaceArticuloInternoEditorial | null = null
): BloqueEditorEditorial {
  return {
    id: id || crypto.randomUUID(),
    tipo,
    texto,
    articuloRelacionado
  }
}

function crearNodoTexto(texto: string) {
  return texto ? [{ type: 'text' as const, text: texto }] : []
}

function crearNodoBloque(bloque: BloqueEditorEditorial): NodoBloqueEditorial | null {
  if (bloque.tipo === 'articuloRelacionado') {
    return bloque.articuloRelacionado
      ? {
          type: 'articuloRelacionado',
          attrs: bloque.articuloRelacionado
        }
      : null
  }

  if (bloque.tipo === 'encabezado2' || bloque.tipo === 'encabezado3') {
    return {
      type: 'heading',
      attrs: { level: bloque.tipo === 'encabezado2' ? 2 : 3 },
      content: crearNodoTexto(bloque.texto)
    }
  }

  if (bloque.tipo === 'cita') {
    return {
      type: 'blockquote',
      content: [{
        type: 'paragraph',
        content: crearNodoTexto(bloque.texto)
      }]
    }
  }

  if (bloque.tipo === 'lista' || bloque.tipo === 'listaNumerada') {
    const elementos = bloque.texto
      .split(separadorLista)
      .map(elemento => elemento.trim())
      .filter(Boolean)

    const contenido: NodoElementoListaEditorial[] = elementos.map(elemento => ({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: crearNodoTexto(elemento)
        }]
      }))

    return {
      type: bloque.tipo === 'lista' ? 'bulletList' : 'orderedList',
      content: contenido
    }
  }

  return {
    type: 'paragraph',
    content: crearNodoTexto(bloque.texto)
  }
}

export function convertirBloquesADocumento(
  bloques: BloqueEditorEditorial[]
): DocumentoEditorial {
  return {
    type: 'doc',
    content: bloques
      .map(crearNodoBloque)
      .filter((nodo): nodo is NodoBloqueEditorial => nodo !== null)
  }
}

function textoNodo(nodo: NodoBloqueEditorial): string {
  if (nodo.type === 'articuloRelacionado') {
    return nodo.attrs.titulo
  }

  if (nodo.type === 'bulletList' || nodo.type === 'orderedList') {
    return nodo.content
      .map(elemento => elemento.content
        .map(parrafo => parrafo.content.map(texto => texto.text).join(''))
        .join(''))
      .join(separadorLista)
  }

  if (nodo.type === 'blockquote') {
    return nodo.content
      .map(parrafo => parrafo.content.map(texto => texto.text).join(''))
      .join(separadorLista)
  }

  if (nodo.type === 'paragraph' || nodo.type === 'heading') {
    return nodo.content.map(texto => texto.text).join('')
  }

  return ''
}

function tipoNodo(nodo: NodoBloqueEditorial): TipoBloqueEditorEditorial {
  if (nodo.type === 'articuloRelacionado') return 'articuloRelacionado'

  if (nodo.type === 'heading') {
    return nodo.attrs.level === 2 ? 'encabezado2' : 'encabezado3'
  }

  if (nodo.type === 'blockquote') return 'cita'
  if (nodo.type === 'bulletList') return 'lista'
  if (nodo.type === 'orderedList') return 'listaNumerada'
  return 'parrafo'
}

export function convertirDocumentoABloques(
  documento: DocumentoEditorial
): BloqueEditorEditorial[] {
  const bloques = documento.content.map((nodo, indice) => crearBloqueEditorEditorial(
    tipoNodo(nodo),
    textoNodo(nodo),
    `bloque-${indice + 1}`,
    nodo.type === 'articuloRelacionado' ? nodo.attrs : null
  ))

  return bloques.length
    ? bloques
    : [crearBloqueEditorEditorial('parrafo', '', 'bloque-1')]
}

export function extraerTextoDocumento(documento: DocumentoEditorial): string {
  return documento.content
    .map(textoNodo)
    .filter(Boolean)
    .join('\n\n')
}

export function contarPalabrasDocumento(documento: DocumentoEditorial): number {
  const texto = extraerTextoDocumento(documento).trim()
  return texto ? texto.split(/\s+/).length : 0
}

export function estimarMinutosLectura(documento: DocumentoEditorial): number {
  return Math.max(1, Math.ceil(contarPalabrasDocumento(documento) / 220))
}
