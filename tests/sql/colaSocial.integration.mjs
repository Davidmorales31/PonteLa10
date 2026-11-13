import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const require = createRequire(resolve('.codex/qa-redes/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const actor = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222'
const article = '33333333-3333-4333-8333-333333333333', second = '44444444-4444-4444-8444-444444444444'
const batch = '55555555-5555-4555-8555-555555555555'
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${actor}'),('${other}');
create table public.articles(id uuid primary key,status text);insert into public.articles values('${article}','published'),('${second}','published');
create table public.user_roles(user_id uuid,role text,is_active boolean);insert into public.user_roles values('${actor}','propietario',true);
create table public.editorial_role_permissions(role text,permission text);insert into public.editorial_role_permissions values('propietario','contenido.editarTodos');
create table public.editorial_audit_log(actor_id uuid,action text,entity_type text,entity_id uuid,metadata jsonb);
grant usage on schema public,auth to service_role;grant select on public.articles,public.user_roles,public.editorial_role_permissions to service_role;grant insert on public.editorial_audit_log to service_role;`)
await db.exec(await readFile('supabase/migrations/20261113052608_cola_social_programada.sql','utf8'))
let n = 0
for (const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`)
  for (const table of ['social_schedule_batches','social_scheduled_publications','social_scheduler_state']) {
    await assert.rejects(db.query(`select * from public.${table}`),/permission denied/); n++
  }
  await assert.rejects(db.query('select public.claim_social_scheduled_publication()'),/permission denied/); n++
  await db.exec('reset role')
}
await db.exec('set role service_role')
const items = JSON.stringify([article,second].map(id => ({ id,revision: 0,articleVersion: 1,hash: 'a'.repeat(64),imageHash: 'b'.repeat(64) })))
const enqueue = (id = batch, user = actor, destinations = ['facebook','instagram']) => db.query('select public.enqueue_social_schedule($1,$2,now()+interval \'1 hour\',15,$3,$4)',[id,user,items,destinations])
await assert.rejects(enqueue(batch,other),/Permiso revocado/); n++
await enqueue(); n++
await enqueue(); assert.equal((await db.query('select count(*)::int n from public.social_scheduled_publications')).rows[0].n,2); n++
assert.equal((await db.query('select extract(epoch from max(run_at)-min(run_at))::int n from public.social_scheduled_publications')).rows[0].n,900); n++
const claim = async () => (await db.query('select public.claim_social_scheduled_publication() j')).rows[0].j
assert.equal(await claim(),null); n++
await db.query("update public.social_scheduled_publications set run_at=now()-interval '1 minute'")
const first = await claim(); assert.equal(first.position,0); n++
assert.equal(await claim(),null); n++
await assert.rejects(db.query('select public.finish_social_scheduled_publication($1,$2,$3,$4)',[first.id,other,'published','{}']),/Reserva/); n++
await db.query('select public.finish_social_scheduled_publication($1,$2,$3,$4)',[first.id,first.claim_id,'published','{}'])
assert.equal(await claim(),null); n++ // Respeta intervalo real tras una parada, no vacía todos los atrasos de golpe.
await db.query("update public.social_scheduled_publications set started_at=now()-interval '16 minutes' where id=$1",[first.id])
const next = await claim(); assert.equal(next.position,1); n++
await assert.rejects(db.query('select public.cancel_social_schedule($1,$2)',[batch,other]),/Lote ajeno/); n++
assert.equal((await db.query('select public.cancel_social_schedule($1,$2) n',[batch,actor])).rows[0].n,0); n++ // No cancelar lo que ya está enviándose.
await db.query("update public.social_scheduled_publications set started_at=now()-interval '16 minutes' where id=$1",[next.id])
assert.equal(await claim(),null)
assert.equal((await db.query('select status from public.social_scheduled_publications where id=$1',[next.id])).rows[0].status,'uncertain'); n++
await assert.rejects(db.query('select public.finish_social_scheduled_publication($1,$2,$3,$4)',[next.id,next.claim_id,'published','{}']),/Reserva/); n++
const batch2 = '66666666-6666-4666-8666-666666666666'
await enqueue(batch2)
await db.query("update public.social_scheduled_publications set run_at=now()-interval '25 hours' where batch_id=$1",[batch2])
assert.equal(await claim(),null)
assert.equal((await db.query("select count(*)::int n from public.social_scheduled_publications where batch_id=$1 and status='failed'",[batch2])).rows[0].n,2); n++
const batch3 = '77777777-7777-4777-8777-777777777777'
await enqueue(batch3)
await assert.rejects(enqueue('88888888-8888-4888-8888-888888888888'),/duplicate key/); n++
assert.equal((await db.query('select public.cancel_social_schedule($1,$2) n',[batch3,actor])).rows[0].n,2); n++
await db.exec('reset role')
assert.equal((await db.query("select count(*)::int n from pg_class where relname like 'social_schedule%' and relrowsecurity")).rows[0].n,3); n++
assert.equal((await db.query("select count(*)::int n from public.editorial_audit_log where action='social.schedule.approved'")).rows[0].n,3); n++
await db.close()
console.log(`${n} comprobaciones SQL de cola social pasan: acceso privado, aprobación, idempotencia, horario/intervalo, lease, cancelación, caducidad y auditoría.`)
