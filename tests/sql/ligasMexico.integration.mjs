// node tests/sql/ligasMexico.integration.mjs  (requiere PGlite, ver tituloPortada.integration.mjs)
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(resolve('.codex/validacion-automatizacion/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create table public.sites(id text primary key); insert into public.sites values ('co'),('mx');`)
const sql = await readFile('supabase/migrations/20261119160000_liga_mx_datos.sql', 'utf8')
await db.exec(sql); await db.exec(sql) // idempotente

const partido = (id, publico) => `insert into public.league_fixtures
  (site, competition_slug, season, provider, provider_fixture_id, tournament, round_name, scheduled_at, home_team, away_team, status, is_public, publication_rights_confirmed)
  values ('mx','liga-mx','2026-2027','goal-api','${id}','Apertura','Jornada 17','2026-11-23T01:10:00Z','Querétaro','Necaxa','scheduled',${publico},${publico})`
await db.exec(partido('publico1', true)); await db.exec(partido('privado1', false))
await db.exec(`insert into public.league_standings (site, competition_slug, season, phase, team_key, team_name, position, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, is_public, publication_rights_confirmed)
  values ('mx','liga-mx','2026-2027','Apertura','cruz-azul','Cruz Azul',1,16,10,2,4,37,26,11,32,true,true)`)

// Restricciones
await assert.rejects(db.exec(partido('publico1', true)), /duplicate key/)
await assert.rejects(db.exec(`insert into public.league_fixtures (site, competition_slug, season, provider, provider_fixture_id, tournament, round_name, scheduled_at, home_team, away_team, status) values ('zz','liga-mx','2026-2027','goal-api','x','Apertura','J1',now(),'AA','BB','scheduled')`), /foreign key/)
await assert.rejects(db.exec(`insert into public.league_fixtures (site, competition_slug, season, provider, provider_fixture_id, tournament, round_name, scheduled_at, home_team, away_team, status) values ('mx','liga-mx','2026','goal-api','x','Apertura','J1',now(),'AA','BB','scheduled')`), /check/)
await assert.rejects(db.exec(`insert into public.league_fixtures (site, competition_slug, season, provider, provider_fixture_id, tournament, round_name, scheduled_at, home_team, away_team, status) values ('mx','liga-mx','2026-2027','goal-api','y','Apertura','J1',now(),'Igual','Igual','scheduled')`), /distinct_teams/)

// El público solo ve lo publicado y no puede escribir
await db.exec('set role anon')
assert.equal((await db.query('select count(*)::int n from public.league_fixtures')).rows[0].n, 1)
assert.equal((await db.query('select count(*)::int n from public.league_standings')).rows[0].n, 1)
await assert.rejects(db.exec(`delete from public.league_fixtures`), /permission denied/)
await assert.rejects(db.exec(partido('anon1', true)), /permission denied/)
await db.exec('reset role')
await db.exec('set role service_role')
await db.exec(partido('servicio1', false))
await db.exec('reset role')
console.log('migración liga MX OK')
