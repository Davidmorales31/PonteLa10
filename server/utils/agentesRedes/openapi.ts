import { toJSONSchema } from 'zod/v4'
import { guiaAgentes } from './guia'
import { operaciones } from './operaciones'
import type { DefinicionOperacion } from './operaciones'

type Esquema = Record<string, unknown>

function limpiar(esquema: Esquema): Esquema { const { $schema: _omitido, ...resto } = esquema; return resto }

function sinPropiedad(esquema: Esquema, nombre: string): Esquema {
  const copia: Esquema = { ...esquema }
  if (copia.properties && typeof copia.properties === 'object') { const { [nombre]: _quitada, ...resto } = copia.properties as Esquema; copia.properties = resto }
  if (Array.isArray(copia.required)) copia.required = (copia.required as string[]).filter(campo => campo !== nombre)
  for (const clave of ['anyOf', 'oneOf'] as const) if (Array.isArray(copia[clave])) copia[clave] = (copia[clave] as Esquema[]).map(variante => sinPropiedad(variante, nombre))
  return copia
}

/** Unión (p. ej. imágenes | vídeo) → un solo objeto: los clientes de herramientas exigen `type: object` en la raíz. */
export function aplanarUnion(esquema: Esquema): Esquema {
  const variantes = (esquema.anyOf || esquema.oneOf) as Esquema[] | undefined
  if (!variantes) return esquema
  const propiedades: Record<string, Esquema> = {}
  let comunes: string[] | null = null
  for (const variante of variantes) {
    for (const [nombre, definicion] of Object.entries((variante.properties || {}) as Record<string, Esquema>)) {
      const previa = propiedades[nombre]
      if (previa && previa.const !== undefined && definicion.const !== undefined && previa.const !== definicion.const) {
        propiedades[nombre] = { type: 'string', enum: [previa.const, definicion.const] }
      } else if (previa?.enum && definicion.const !== undefined) propiedades[nombre] = { ...previa, enum: [...(previa.enum as unknown[]), definicion.const] }
      else if (!previa) propiedades[nombre] = definicion
    }
    const requeridas = (variante.required || []) as string[]
    comunes = comunes === null ? requeridas : comunes.filter(campo => requeridas.includes(campo))
  }
  return { type: 'object', properties: propiedades, required: comunes || [], additionalProperties: false,
    description: 'Según `tipo`: con "imagenes" se usan `formato` y `diapositivas`; con "video" se usa `videoMedioId` (obligatorio).' }
}

export function esquemaEntrada(operacion: DefinicionOperacion): Esquema {
  return aplanarUnion(limpiar(toJSONSchema(operacion.entrada, { io: 'input', unrepresentable: 'any' }) as Esquema))
}

export function construirOpenApi(urlBase: string) {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const operacion of operaciones) {
    const parametrosRuta = [...operacion.ruta.matchAll(/:([a-zA-Z]+)/g)].map(coincidencia => coincidencia[1]!)
    const ruta = operacion.ruta === '/' ? '/' : operacion.ruta.replace(/:([a-zA-Z]+)/g, '{$1}')
    const original = toJSONSchema(operacion.entrada, { io: 'input', unrepresentable: 'any' }) as Esquema
    const entrada = parametrosRuta.reduce<Esquema>((actual, nombre) => sinPropiedad(actual, nombre), limpiar(original))
    const propiedades = (entrada.properties || {}) as Record<string, Esquema>
    const requeridas = new Set((entrada.required || []) as string[])
    const parametros: unknown[] = parametrosRuta.map(nombre => ({ name: nombre, in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }))
    let cuerpo: unknown
    if (operacion.metodo === 'GET' || operacion.metodo === 'DELETE') {
      for (const [nombre, definicion] of Object.entries(propiedades)) parametros.push({ name: nombre, in: 'query', required: requeridas.has(nombre), description: definicion.description, schema: definicion })
    } else if (Object.keys(propiedades).length || entrada.anyOf) {
      cuerpo = { required: true, content: { 'application/json': { schema: entrada } } }
    }
    const exito = operacion.estadoHttp ?? 200
    const binaria = operacion.id === 'previsualizar'
    paths[ruta] = { ...paths[ruta], [operacion.metodo.toLowerCase()]: {
      operationId: operacion.id, summary: operacion.resumen, description: operacion.descripcion, tags: [operacion.alcance ?? 'descubrimiento'],
      'x-alcance': operacion.alcance ?? 'ninguno', 'x-herramienta-mcp': operacion.herramienta,
      parameters: parametros.length ? parametros : undefined, requestBody: cuerpo,
      responses: {
        [exito]: { description: 'Operación exitosa.', content: binaria
          ? { 'application/json': { schema: { type: 'object' } }, 'image/jpeg': { schema: { type: 'string', format: 'binary' } } }
          : { 'application/json': { schema: { type: 'object' } } } },
        400: { $ref: '#/components/responses/Error' }, 401: { $ref: '#/components/responses/Error' }, 403: { $ref: '#/components/responses/Error' },
        404: { $ref: '#/components/responses/Error' }, 409: { $ref: '#/components/responses/Error' }, 422: { $ref: '#/components/responses/Error' }, 429: { $ref: '#/components/responses/Error' }
      }
    } }
  }
  return {
    openapi: '3.1.0',
    info: { title: 'API de agentes · Contenido para redes de Pont3la10', version: '1.0.0', description: guiaAgentes },
    servers: [{ url: urlBase }],
    security: [{ llave: [] }],
    paths,
    components: {
      securitySchemes: { llave: { type: 'http', scheme: 'bearer', description: 'Llave de agente `p3l_…` creada por una persona en Contenido para redes → Agentes IA.' } },
      responses: { Error: { description: 'Error con código estable.', content: { 'application/json': { schema: { type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['codigo', 'mensaje'],
        properties: { codigo: { type: 'string' }, mensaje: { type: 'string' }, detalles: {} } } } } } } } }
    }
  }
}
