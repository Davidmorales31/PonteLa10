// npm install --prefix .codex/validacion-automatizacion --no-save --package-lock=false @electric-sql/pglite@0.5.15
// node tests/sql/agentesRedes.integration.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'

const require = createRequire(resolve('.codex/validacion-automatizacion/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
let comprobaciones = 0
async function esperarError(fn, prueba) { await assert.rejects(fn, prueba); comprobaciones++ }
const hash = texto => createHash('sha256').update(texto).digest('hex')
const filas = async (sql, params) => (await db.query(sql, params)).rows

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.editorial_audit_log(actor_id uuid, action text, entity_type text, entity_id uuid, metadata jsonb, created_at timestamptz not null default now());
  `)
  await db.exec(await readFile('supabase/migrations/20261116150000_publicaciones_sociales_propias.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261117100000_api_agentes_redes.sql', 'utf8'))
  const dueno = randomUUID()
  await db.query('insert into auth.users values($1)', [dueno])
  const nuevaLlave = async (extra = {}) => {
    const id = randomUUID(), h = hash(id)
    await db.query('insert into public.social_agent_keys(id,name,key_prefix,key_hash,owner_id,scopes,max_schedules_per_day,expires_at,revoked_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, 'Agente de prueba', 'p3l_abcdefgh', h, dueno, extra.scopes ?? ['leer', 'borradores', 'medios', 'programar'], extra.cuota ?? 2, extra.vence ?? null, extra.revocada ?? null])
    return { id, h }
  }

  // Restricciones de la tabla de llaves.
  await esperarError(() => db.query("insert into public.social_agent_keys(name,key_prefix,key_hash,owner_id,scopes) values('Agente','p3l_abcdefgh',$1,$2,array['admin'])", [hash('x'), dueno]), e => e.code === '23514')
  await esperarError(() => db.query("insert into public.social_agent_keys(name,key_prefix,key_hash,owner_id) values('Agente','p3l_abcdefgh','no-es-hash',$1)", [dueno]), e => e.code === '23514')
  await esperarError(() => db.query("insert into public.social_agent_keys(name,key_prefix,key_hash,owner_id) values('ab','p3l_abcdefgh',$1,$2)", [hash('y'), dueno]), e => e.code === '23514')
  comprobaciones += 0

  // Autenticación: solo llaves vigentes.
  const llave = await nuevaLlave()
  const auth = async h => (await filas('select public.authenticate_social_agent_key($1) as r', [h]))[0].r
  const valida = await auth(llave.h)
  assert.equal(valida.id, llave.id); assert.equal(valida.owner_id, dueno); assert.deepEqual(valida.scopes, ['leer', 'borradores', 'medios', 'programar']); comprobaciones += 3
  assert.equal(await auth(hash('otra')), null); assert.equal(await auth('malformado'), null); comprobaciones += 2
  const revocada = await nuevaLlave({ revocada: new Date().toISOString() }); assert.equal(await auth(revocada.h), null); comprobaciones++
  const vencida = await nuevaLlave({ vence: new Date(Date.now() - 1000).toISOString() }); assert.equal(await auth(vencida.h), null); comprobaciones++
  assert.ok((await filas('select last_used_at from public.social_agent_keys where id=$1', [llave.id]))[0].last_used_at); comprobaciones++

  // Límite por minuto.
  const limite = async () => (await filas('select public.take_social_agent_rate($1,3) as ok', [llave.id]))[0].ok
  assert.deepEqual([await limite(), await limite(), await limite(), await limite()], [true, true, true, false]); comprobaciones++

  // Creación idempotente.
  const doc = { version: 1, tipo: 'video', video: { medioId: null }, textos: { facebook: '', instagram: '' } }
  const crear = async (idem, k = llave) => (await filas('select public.agent_create_social_custom_post($1,$2,$3,$4,$5,$6) as r', [k.id, dueno, 'Pieza del agente', doc, ['facebook'], idem]))[0].r
  const a = await crear('clave-uno-123'); assert.equal(a.replayed, false)
  const b = await crear('clave-uno-123'); assert.equal(b.replayed, true); assert.equal(b.id, a.id); comprobaciones += 2
  const c = await crear('clave-dos-123'); assert.notEqual(c.id, a.id); comprobaciones++
  await esperarError(() => crear('corta'), e => e.code === '23514')
  const otra = await nuevaLlave(); const d = await crear('clave-uno-123', otra); assert.notEqual(d.id, a.id); comprobaciones++
  assert.equal((await filas("select count(*)::int n from public.editorial_audit_log where action='social.agent.created'"))[0].n, 3); comprobaciones++

  // Solicitud de aprobación: solo piezas propias, en borrador y con la revisión vigente.
  const solicitar = async (id, rev, k = llave) => filas('select * from public.agent_request_social_approval($1,$2,$3,$4,$5,$6)', [k.id, dueno, id, rev, 'Revisa por favor', new Date(Date.now() + 3600e3).toISOString()])
  assert.equal((await solicitar(a.id, 9)).length, 0); assert.equal((await solicitar(a.id, 1, otra)).length, 0); comprobaciones += 2
  const s = (await solicitar(a.id, 1))[0]; assert.ok(s.approval_requested_at); assert.equal(s.approval_note, 'Revisa por favor'); comprobaciones += 2
  // Editar desde el editor humano borra la solicitud.
  await filas('select * from public.save_social_custom_post($1,$2,$3,$4,$5,$6)', [dueno, a.id, 'Editada', doc, ['facebook'], 1])
  const tras = (await filas('select approval_requested_at, approval_note, suggested_at, revision from public.social_custom_posts where id=$1', [a.id]))[0]
  assert.equal(tras.approval_requested_at, null); assert.equal(tras.approval_note, null); assert.equal(tras.revision, 2); comprobaciones += 3

  // Programación delegada: propia, con revisión, cuota móvil y auditoría.
  const programar = async (id, rev, k = llave, cuando = new Date(Date.now() + 3600e3).toISOString()) => filas('select * from public.agent_schedule_social_custom_post($1,$2,$3,$4,$5,$6)', [k.id, dueno, id, rev, cuando, 2])
  assert.equal((await programar(a.id, 1)).length, 0); assert.equal((await programar(a.id, 2, otra)).length, 0); comprobaciones += 2
  const p1 = (await programar(a.id, 2))[0]; assert.equal(p1.status, 'scheduled'); comprobaciones++
  assert.equal((await programar(a.id, 2)).length, 0); comprobaciones++ // ya no es borrador
  const e = (await crear('clave-tres-123')); const p2 = (await programar(e.id, 1))[0]; assert.equal(p2.status, 'scheduled'); comprobaciones++
  const f = (await crear('clave-cuatro-12'))
  await esperarError(() => programar(f.id, 1), err => /Cuota/.test(err.message))
  assert.equal((await filas('select status from public.social_custom_posts where id=$1', [f.id]))[0].status, 'draft'); comprobaciones++
  const canceladas = await filas('select * from public.agent_cancel_social_custom_schedule($1,$2,$3)', [llave.id, dueno, a.id]); assert.equal(canceladas[0].status, 'draft'); comprobaciones++
  assert.equal((await filas('select * from public.agent_cancel_social_custom_schedule($1,$2,$3)', [otra.id, dueno, e.id])).length, 0); comprobaciones++

  // Eliminación: solo borradores propios sin envíos.
  const borrar = async (id, k = llave) => (await filas('select public.agent_delete_social_custom_post($1,$2,$3) as ok', [k.id, dueno, id]))[0].ok
  assert.equal(await borrar(e.id), false) // programada
  assert.equal(await borrar(a.id, otra), false) // ajena
  assert.equal(await borrar(a.id), true); assert.equal(await borrar(a.id), false); comprobaciones += 4
  const conEnvio = await crear('clave-cinco-123'); await db.query("insert into public.social_custom_publications(post_id,actor_id,destination,content_hash,status) values($1,$2,'facebook',$3,'sending')", [conEnvio.id, dueno, hash('z')])
  assert.equal(await borrar(conEnvio.id), false); comprobaciones++

  // Permisos: nada es ejecutable por anon ni authenticated.
  const permisos = (await filas(`select
    has_function_privilege('service_role','public.authenticate_social_agent_key(text)','execute') servidor,
    has_function_privilege('anon','public.authenticate_social_agent_key(text)','execute') anon_auth,
    has_function_privilege('authenticated','public.agent_schedule_social_custom_post(uuid,uuid,uuid,integer,timestamptz,integer)','execute') auth_prog,
    has_function_privilege('authenticated','public.agent_create_social_custom_post(uuid,uuid,text,jsonb,text[],text)','execute') auth_crear,
    has_table_privilege('authenticated','public.social_agent_keys','select') lee_llaves,
    has_table_privilege('anon','public.social_agent_rate','select') lee_tasa,
    has_table_privilege('service_role','public.social_agent_keys','delete') borra_llaves`))[0]
  assert.deepEqual(permisos, { servidor: true, anon_auth: false, auth_prog: false, auth_crear: false, lee_llaves: false, lee_tasa: false, borra_llaves: false }); comprobaciones += 7

  console.log(`SQL integrado (API de agentes): ${comprobaciones} comprobaciones pasan en PostgreSQL WASM.`)
} finally { await db.close() }
