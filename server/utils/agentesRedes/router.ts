import { errores } from './errores'
import { exigirAlcance } from './llaves'
import type { ContextoAgente } from './llaves'
import { operaciones } from './operaciones'
import type { DefinicionOperacion } from './operaciones'

interface RutaCompilada { operacion: DefinicionOperacion, patron: RegExp, nombres: string[] }

const rutas: RutaCompilada[] = operaciones.map((operacion) => {
  const nombres: string[] = []
  const fuente = operacion.ruta === '/' ? '' : operacion.ruta.replace(/:([a-zA-Z]+)/g, (_, nombre: string) => { nombres.push(nombre); return '([^/]+)' })
  return { operacion, patron: new RegExp(`^${fuente}/?$`), nombres }
})

/** Busca la operación para (método, ruta). Distingue «no existe» de «método no permitido». */
export function buscarOperacion(metodo: string, ruta: string): { operacion: DefinicionOperacion, parametros: Record<string, string> } | 'metodo' | null {
  let existe = false
  for (const candidata of rutas) {
    const coincidencia = candidata.patron.exec(ruta === '' ? '/' : ruta)
    if (!coincidencia) continue
    existe = true
    if (candidata.operacion.metodo !== metodo.toUpperCase()) continue
    return { operacion: candidata.operacion, parametros: Object.fromEntries(candidata.nombres.map((nombre, indice) => [nombre, decodeURIComponent(coincidencia[indice + 1]!)])) }
  }
  return existe ? 'metodo' : null
}

export function buscarHerramienta(nombre: string) { return operaciones.find(operacion => operacion.herramienta === nombre) || null }

/** Punto único de ejecución (REST y MCP): alcance → validación estricta → operación. */
export async function ejecutarOperacion(operacion: DefinicionOperacion, contexto: ContextoAgente, bruto: unknown) {
  if (operacion.alcance) exigirAlcance(contexto, operacion.alcance)
  const lectura = operacion.entrada.safeParse(bruto ?? {})
  if (!lectura.success) {
    throw errores.validacion('La solicitud no es válida. Corrige los campos indicados.', lectura.error.issues.map(problema => ({ ruta: problema.path.join('.') || '(raíz)', mensaje: problema.message, codigo: problema.code })))
  }
  return operacion.ejecutar(contexto, lectura.data)
}
