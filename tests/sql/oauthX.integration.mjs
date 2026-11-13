import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const require = createRequire(resolve('.codex/qa-redes/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const actor = '11111111-1111-4111-8111-111111111111', otro = '22222222-2222-4222-8222-222222222222'
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${actor}'),('${otro}');
create table public.editorial_audit_log(actor_id uuid,action text,entity_type text,entity_id uuid,metadata jsonb);
grant usage on schema public,auth to service_role; grant insert on public.editorial_audit_log to service_role;`)
await db.exec(await readFile('supabase/migrations/20261112131534_conexion_oauth_x_servidor.sql','utf8'))
let total = 0
for (const rol of ['anon','authenticated']) {
  await db.exec(`set role ${rol}`)
  for (const tabla of ['social_x_connections','social_x_oauth_attempts']) { await assert.rejects(db.query(`select * from public.${tabla}`), /permission denied/); total++ }
  await assert.rejects(db.query('select public.consume_social_x_oauth($1,$2,$3)', [actor,'a'.repeat(64),'b'.repeat(64)]), /permission denied/); total++
  await db.exec('reset role')
}
await db.exec('set role service_role')
const flow = 'v1.' + 'x'.repeat(150)
const iniciar = async (hash,actorId = actor) => (await db.query('select public.begin_social_x_oauth($1,$2,$3,$4) as id', [actorId,hash,'b'.repeat(64),flow])).rows[0].id
const id = await iniciar('a'.repeat(64))
const consumir = async (actorId, browserHash = 'b'.repeat(64)) => (await db.query('select public.consume_social_x_oauth($1,$2,$3) as intento',[actorId,'a'.repeat(64),browserHash])).rows[0].intento
assert.equal(await consumir(otro), null); total++
assert.equal(await consumir(actor,'c'.repeat(64)), null); total++
assert.equal((await consumir(actor)).id, id); total++
assert.equal(await consumir(actor), null); total++
const scopes = ['tweet.read','users.read','tweet.write','media.write','offline.access']
const guardar = (usuario = 'Pont3la10') => db.query('select public.save_social_x_connection($1,$2,$3,$4,$5,$6,$7)',[actor,id,'123',usuario,flow,new Date(Date.now()+7200000).toISOString(),scopes])
await assert.rejects(guardar('cuenta_personal'),/inválida/); total++
await guardar(); total++
await assert.rejects(guardar(),/inválida/); total++
await db.exec('reset role')
assert.equal((await db.query('select count(*)::int as n from public.editorial_audit_log')).rows[0].n,2); total++
assert.equal((await db.query('select count(*)::int as n from public.social_x_connections')).rows[0].n,1); total++
await db.exec('set role service_role')
for (const letra of ['c','d','e','f']) await iniciar(letra.repeat(64))
await assert.rejects(iniciar('0'.repeat(64)),/Demasiados/); total++
await db.exec('reset role')
assert.equal((await db.query("select bool_and(relrowsecurity) as protegido from pg_class where relname in ('social_x_connections','social_x_oauth_attempts')")).rows[0].protegido,true); total++
await db.close()
console.log(`${total} comprobaciones SQL OAuth X pasan: grants/RLS, vínculo actor/navegador, replay, cuenta, auditoría y límite. Fixture aislado.`)
