// npm install --prefix .codex/validacion-automatizacion --no-save --package-lock=false @electric-sql/pglite@0.5.15
// node tests/sql/publicacionesPropias.integration.mjs
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

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.editorial_audit_log(actor_id uuid, action text, entity_type text, entity_id uuid, metadata jsonb);
  `)
  const migracion = await readFile('supabase/migrations/20261116150000_publicaciones_sociales_propias.sql', 'utf8')
  await db.exec(migracion)
  const actor = randomUUID()
  await db.query('insert into auth.users values($1)', [actor])
  const documento = { version: 1 }

  // Restricciones de la tabla.
  await esperarError(() => db.query("insert into public.social_custom_posts(title,document,created_by) values('ab',$1,$2)", [documento, actor]), e => e.code === '23514')
  await esperarError(() => db.query("insert into public.social_custom_posts(title,document,created_by,destinations) values('Pieza válida',$1,$2,array['x'])", [documento, actor]), e => e.code === '23514')
  await esperarError(() => db.query("insert into public.social_custom_posts(title,document,created_by,status) values('Pieza válida',$1,$2,'scheduled')", [documento, actor]), e => e.code === '23514')
  const post = (await db.query("insert into public.social_custom_posts(title,document,created_by,updated_by) values('Pieza válida',$1,$2,$2) returning id,status,revision,destinations", [documento, actor])).rows[0]
  assert.equal(post.status, 'draft'); assert.equal(post.revision, 1); assert.deepEqual(post.destinations, ['facebook', 'instagram'])
  comprobaciones += 3

  // Reserva idempotente: la misma huella no se reclama dos veces.
  const huella = hash('uno')
  const begin = async () => (await db.query('select public.begin_social_custom_publication($1,$2,$3,$4) as r', [actor, post.id, 'facebook', huella])).rows[0].r
  const primera = await begin()
  assert.equal(primera.claimed, true); assert.equal(primera.status, 'preparing'); comprobaciones += 2
  const repetida = await begin()
  assert.equal(repetida.claimed, false); assert.equal(repetida.claim_id, null); comprobaciones += 2
  await esperarError(() => db.query('select public.begin_social_custom_publication($1,$2,$3,$4)', [actor, post.id, 'tiktok', huella]), e => /Destino/.test(e.message))
  await esperarError(() => db.query('select public.begin_social_custom_publication($1,$2,$3,$4)', [actor, post.id, 'facebook', 'no-es-hash']), e => /huella/.test(e.message))

  // Transiciones válidas e inválidas.
  const estado = (p_status, extra = {}) => db.query('select public.set_social_custom_publication_status($1,$2,$3,$4,$5,$6)',
    [actor, primera.id, primera.claim_id, p_status, extra.id ?? null, extra.url ?? null])
  await esperarError(() => estado('published', { id: '123_456', url: 'https://www.facebook.com/123_456' }), e => /transicion/.test(e.message)) // preparing -> published no existe
  await estado('sending')
  await esperarError(() => estado('published', { id: '123_456', url: 'https://www.facebook.com/otro' }), e => /Recibo/.test(e.message))
  await estado('published', { id: '123_456', url: 'https://www.facebook.com/123_456' })
  const recibo = (await db.query('select status,provider_post_id,post_url from public.social_custom_publications where id=$1', [primera.id])).rows[0]
  assert.equal(recibo.status, 'published'); assert.equal(recibo.post_url, 'https://www.facebook.com/123_456'); comprobaciones += 2
  const yaPublicada = await begin()
  assert.equal(yaPublicada.status, 'published'); assert.equal(yaPublicada.post_url, 'https://www.facebook.com/123_456'); comprobaciones += 2
  await esperarError(() => db.query("update public.social_custom_publications set status='published', provider_post_id=null where id=$1", [primera.id]), e => e.code === '23514')

  // Reintento tras un fallo: incrementa intentos, con otra huella no hay conflicto.
  const h2 = hash('dos')
  const r2 = (await db.query('select public.begin_social_custom_publication($1,$2,$3,$4) as r', [actor, post.id, 'instagram', h2])).rows[0].r
  await db.query('select public.set_social_custom_publication_status($1,$2,$3,$4)', [actor, r2.id, r2.claim_id, 'failed'])
  const r3 = (await db.query('select public.begin_social_custom_publication($1,$2,$3,$4) as r', [actor, post.id, 'instagram', h2])).rows[0].r
  assert.equal(r3.claimed, true); assert.notEqual(r3.claim_id, r2.claim_id)
  assert.equal((await db.query('select attempts from public.social_custom_publications where id=$1', [r2.id])).rows[0].attempts, 2); comprobaciones += 3
  // Rutas de almacenamiento: solo las de la propia reserva.
  await esperarError(() => db.query('select public.set_social_custom_publication_status($1,$2,$3,$4,null,null,$5)', [actor, r3.id, r3.claim_id, 'preparing', ['../otra/ruta.jpg']]), e => /Rutas/.test(e.message))
  await db.query('select public.set_social_custom_publication_status($1,$2,$3,$4,null,null,$5)', [actor, r3.id, r3.claim_id, 'preparing', [`${r3.id}/${r3.claim_id}/0.jpg`]]); comprobaciones++
  // Una reserva ajena no puede cambiar el estado.
  await esperarError(() => db.query('select public.set_social_custom_publication_status($1,$2,$3,$4)', [randomUUID(), r3.id, r3.claim_id, 'failed']), e => /transicion/.test(e.message))

  // Guardar, programar y cancelar pasan por RPC con auditoría y control de revisión.
  const fila = async (sql, params) => (await db.query(sql, params)).rows
  const post2 = (await db.query("insert into public.social_custom_posts(title,document,created_by,updated_by) values('Segunda pieza',$1,$2,$2) returning id", [documento, actor])).rows[0].id
  const guardar = (rev, titulo = 'Segunda editada') => fila('select * from public.save_social_custom_post($1,$2,$3,$4,$5,$6)', [actor, post2, titulo, documento, ['facebook'], rev])
  assert.equal((await guardar(99)).length, 0); comprobaciones++ // revisión equivocada: no cambia nada
  const g1 = (await guardar(1))[0]
  assert.equal(g1.revision, 2); assert.equal(g1.title, 'Segunda editada'); assert.deepEqual(g1.destinations, ['facebook']); comprobaciones += 3
  const programar = (rev, cuando = "now() + interval '2 hours'") => fila(`select * from public.schedule_social_custom_post($1,$2,$3,${cuando})`, [actor, post2, rev])
  assert.equal((await programar(1)).length, 0); comprobaciones++
  const p1 = (await programar(2))[0]
  assert.equal(p1.status, 'scheduled'); assert.ok(p1.scheduled_at); comprobaciones += 2
  assert.equal((await programar(2)).length, 0); comprobaciones++ // ya no es borrador
  const editada = (await guardar(2, 'Editada tras programar'))[0]
  assert.equal(editada.status, 'draft'); assert.equal(editada.scheduled_at, null); assert.equal(editada.revision, 3); comprobaciones += 3
  await programar(3)
  const cancelada = (await fila('select * from public.cancel_social_custom_schedule($1,$2)', [actor, post2]))[0]
  assert.equal(cancelada.status, 'draft'); comprobaciones++
  assert.equal((await fila('select * from public.cancel_social_custom_schedule($1,$2)', [actor, post2])).length, 0); comprobaciones++
  const acciones = (await fila("select action from public.editorial_audit_log where entity_id=$1 order by action", [post2])).map(f => f.action)
  for (const accion of ['social.custom.saved', 'social.custom.schedule_approved', 'social.custom.schedule_cancelled', 'social.custom.schedule_cancelled_by_edit']) assert.ok(acciones.includes(accion), accion)
  comprobaciones += 4

  // Programador: reclama solo lo vencido, una pieza por ciclo, y no dos veces.
  assert.equal((await db.query('select public.claim_due_social_custom_post() as r')).rows[0].r, null); comprobaciones++
  await db.query("update public.social_custom_posts set status='scheduled', scheduled_at=now()+interval '1 hour' where id=$1", [post.id])
  assert.equal((await db.query('select public.claim_due_social_custom_post() as r')).rows[0].r, null); comprobaciones++
  await db.query("update public.social_custom_posts set scheduled_at=now()-interval '1 minute' where id=$1", [post.id])
  const trabajo = (await db.query('select public.claim_due_social_custom_post() as r')).rows[0].r
  assert.equal(trabajo.id, post.id); assert.equal(trabajo.revision, 1); assert.deepEqual(trabajo.destinations, ['facebook', 'instagram']); assert.equal(trabajo.actor_id, actor); comprobaciones += 4
  assert.equal((await db.query('select public.claim_due_social_custom_post() as r')).rows[0].r, null); comprobaciones++
  assert.equal((await db.query('select status from public.social_custom_posts where id=$1', [post.id])).rows[0].status, 'publishing'); comprobaciones++
  await esperarError(() => db.query("select public.finish_social_custom_post($1,'scheduled')", [post.id]), e => /Estado/.test(e.message))
  // Solo Facebook tiene recibo publicado: aunque el programador diga 'published', la pieza queda fallida.
  await db.query("select public.finish_social_custom_post($1,'published')", [post.id])
  assert.equal((await db.query('select status from public.social_custom_posts where id=$1', [post.id])).rows[0].status, 'failed'); comprobaciones++
  // Con ambos destinos publicados, el estado sale de los recibos.
  await db.query("update public.social_custom_posts set status='publishing' where id=$1", [post.id])
  await db.query("update public.social_custom_publications set status='published', provider_post_id='999_1', post_url='https://www.instagram.com/p/AbC123/' where id=$1", [r3.id])
  await db.query("select public.finish_social_custom_post($1,'failed')", [post.id])
  assert.equal((await db.query('select status from public.social_custom_posts where id=$1', [post.id])).rows[0].status, 'published'); comprobaciones++
  await db.query("select public.finish_social_custom_post($1,'failed')", [post.id]) // ya no está en publishing: no cambia
  assert.equal((await db.query('select status from public.social_custom_posts where id=$1', [post.id])).rows[0].status, 'published'); comprobaciones++

  // Recuperación: un envío atascado más de 15 minutos y una programación vencida hace más de 24 h se cierran sin publicar.
  const atascada = (await db.query("insert into public.social_custom_posts(title,document,created_by,updated_by,status,updated_at) values('Atascada',$1,$2,$2,'publishing',now()-interval '16 minutes') returning id", [documento, actor])).rows[0].id
  const vieja = (await db.query("insert into public.social_custom_posts(title,document,created_by,updated_by,status,scheduled_at) values('Vieja',$1,$2,$2,'scheduled',now()-interval '25 hours') returning id", [documento, actor])).rows[0].id
  const reciente = (await db.query("insert into public.social_custom_posts(title,document,created_by,updated_by,status,updated_at) values('En curso',$1,$2,$2,'publishing',now()-interval '2 minutes') returning id", [documento, actor])).rows[0].id
  assert.equal((await db.query('select public.claim_due_social_custom_post() as r')).rows[0].r, null); comprobaciones++
  const estados = Object.fromEntries((await fila('select id,status from public.social_custom_posts where id = any($1)', [[atascada, vieja, reciente]])).map(f => [f.id, f.status]))
  assert.equal(estados[atascada], 'failed'); assert.equal(estados[vieja], 'failed'); assert.equal(estados[reciente], 'publishing'); comprobaciones += 3
  assert.equal((await fila("select count(*)::int n from public.editorial_audit_log where action='social.custom.expired'"))[0].n, 2); comprobaciones++

  // Auditoría y permisos: solo service_role ejecuta; anon y authenticated no leen ni escriben.
  assert.ok((await db.query("select count(*)::int n from public.editorial_audit_log where action like 'social.custom.%'")).rows[0].n >= 4); comprobaciones++
  const permisos = (await db.query(`select
    has_function_privilege('service_role','public.begin_social_custom_publication(uuid,uuid,text,text)','execute') servidor,
    has_function_privilege('authenticated','public.begin_social_custom_publication(uuid,uuid,text,text)','execute') autenticado,
    has_function_privilege('anon','public.claim_due_social_custom_post()','execute') anonimo,
    has_function_privilege('authenticated','public.save_social_custom_post(uuid,uuid,text,jsonb,text[],integer)','execute') guardar_auth,
    has_function_privilege('authenticated','public.schedule_social_custom_post(uuid,uuid,integer,timestamptz)','execute') programar_auth,
    has_function_privilege('anon','public.cancel_social_custom_schedule(uuid,uuid)','execute') cancelar_anon,
    has_table_privilege('authenticated','public.social_custom_posts','select') lee_auth,
    has_table_privilege('anon','public.social_custom_publications','select') lee_anon,
    has_table_privilege('service_role','public.social_custom_posts','update') escribe_servidor`)).rows[0]
  assert.deepEqual(permisos, { servidor: true, autenticado: false, anonimo: false, guardar_auth: false, programar_auth: false, cancelar_anon: false, lee_auth: false, lee_anon: false, escribe_servidor: true }); comprobaciones += 9
  const rls = (await db.query("select relname, relrowsecurity from pg_class where relname in ('social_custom_posts','social_custom_publications') order by 1")).rows
  assert.ok(rls.every(fila => fila.relrowsecurity)); comprobaciones++

  console.log(`SQL integrado (publicaciones propias): ${comprobaciones} comprobaciones pasan en PostgreSQL WASM.`)
} finally { await db.close() }
