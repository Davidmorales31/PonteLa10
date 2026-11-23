// Configura el acceso remoto del estudio (iPhone por Tailscale). Se corre en el PC, nunca desde el teléfono.
// Uso: npm run video:estudio:clave -- [--host <nombre-del-pc>.<tu-red>.ts.net]
// Pide la clave dos veces sin mostrarla, la guarda con scrypt en ~/.pont3la10/estudio/acceso.json y cierra
// todas las sesiones abiertas. Con --host agrega o reemplaza el nombre HTTPS por el que entra el iPhone.
import { createInterface } from 'node:readline'
import { CLAVE_MINIMA, dirAcceso, guardarClave, hostsRemotosValidos, leerConfiguracion } from './video-estudio-acceso.mjs'

function preguntarOculto(texto) {
  return new Promise((resolver) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (cadena) => { if (cadena.includes(texto)) rl.output.write(texto) }
    rl.question(texto, (respuesta) => { rl.close(); process.stdout.write('\n'); resolver(respuesta) })
  })
}

const args = process.argv.slice(2)
const indice = args.indexOf('--host')
const host = indice >= 0 ? String(args[indice + 1] || '').trim().toLowerCase() : ''
if (indice >= 0 && !hostsRemotosValidos([host]).length) {
  process.stderr.write('El host no es válido. Ejemplo: --host mi-pc.tail1234.ts.net\n')
  process.exit(2)
}

const anterior = await leerConfiguracion()
const hosts = host ? [host] : (anterior?.hostsRemotos || [])
const clave = await preguntarOculto(`Clave nueva del estudio (mínimo ${CLAVE_MINIMA} caracteres): `)
const repetida = await preguntarOculto('Repite la clave: ')
if (clave !== repetida) { process.stderr.write('Las claves no coinciden. No se cambió nada.\n'); process.exit(1) }
try {
  const config = await guardarClave(clave, dirAcceso(), hosts)
  process.stdout.write(`Clave guardada en ${dirAcceso()} (se cerraron las sesiones abiertas).\n`)
  process.stdout.write(config.hostsRemotos.length
    ? `Hosts remotos: ${config.hostsRemotos.join(', ')}. Reinicia el estudio para aplicarlo.\n`
    : 'Aún no hay host remoto: vuelve a correrlo con --host <nombre>.ts.net cuando Tailscale te lo dé.\n')
} catch (error) {
  process.stderr.write(`${error.message}\n`)
  process.exit(1)
}
