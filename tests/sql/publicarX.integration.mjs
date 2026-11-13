import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const require = createRequire(resolve('.codex/qa-redes/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const actor = '11111111-1111-4111-8111-111111111111'
const article = '33333333-3333-4333-8333-333333333333'
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${actor}');
create table public.articles(id uuid primary key); insert into public.articles values('${article}');
create table public.editorial_audit_log(actor_id uuid,action text,entity_type text,entity_id uuid,metadata jsonb);
grant usage on schema public,auth to service_role; grant insert on public.editorial_audit_log to service_role;`)
await db.exec(await readFile('supabase/migrations/20261113024745_publicar_x_idempotente.sql', 'utf8'))
let total = 0
for (const rol of ['anon', 'authenticated']) {
  await db.exec(`set role ${rol}`)
  await assert.rejects(db.query('select * from public.social_x_publications'), /permission denied/); total++
  await assert.rejects(db.query('select public.begin_social_x_publication($1,$2,$3)', [actor, article, 'a'.repeat(64)]), /permission denied/); total++
  await db.exec('reset role')
}
await db.exec('set role service_role')
const begin = async hash => (await db.query('select public.begin_social_x_publication($1,$2,$3) as result', [actor, article, hash])).rows[0].result
const status = async (id, value, postId = null, url = null, errorCode = null) => db.query(
  'select public.set_social_x_publication_status($1,$2,$3,$4,$5,$6)', [actor, id, value, postId, url, errorCode])
const hash1 = 'a'.repeat(64)
const first = await begin(hash1)
assert.equal(first.status, 'reserved'); assert.equal(first.claimed, true); total++
assert.equal((await begin(hash1)).claimed, false); total++
await assert.rejects(status(first.id, 'published', '123456789', 'https://x.com/Pont3la10/status/123456789'), /Transición de publicación inválida/); total++
await status(first.id, 'uploading'); await status(first.id, 'sending')
await status(first.id, 'published', '123456789', 'https://x.com/Pont3la10/status/123456789')
const repeated = await begin(hash1)
assert.equal(repeated.status, 'published'); assert.equal(repeated.post_id, '123456789'); assert.equal(repeated.claimed, false); total++
const hash2 = 'b'.repeat(64), second = await begin(hash2)
await status(second.id, 'uploading'); await status(second.id, 'sending'); await status(second.id, 'uncertain', null, null, 'proveedor_no_disponible')
const uncertain = await begin(hash2)
assert.equal(uncertain.status, 'uncertain'); assert.equal(uncertain.claimed, false); total++
const hash3 = 'c'.repeat(64), failed = await begin(hash3)
await status(failed.id, 'failed', null, null, 'media_rechazada')
const retry = await begin(hash3)
assert.equal(retry.claimed, true); assert.equal((await db.query('select attempt_count from public.social_x_publications where id=$1', [retry.id])).rows[0].attempt_count, 2); total++
await db.exec('reset role')
assert.equal((await db.query('select count(*)::int as count from public.editorial_audit_log')).rows[0].count, 11); total++
assert.equal((await db.query("select relrowsecurity from pg_class where relname='social_x_publications'")).rows[0].relrowsecurity, true); total++
await db.close()
console.log(`${total} comprobaciones SQL de publicación X pasan: RLS/grants, reserva única, recibo, estado incierto, reintento limitado y auditoría. Fixture PGlite aislado.`)
