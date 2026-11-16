import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizarError, ErrorAgente } from '~/server/utils/agentesRedes/errores'
import { esquemaCrearPublicacion } from '~/server/utils/agentesRedes/esquemas'
import { formatoLlaveAgente, generarLlaveAgente, huellaLlave, propietarioConPermisos } from '~/server/utils/agentesRedes/llaves'
import type { ContextoAgente } from '~/server/utils/agentesRedes/llaves'
import { composicionDesdeDocumento, documentoDesdeEntrada } from '~/server/utils/agentesRedes/mapeo'
import { herramientasVisibles, manejarMcp } from '~/server/utils/agentesRedes/mcp'
import { construirOpenApi } from '~/server/utils/agentesRedes/openapi'
import { operaciones } from '~/server/utils/agentesRedes/operaciones'
import { buscarHerramienta, buscarOperacion, ejecutarOperacion } from '~/server/utils/agentesRedes/router'
import { descargarImagenPublica, direccionPublica, validarUrlPublica } from '~/server/utils/agentesRedes/urlSegura'

const idA = '11111111-1111-4111-8111-111111111111'
const idB = '22222222-2222-4222-8222-222222222222'
const contexto = (alcances: Array<'leer' | 'borradores' | 'medios' | 'programar'>): ContextoAgente => ({
  privado: {} as never,
  llave: { id: idA, nombre: 'Agente de prueba', propietarioId: idB, alcances: new Set(alcances), maxProgramacionesDia: 5, limitePorMinuto: 60 }
})
const entradaImagenes = {
  tipo: 'imagenes' as const, titulo: 'Pieza de prueba', descripcion: { facebook: 'Texto largo para Facebook' },
  diapositivas: [{ plantilla: 'dos-lado' as const, imagenes: [{ medioId: idA }, { medioId: idB, zoom: 1.5, x: 10, y: -5 }], logos: [{}], textos: [{ texto: 'Gran **titular**' }, { texto: 'Pie', fondo: 'banda' as const, y: 20 }] }]
}

describe('llaves de agente', () => {
  it('genera llaves de 256 bits con formato estable y guarda solo la huella', () => {
    const a = generarLlaveAgente(), b = generarLlaveAgente()
    expect(a.llave).toMatch(formatoLlaveAgente)
    expect(a.llave).not.toBe(b.llave)
    expect(a.huella).toMatch(/^[a-f0-9]{64}$/)
    expect(a.huella).toBe(huellaLlave(a.llave))
    expect(a.prefijo).toMatch(/^p3l_[A-Za-z0-9_-]{8}$/)
    expect(a.llave.startsWith(a.prefijo)).toBe(true)
  })
  it('exige que la persona dueña conserve sus permisos en cada llamada', async () => {
    const cliente = (roles: unknown[], permisos: unknown[]) => ({ from: (tabla: string) => {
      const datos = tabla === 'user_roles' ? roles : permisos
      const cadena: Record<string, unknown> = { select: () => cadena, eq: () => cadena, in: () => Promise.resolve({ data: datos, error: null }) }
      cadena.then = (resolver: (valor: unknown) => unknown) => resolver({ data: datos, error: null })
      return cadena
    } }) as never
    expect(await propietarioConPermisos(cliente([{ role: 'editor' }], [{ permission: 'panel.acceder' }, { permission: 'contenido.editarTodos' }]), idB)).toBe(true)
    expect(await propietarioConPermisos(cliente([{ role: 'editor' }], [{ permission: 'panel.acceder' }]), idB)).toBe(false)
    expect(await propietarioConPermisos(cliente([], []), idB)).toBe(false)
  })
})

describe('composición para agentes', () => {
  it('aplica valores por defecto y traduce al documento del editor', () => {
    const entrada = esquemaCrearPublicacion.parse(entradaImagenes)
    expect(entrada.tipo === 'imagenes' && entrada.formato).toBe('vertical')
    expect(entrada.destinos).toEqual(['facebook', 'instagram'])
    const documento = documentoDesdeEntrada(entrada)
    expect(documento.textos.instagram).toBe('Texto largo para Facebook')
    const diapositiva = 'diapositivas' in documento ? documento.diapositivas[0]! : null
    expect(diapositiva?.elementos.map(elemento => elemento.tipo)).toEqual(['logo', 'texto', 'texto'])
    const degradado = diapositiva!.elementos[1]!
    expect(degradado.tipo === 'texto' && degradado.degradado && !degradado.banda).toBe(true)
  })
  it('es reversible: lo que se lee se puede reenviar', () => {
    const documento = documentoDesdeEntrada(esquemaCrearPublicacion.parse(entradaImagenes))
    const composicion = composicionDesdeDocumento(documento)
    const reenviada = esquemaCrearPublicacion.parse({ ...composicion, titulo: 'Otra vez', destinos: ['facebook'] })
    expect(composicionDesdeDocumento(documentoDesdeEntrada(reenviada))).toEqual(composicion)
  })
  it('rechaza plantillas que no coinciden con las imágenes y campos desconocidos', () => {
    expect(esquemaCrearPublicacion.safeParse({ ...entradaImagenes, diapositivas: [{ plantilla: 'cuatro', imagenes: [{ medioId: idA }] }] }).success).toBe(false)
    expect(esquemaCrearPublicacion.safeParse({ ...entradaImagenes, extra: 1 }).success).toBe(false)
    expect(esquemaCrearPublicacion.safeParse({ ...entradaImagenes, titulo: 'ab' }).success).toBe(false)
    expect(esquemaCrearPublicacion.safeParse({ tipo: 'video', titulo: 'Un video', descripcion: { facebook: 'x' } }).success).toBe(false)
  })
  it('soporta vídeo', () => {
    const entrada = esquemaCrearPublicacion.parse({ tipo: 'video', titulo: 'Reel de prueba', descripcion: { facebook: 'Mira esto', instagram: 'Mira' }, videoMedioId: idA })
    const documento = documentoDesdeEntrada(entrada)
    expect(composicionDesdeDocumento(documento)).toMatchObject({ tipo: 'video', videoMedioId: idA, descripcion: { instagram: 'Mira' } })
  })
})

describe('importación segura de URLs', () => {
  it('clasifica direcciones públicas y privadas (IPv4 e IPv6)', () => {
    for (const privada of ['127.0.0.1', '10.1.2.3', '172.16.5.4', '192.168.0.9', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', 'fe80::1', 'fc00::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '0:0:0:0:0:ffff:a00:1', '2002::1']) {
      expect(direccionPublica(privada), privada).toBe(false)
    }
    for (const publica of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) expect(direccionPublica(publica), publica).toBe(true)
    expect(direccionPublica('no-es-ip')).toBe(false)
  })
  it('rechaza esquemas, credenciales, puertos y hosts internos', () => {
    for (const mala of ['http://ejemplo.com/a.jpg', 'ftp://ejemplo.com/a.jpg', 'https://user:pw@ejemplo.com/a.jpg', 'https://ejemplo.com:8443/a.jpg', 'https://localhost/a.jpg',
      'https://servicio.internal/a.jpg', 'https://intranet/a.jpg', 'https://127.0.0.1/a.jpg', 'https://[::1]/a.jpg', 'https://169.254.169.254/latest/meta-data', 'no es url']) {
      expect(() => validarUrlPublica(mala), mala).toThrow(ErrorAgente)
    }
    expect(validarUrlPublica('https://ejemplo.com/foto.jpg').hostname).toBe('ejemplo.com')
  })
  it('no llega a conectar con direcciones privadas', async () => {
    await expect(descargarImagenPublica('https://127.0.0.1/a.jpg', { maxBytes: 1000 })).rejects.toBeInstanceOf(ErrorAgente)
    await expect(descargarImagenPublica('https://localhost/a.jpg', { maxBytes: 1000 })).rejects.toBeInstanceOf(ErrorAgente)
  })
})

describe('enrutamiento y ejecución', () => {
  it('resuelve rutas con parámetros y distingue método no permitido', () => {
    const lectura = buscarOperacion('GET', '/publicaciones/abc')
    expect(lectura).toMatchObject({ operacion: { id: 'leerPublicacion' }, parametros: { id: 'abc' } })
    expect(buscarOperacion('GET', '/')).toMatchObject({ operacion: { id: 'capacidades' } })
    expect(buscarOperacion('POST', '/publicaciones/abc/solicitar-aprobacion')).toMatchObject({ operacion: { id: 'solicitarAprobacion' } })
    expect(buscarOperacion('PATCH', '/publicaciones/abc')).toBe('metodo')
    expect(buscarOperacion('GET', '/no-existe')).toBeNull()
  })
  it('cada operación tiene identificador, herramienta y ruta únicos', () => {
    for (const campo of ['id', 'herramienta'] as const) expect(new Set(operaciones.map(operacion => operacion[campo])).size).toBe(operaciones.length)
    expect(new Set(operaciones.map(operacion => `${operacion.metodo} ${operacion.ruta}`)).size).toBe(operaciones.length)
    expect(operaciones.filter(operacion => operacion.alcance === 'programar').map(operacion => operacion.id).sort()).toEqual(['cancelarProgramacion', 'programar'])
  })
  it('valida el alcance antes que la entrada y detalla los errores de validación', async () => {
    const crear = operaciones.find(operacion => operacion.id === 'crearPublicacion')!
    await expect(ejecutarOperacion(crear, contexto(['leer']), {})).rejects.toMatchObject({ estado: 403, codigo: 'alcance_insuficiente' })
    const fallo = (await ejecutarOperacion(crear, contexto(['borradores']), { tipo: 'imagenes', titulo: 'x' }).catch(problema => problema)) as ErrorAgente
    expect(fallo).toMatchObject({ estado: 422, codigo: 'validacion' })
    expect(Array.isArray(fallo.detalles) && fallo.detalles.length).toBeGreaterThan(0)
    const programar = operaciones.find(operacion => operacion.id === 'programar')!
    await expect(ejecutarOperacion(programar, contexto(['leer', 'borradores', 'medios']), { id: idA, revision: 1, fecha: '2030-01-01T00:00:00-05:00' })).rejects.toMatchObject({ codigo: 'alcance_insuficiente' })
  })
  it('capacidades describe la llave y no necesita base de datos', async () => {
    const capacidades = operaciones.find(operacion => operacion.id === 'capacidades')!
    const resultado = await ejecutarOperacion(capacidades, contexto(['leer']), {}) as { llave: { alcances: string[] }, plantillas: unknown[], formatos: unknown[], flujoRecomendado: string[] }
    expect(resultado.llave.alcances).toEqual(['leer'])
    expect(resultado.plantillas).toHaveLength(6)
    expect(resultado.formatos).toHaveLength(3)
    expect(resultado.flujoRecomendado.length).toBeGreaterThan(3)
  })
  it('normaliza errores sin exponer detalles internos', () => {
    expect(normalizarError(new Error('secreto interno'))).toEqual({ estado: 500, cuerpo: { error: { codigo: 'error_interno', mensaje: expect.not.stringContaining('secreto') } } })
    expect(normalizarError({ statusCode: 404, statusMessage: 'No existe' }).cuerpo.error.codigo).toBe('no_encontrado')
    expect(normalizarError(new ErrorAgente(429, 'limite_excedido', 'Despacio')).estado).toBe(429)
  })
})

describe('OpenAPI', () => {
  const spec = construirOpenApi('https://ejemplo.com/api/agentes/redes/v1') as { openapi: string, paths: Record<string, Record<string, { operationId: string, requestBody?: { content: { 'application/json': { schema: Record<string, unknown> } } }, parameters?: Array<{ name: string, in: string }> }>>, components: { securitySchemes: Record<string, unknown> } }
  it('describe todas las operaciones con sus rutas y seguridad', () => {
    expect(spec.openapi).toBe('3.1.0')
    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(['/', '/publicaciones', '/publicaciones/{id}', '/publicaciones/{id}/previsualizacion', '/medios/subidas/{id}/confirmar', '/medios/desde-url', '/biblioteca']))
    const ids = Object.values(spec.paths).flatMap(ruta => Object.values(ruta).map(operacion => operacion.operationId)).sort()
    expect(ids).toEqual(operaciones.map(operacion => operacion.id).sort())
    expect(spec.components.securitySchemes).toHaveProperty('llave')
  })
  it('el identificador va en la ruta y no en el cuerpo, y los filtros GET van en la query', () => {
    const put = spec.paths['/publicaciones/{id}']!.put!
    expect(put.parameters?.some(parametro => parametro.name === 'id' && parametro.in === 'path')).toBe(true)
    expect(JSON.stringify(put.requestBody)).not.toContain('"id":{')
    expect(spec.paths['/publicaciones']!.get!.parameters?.map(parametro => parametro.name)).toEqual(expect.arrayContaining(['estado', 'ambito', 'limite']))
    expect(JSON.stringify(spec)).not.toContain('"$schema"')
  })
})

describe('MCP', () => {
  it('anuncia solo las herramientas permitidas por la llave y con raíz de tipo objeto', () => {
    const soloLeer = herramientasVisibles(contexto(['leer'])).map(herramienta => herramienta.name)
    expect(soloLeer).toContain('redes_previsualizar')
    expect(soloLeer).not.toContain('redes_crear_publicacion')
    expect(soloLeer).not.toContain('redes_programar')
    const todas = herramientasVisibles(contexto(['leer', 'borradores', 'medios', 'programar']))
    expect(todas).toHaveLength(operaciones.length)
    for (const herramienta of todas) expect(herramienta.inputSchema.type, herramienta.name).toBe('object')
    const crear = todas.find(herramienta => herramienta.name === 'redes_crear_publicacion')!.inputSchema as { properties: Record<string, { enum?: string[] }> }
    expect(crear.properties.tipo!.enum).toEqual(['imagenes', 'video'])
    expect(crear.properties).toHaveProperty('diapositivas')
    expect(crear.properties).toHaveProperty('videoMedioId')
  })
  it('responde initialize, ping, tools/list y tools/call', async () => {
    const ctx = contexto(['leer'])
    const inicio = await manejarMcp({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, ctx)
    expect(inicio.cuerpo).toMatchObject({ id: 1, result: { protocolVersion: '2025-03-26', serverInfo: { name: 'pont3la10-redes' }, capabilities: { tools: {} } } })
    expect(JSON.stringify(inicio.cuerpo)).toContain('instructions')
    expect(await manejarMcp({ jsonrpc: '2.0', method: 'notifications/initialized' }, ctx)).toEqual({ estado: 202 })
    expect((await manejarMcp({ jsonrpc: '2.0', id: 2, method: 'ping' }, ctx)).cuerpo).toMatchObject({ result: {} })
    const listado = await manejarMcp({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, ctx)
    expect((listado.cuerpo as { result: { tools: unknown[] } }).result.tools.length).toBeGreaterThan(3)
    const llamada = await manejarMcp({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'redes_capacidades', arguments: {} } }, ctx)
    const texto = (llamada.cuerpo as { result: { content: Array<{ text: string }> } }).result.content[0]!.text
    expect(JSON.parse(texto).llave.alcances).toEqual(['leer'])
  })
  it('las herramientas fuera de alcance o desconocidas devuelven un error legible, no una excepción', async () => {
    const ctx = contexto(['leer'])
    const sinAlcance = await manejarMcp({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'redes_crear_publicacion', arguments: {} } }, ctx)
    expect(sinAlcance.cuerpo).toMatchObject({ result: { isError: true } })
    expect(JSON.stringify(sinAlcance.cuerpo)).toContain('alcance_insuficiente')
    const desconocida = await manejarMcp({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'borrar_todo' } }, ctx)
    expect(desconocida.cuerpo).toMatchObject({ result: { isError: true } })
    expect((await manejarMcp({ jsonrpc: '2.0', id: 7, method: 'otra/cosa' }, ctx)).cuerpo).toMatchObject({ error: { code: -32601 } })
    expect((await manejarMcp([], ctx)).estado).toBe(400)
    expect(buscarHerramienta('redes_programar')?.alcance).toBe('programar')
  })
})

describe('contrato de seguridad', () => {
  const leer = (ruta: string) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8')
  it('la migración deja todo privado y solo ejecutable por el servidor', () => {
    const sql = leer('supabase/migrations/20261117100000_api_agentes_redes.sql')
    for (const tabla of ['social_agent_keys', 'social_agent_rate']) {
      expect(sql).toContain(`alter table public.${tabla} enable row level security`)
      expect(sql).toContain(`revoke all on public.${tabla} from public, anon, authenticated, service_role`)
    }
    expect(sql.match(/grant execute on function/g)?.length).toBe(7)
    expect(sql.match(/revoke all on function/g)?.length).toBe(7)
    expect(sql).not.toMatch(/grant [^;]* to (anon|authenticated|public)/)
    expect(sql).toContain('key_hash text not null unique')
  })
  it('las rutas de gestión de llaves exigen permiso, MFA y mismo origen; el REST nunca usa cookies', () => {
    expect(leer('server/api/admin/redes/agentes/index.post.ts')).toContain('contextoOAuthSocial(evento, true)')
    expect(leer('server/api/admin/redes/agentes/index.post.ts')).toContain('validarOrigenOAuthSocial')
    expect(leer('server/api/admin/redes/agentes/index.get.ts')).toContain("'configuracion.gestionar'")
    expect(leer('server/api/admin/redes/agentes/[id].delete.ts')).toContain('contextoOAuthSocial(evento, true)')
    const rest = leer('server/api/agentes/redes/v1/[...ruta].ts') + leer('server/utils/agentesRedes/llaves.ts')
    expect(rest).toContain('Bearer')
    expect(rest).not.toMatch(/obtenerContextoEditorialServidor|getCookie|exigirPermisoEditorial/)
  })
  it('los agentes no pueden publicar de inmediato', () => {
    expect(operaciones.some(operacion => /publicar/i.test(operacion.id) && !/solicitar|Publicacion$/.test(operacion.id))).toBe(false)
    expect(leer('server/utils/agentesRedes/operaciones.ts')).not.toContain('ejecutarPublicacionMetaPropia')
  })
})
