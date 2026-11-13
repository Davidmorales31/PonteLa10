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
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table public.articles(id uuid primary key); insert into public.articles values('${article}');
create table public.editorial_audit_log(actor_id uuid,action text,entity_type text,entity_id uuid,metadata jsonb);
grant usage on schema public,auth to service_role; grant insert on public.editorial_audit_log to service_role;`)
await db.exec(await readFile('supabase/migrations/20261113045958_publicaciones_meta_seguras.sql', 'utf8'))
let total = 0
for (const role of ['anon', 'authenticated']) {
  await db.exec(`set role ${role}`)
  await assert.rejects(db.query('select * from public.social_meta_publications'), /permission denied/); total++
  await assert.rejects(db.query('select public.begin_social_meta_publication($1,$2,$3,$4)', [actor, article, 'facebook', 'a'.repeat(64)]), /permission denied/); total++
  await assert.rejects(db.query('select public.set_social_meta_publication_status($1,$2,$3,$4)', [actor, article, article, 'sending']), /permission denied/); total++
  await db.exec('reset role')
}
await db.exec('set role service_role')
const begin = async (hash, destination = 'facebook') => (await db.query(
  'select public.begin_social_meta_publication($1,$2,$3,$4) as result', [actor, article, destination, hash])).rows[0].result
const status = async (entry, value, post = null, url = null) => db.query(
  'select public.set_social_meta_publication_status($1,$2,$3,$4,$5,$6)', [actor, entry.id, entry.claim_id, value, post, url])
const first = await begin('a'.repeat(64))
assert.equal(first.claimed, true); total++
assert.equal((await begin('a'.repeat(64))).claimed, false); total++
const instagram = await begin('a'.repeat(64), 'instagram')
assert.equal(instagram.claimed, true); assert.notEqual(instagram.id, first.id); total++
await assert.rejects(status(first, 'published', '123_456', 'https://www.facebook.com/123_456'), /transicion/); total++
await assert.rejects(status({ ...first, claim_id: article }, 'sending'), /Reserva/); total++
await status(first, 'sending'); await status(first, 'published', '123_456', 'https://www.facebook.com/123_456')
assert.equal((await begin('a'.repeat(64))).status, 'published'); total++
await assert.rejects(status(first, 'failed'), /Reserva/); total++
await status(instagram, 'sending'); await status(instagram, 'uncertain')
assert.equal((await begin('a'.repeat(64), 'instagram')).status, 'uncertain'); total++
const failed = await begin('b'.repeat(64))
const previousPath = `${failed.id}/${failed.claim_id}/0.jpg`
await db.query('select public.set_social_meta_publication_status($1,$2,$3,$4,null,null,$5,null,$6)',
  [actor, failed.id, failed.claim_id, 'preparing', [previousPath], ['987']])
await status(failed, 'failed')
const retry = await begin('b'.repeat(64))
assert.equal(retry.claimed, true); assert.notEqual(retry.claim_id, failed.claim_id); total++
const history = (await db.query('select retired_media_paths,retired_provider_media_ids,media_paths from public.social_meta_publications where id=$1', [failed.id])).rows[0]
assert.deepEqual(history.retired_media_paths, [previousPath]); assert.deepEqual(history.retired_provider_media_ids, ['987']); assert.deepEqual(history.media_paths, []); total++
await assert.rejects(status(failed, 'sending'), /Reserva/); total++
await status(retry, 'failed'); const third = await begin('b'.repeat(64)); await status(third, 'failed')
assert.equal((await begin('b'.repeat(64))).claimed, false); total++
const stale = await begin('c'.repeat(64))
await db.query("update public.social_meta_publications set updated_at=now()-interval '11 minutes' where id=$1", [stale.id])
assert.equal((await begin('c'.repeat(64))).status, 'uncertain'); total++
await assert.rejects(status(stale, 'sending'), /Reserva/); total++
const malformed = await begin('d'.repeat(64))
await assert.rejects(db.query('select public.set_social_meta_publication_status($1,$2,$3,$4,null,null,$5)',
  [actor, malformed.id, malformed.claim_id, 'preparing', ['otro/directorio.jpg']]), /Rutas invalidas/); total++
await status(malformed, 'sending')
await assert.rejects(status(malformed, 'published', '999', 'https://sitio-ajeno.test/'), /Recibo/); total++
await db.exec('reset role')
assert.equal((await db.query("select relrowsecurity from pg_class where relname='social_meta_publications'")).rows[0].relrowsecurity, true); total++
assert.equal((await db.query("select public from storage.buckets where id='social-meta-private'")).rows[0].public, false); total++
assert.equal((await db.query("select count(*)::int as n from public.editorial_audit_log where action='social.meta.published'")).rows[0].n, 1); total++
await db.close()
console.log(`${total} comprobaciones SQL Meta pasan: grants/RLS, destinos separados, CAS, recibos, inciertos, reintentos limitados y bucket privado.`)
