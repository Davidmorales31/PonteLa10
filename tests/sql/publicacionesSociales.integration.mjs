// npm install --prefix .codex/qa-redes --no-save --package-lock=false @electric-sql/pglite@0.3.14
// node tests/sql/publicacionesSociales.integration.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const require = createRequire(resolve('.codex/qa-redes/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const articulo = '11111111-1111-4111-8111-111111111111'
const usuario = '22222222-2222-4222-8222-222222222222'
let comprobaciones = 0
function comprobar(valor, esperado) { assert.deepEqual(valor, esperado); comprobaciones++ }
await db.exec(`
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function public.has_editorial_permission(permiso text) returns boolean language sql as $$
  select permiso = any(string_to_array(current_setting('test.permissions',true),',')) $$;
create function public.has_role(rol text) returns boolean language sql as $$ select rol = current_setting('test.role',true) $$;
create function public.has_aal2() returns boolean language sql as $$ select current_setting('test.aal',true) = 'aal2' $$;
create table public.articles(id uuid primary key);
create table public.editorial_audit_log(actor_id uuid, action text, entity_type text, entity_id uuid, metadata jsonb);
insert into auth.users values('${usuario}');
insert into public.articles values('${articulo}');
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
`)
const fundacion = await readFile('supabase/migrations/0003_cms_editorial_foundation.sql', 'utf8')
const auditoria = fundacion.slice(fundacion.indexOf('create or replace function public.audit_editorial_change()'), fundacion.indexOf('drop trigger if exists validate_article_status_transition_trigger'))
await db.exec(auditoria)
await db.exec(await readFile('supabase/migrations/20261110113715_generador_publicaciones_sociales.sql', 'utf8'))
await db.exec(`set role authenticated; set test.uid = '${usuario}'; set test.role = 'propietario'; set test.permissions = 'contenido.verBorradores,contenido.editarTodos,contenido.publicar'; set test.aal = 'aal1';`)
comprobar((await db.query('select public.can_write_social_composition() as permitido')).rows[0].permitido, false)
await assert.rejects(db.query(`insert into public.social_compositions(article_id,document) values($1,$2)`, [articulo, { version: 1 }]), /row-level security/); comprobaciones++
await db.exec("set test.aal = 'aal2'")
const insercion = await db.query('insert into public.social_compositions(article_id,document,revision) values($1,$2,99) returning revision,updated_by', [articulo, { version: 1 }])
comprobar(insercion.rows[0].revision, 1); comprobar(insercion.rows[0].updated_by, usuario)
const actualizado = await db.query("update public.social_compositions set document=$1,revision=500 where article_id=$2 and revision=1 returning revision", [{ version: 1, prueba: 'guardada' }, articulo])
comprobar(actualizado.rows[0].revision, 2)
comprobar((await db.query("update public.social_compositions set status='ready' where article_id=$1 and revision=1 returning id", [articulo])).rows.length, 0)
await assert.rejects(db.query("update public.social_compositions set article_id=gen_random_uuid()"), /reasignar/); comprobaciones++
await db.exec('reset role')
comprobar((await db.query("select count(*)::int as total from public.editorial_audit_log")).rows[0].total, 2)
await db.exec("set role authenticated; set test.permissions='contenido.verBorradores'")
comprobar((await db.query('select count(*)::int as total from public.social_compositions')).rows[0].total, 1)
comprobar((await db.query("update public.social_compositions set status='ready' returning id")).rows.length, 0)
await assert.rejects(db.query('select public.reserve_social_copy(gen_random_uuid(),$1)', [articulo])); comprobaciones++
await db.exec("set test.permissions='contenido.verBorradores,contenido.editarTodos,contenido.publicar'")
const operacion = '33333333-3333-4333-8333-333333333333'
const reservar = async id => (await db.query('select public.reserve_social_copy($1,$2) as reserva', [id, articulo])).rows[0].reserva
comprobar((await reservar(operacion)).state, 'reserved')
comprobar((await reservar(operacion)).state, 'pending')
comprobar((await reservar('44444444-4444-4444-8444-444444444444')).state, 'blocked')
await db.query("update public.social_copy_requests set state='completed',result=$1 where id=$2", [{ propuestas: ['cache'] }, operacion])
comprobar((await reservar(operacion)).result, { propuestas: ['cache'] })
for (let indice = 0; indice < 9; indice++) await db.query("insert into public.social_copy_requests(id,article_id,state) values(gen_random_uuid(),$1,'completed')", [articulo])
comprobar((await reservar('55555555-5555-4555-8555-555555555555')).state, 'limited')
await db.exec("reset role; insert into public.articles values('66666666-6666-4666-8666-666666666666'); set role authenticated")
const reservarSegunda = async id => (await db.query('select public.reserve_social_copy($1,$2) as reserva', [id, '66666666-6666-4666-8666-666666666666'])).rows[0].reserva
comprobar((await reservarSegunda('77777777-7777-4777-8777-777777777777')).state, 'reserved')
await db.exec("update public.social_copy_requests set state='uncertain' where id='77777777-7777-4777-8777-777777777777'")
comprobar((await reservarSegunda('88888888-8888-4888-8888-888888888888')).state, 'blocked')
// Simula conciliación administrativa autorizada: conservar el registro y no llamar al proveedor.
await db.exec("update public.social_copy_requests set state='cancelled' where id='77777777-7777-4777-8777-777777777777'")
comprobar((await reservarSegunda('88888888-8888-4888-8888-888888888888')).state, 'reserved')
await db.exec('reset role; set role anon')
await assert.rejects(db.query('select * from public.social_compositions'), /permission denied/); comprobaciones++
await assert.rejects(db.query('select public.reserve_social_copy(gen_random_uuid(),$1)', [articulo]), /permission denied/); comprobaciones++
await db.close()
console.log(`${comprobaciones} comprobaciones SQL pasan: RLS, MFA, auditoría, versiones y reserva idempotente. Fixture aislado; no certifica migraciones completas ni concurrencia multiconexión.`)
