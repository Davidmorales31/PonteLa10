// node tests/sql/sitios.integration.mjs  (requiere PGlite, ver tituloPortada.integration.mjs)
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(resolve('.codex/validacion-automatizacion/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
await db.exec(`create role anon; create role authenticated;
create table public.articles(id int primary key, title text); insert into public.articles values (1,'a');
create table public.editorial_tags(id int primary key); insert into public.editorial_tags values (1);
create table public.special_modules(id int primary key);`)
const sql = await readFile('supabase/migrations/20261119120000_sitios_co_mx.sql', 'utf8')
await db.exec(sql); await db.exec(sql) // idempotente
const r = await db.query(`select site from public.articles`); assert.equal(r.rows[0].site, 'co')
const s = await db.query(`select id, is_active from public.sites order by id`); console.log(s.rows)
await assert.rejects(db.exec(`insert into public.articles(id,title,site) values (2,'x','zz')`))
await db.exec(`set role anon`)
const v = await db.query(`select id from public.sites`); assert.deepEqual(v.rows.map(x=>x.id), ['co'])
await assert.rejects(db.exec(`insert into public.sites values ('ar','a','a','a','a','a')`))
console.log('migración OK')
