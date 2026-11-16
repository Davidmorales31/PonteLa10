import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const require = createRequire(resolve('.codex/worktrees/redes-sociales/.codex/qa-redes/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const actor = '11111111-1111-4111-8111-111111111111'
const articulos = Array.from({ length: 7 }, (_, i) => `33333333-3333-4333-8333-33333333333${i}`)
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${actor}');
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table public.articles(id uuid primary key); ${articulos.map(id => `insert into public.articles values('${id}');`).join('')}
create table public.editorial_audit_log(actor_id uuid,action text,entity_type text,entity_id uuid,metadata jsonb);
grant usage on schema public,auth to service_role; grant insert on public.editorial_audit_log to service_role;`)
for (const archivo of ['20261113024745_publicar_x_idempotente.sql', '20261113045958_publicaciones_meta_seguras.sql', '20261115034324_bloquear_republicacion_social_por_destino.sql']) {
  await db.exec(await readFile(`supabase/migrations/${archivo}`, 'utf8'))
}
let total = 0
for (const rol of ['anon', 'authenticated']) {
  await db.exec(`set role ${rol}`)
  await assert.rejects(db.query('select public.begin_social_meta_publication($1,$2,$3,$4)', [actor, articulos[0], 'facebook', 'a'.repeat(64)]), /permission denied/); total++
  await assert.rejects(db.query('select public.begin_social_x_publication($1,$2,$3)', [actor, articulos[0], 'a'.repeat(64)]), /permission denied/); total++
  await db.exec('reset role')
}
await db.exec('set role service_role')
const meta = async (articulo, destino, hash) => (await db.query('select public.begin_social_meta_publication($1,$2,$3,$4) as r', [actor, articulo, destino, hash.repeat(64)])).rows[0].r
const x = async (articulo, hash) => (await db.query('select public.begin_social_x_publication($1,$2,$3) as r', [actor, articulo, hash.repeat(64)])).rows[0].r
const cambiarMeta = async (r, estado, id = null, url = null) => db.query('select public.set_social_meta_publication_status($1,$2,$3,$4,$5,$6)', [actor,r.id,r.claim_id,estado,id,url])
const primero = await meta(articulos[0], 'facebook', 'a')
const carrera = await meta(articulos[0], 'facebook', 'b')
assert.equal(primero.claimed, true); assert.equal(carrera.claimed, false); assert.equal(carrera.id, primero.id); total += 3
await cambiarMeta(primero,'sending'); await cambiarMeta(primero,'published','123','https://www.facebook.com/123')
const editado = await meta(articulos[0], 'facebook', 'c')
assert.equal(editado.status,'published'); assert.equal(editado.claimed,false); assert.equal(editado.post_url,'https://www.facebook.com/123'); total += 3
assert.equal((await meta(articulos[0], 'instagram', 'a')).claimed,true); total++
const incierto = await meta(articulos[1],'facebook','a'); await cambiarMeta(incierto,'sending'); await cambiarMeta(incierto,'uncertain')
assert.equal((await meta(articulos[1],'facebook','b')).status,'uncertain'); total++
const fallido = await meta(articulos[2],'facebook','a'); await cambiarMeta(fallido,'failed')
assert.equal((await meta(articulos[2],'facebook','b')).claimed,true); total++
const primeroX = await x(articulos[3],'a')
assert.equal((await x(articulos[3],'b')).claimed,false); total++
await db.query('select public.set_social_x_publication_status($1,$2,$3)',[actor,primeroX.id,'uploading'])
await db.query('select public.set_social_x_publication_status($1,$2,$3)',[actor,primeroX.id,'sending'])
await db.query('select public.set_social_x_publication_status($1,$2,$3,$4,$5)',[actor,primeroX.id,'published','456','https://x.com/Pont3la10/status/456'])
assert.equal((await x(articulos[3],'c')).status,'published'); total++
const inciertoX = await x(articulos[4],'a')
await db.query('select public.set_social_x_publication_status($1,$2,$3)',[actor,inciertoX.id,'uploading'])
await db.query('select public.set_social_x_publication_status($1,$2,$3)',[actor,inciertoX.id,'sending'])
await db.query('select public.set_social_x_publication_status($1,$2,$3)',[actor,inciertoX.id,'uncertain'])
assert.equal((await x(articulos[4],'b')).status,'uncertain'); total++
const fallidoX = await x(articulos[5],'a'); await db.query('select public.set_social_x_publication_status($1,$2,$3)',[actor,fallidoX.id,'failed'])
assert.equal((await x(articulos[5],'b')).claimed,true); total++
await db.exec('reset role')
const caducado = await meta(articulos[6],'facebook','a')
await db.query("update public.social_meta_publications set updated_at=now()-interval '20 minutes' where id=$1",[caducado.id])
assert.equal((await meta(articulos[6],'facebook','b')).status,'uncertain'); total++
for (const tabla of ['social_meta_publications','social_x_publications']) {
  assert.equal((await db.query('select relrowsecurity from pg_class where relname=$1',[tabla])).rows[0].relrowsecurity,true); total++
}
await db.close()
console.log(`${total} comprobaciones SQL pasan: bloqueo de otra huella, publicación parcial, inciertos, fallidos, permisos y RLS. Sin DB remota.`)
