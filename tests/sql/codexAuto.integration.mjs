// npm install --prefix .codex/validacion-automatizacion --no-save --package-lock=false @electric-sql/pglite@0.5.15
// node tests/sql/codexAuto.integration.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
const require = createRequire(resolve('.codex/validacion-automatizacion/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const fixture = await readFile('tests/sql/codexAuto.fixture.sql','utf8')
const migration = await readFile('supabase/migrations/20261105033000_codex_aprobacion_ia_programacion.sql','utf8')
const sourceSpacing = await readFile('supabase/migrations/20260926085214_hu_ed_12_aprobar_programar_siguiente_slot.sql','utf8')
await db.exec(fixture)
// Ejecutar el trigger real de separación además de la migración nueva sin editar.
await db.exec(sourceSpacing.slice(sourceSpacing.indexOf('create or replace function public.enforce_editorial_publication_spacing'),sourceSpacing.indexOf('create or replace function public.approve_and_schedule_editorial_article')))
await db.exec(migration)
await db.exec("select set_config('test.role','service_role',false)")
const cat = randomUUID(), image = randomUUID(), run = randomUUID()
await db.query('insert into categories values($1,true)',[cat])
await db.query('insert into media_files values($1,1200,800)',[image])
await db.query('select get_codex_editorial_context($1)',[run])
let assertions = 0
async function expectCode(fn, code) {
  await assert.rejects(fn, error => error.code === code)
  assertions++
}
function candidate() {
  const key = randomUUID()
  const input = {idempotencyKey:key,runId:run,categoryId:cat,coverMediaId:image,tagIds:[],newTopics:[],storyFingerprint:createHash('sha256').update(key).digest('hex'),sources:[{url:'https://example.com/reporte'}],editorialFlags:['credited_photo_cover']}
  const brief = {editorialDifferentiator:'Explica la consecuencia concreta del cambio deportivo.'}
  const review = {model:'codex-test',categoryId:cat,coverMediaId:image,tagIds:[],newTopicNames:[],categoryMatches:true,topicsMatch:true,imagePresent:true,titleFaithful:true,notes:'Se revisaron la portada, la taxonomía y el título del artículo.'}
  return {input,brief,review}
}
async function generation(c, status='completed') {
  await db.query('insert into editorial_codex_draft_generations values($1,$2,$3,$4,$5,$6)',[c.input.idempotencyKey,run,cat,c.input.storyFingerprint,status,{proveedor:'deepseek',briefSeo:c.brief}])
}
async function submit(c) {
  const result=await db.query('select submit_and_schedule_codex_proposal($1,$2,$3) as receipt',[c.input,c.brief,c.review])
  return result.rows[0].receipt
}
try {
  const c=candidate()
  await expectCode(()=>submit(c),'22023') // sin DeepSeek no se aprueba
  await generation(c)
  const first=await submit(c)
  assert.equal(first.estado,'scheduled'); assert.equal(first.autoApproved,true); assertions+=2
  const stored=await db.query('select approved_by,approved_at from articles where id=$1',[first.articleId])
  assert.equal(stored.rows[0].approved_by,null); assert.ok(stored.rows[0].approved_at); assertions+=2
  const replay=await submit(c)
  assert.equal(replay.programadoPara,first.programadoPara); assert.equal(replay.duplicado,true); assertions+=2
  await expectCode(()=>submit({...c,review:{...c.review,notes:c.review.notes+' Cambio.'}}),'23505')
  const before=(await db.query('select count(*)::int as n from articles')).rows[0].n
  const bad=candidate(); await generation(bad)
  await expectCode(()=>submit({...bad,review:{...bad.review,topicsMatch:false}}),'22023')
  const mismatch=candidate(); await generation(mismatch)
  await expectCode(()=>submit({...mismatch,brief:{editorialDifferentiator:'Otro brief que no corresponde a la generación.'}}),'22023')
  const noImage=candidate(); noImage.input.coverMediaId=randomUUID(); noImage.review.coverMediaId=noImage.input.coverMediaId
  await generation(noImage); await expectCode(()=>submit(noImage),'22023')
  assert.equal((await db.query('select count(*)::int as n from articles')).rows[0].n,before); assertions++
  const duplicate=candidate(); duplicate.input.storyFingerprint=c.input.storyFingerprint; await generation(duplicate)
  const duplicated=await submit(duplicate)
  assert.equal(duplicated.autoApproved,false); assert.equal(duplicated.articleId,first.articleId); assertions+=2
  // Llamadas superpuestas: PGlite serializa su conexión; el trigger real valida las reservas.
  const items=Array.from({length:4},candidate)
  for(const item of items) await generation(item)
  const results=await Promise.all(items.map(submit))
  const dates=[first,...results].map(r=>Date.parse(r.programadoPara)).sort((a,b)=>a-b)
  for(let i=1;i<dates.length;i++) { assert.equal(dates[i]-dates[i-1],120000); assertions++ }
  const far=new Date(dates.at(-1)+3600000).toISOString()
  await db.query("insert into articles(status,scheduled_at) values('scheduled',$1)",[far])
  const next=candidate(); await generation(next)
  assert.equal(Date.parse((await submit(next)).programadoPara),dates.at(-1)+120000); assertions++
  const agenda=[{categoryId:cat,opportunities:Array.from({length:20},()=>({}))}]
  const blocked=candidate(); await generation(blocked)
  await db.exec('begin')
  const partial=await db.query('select save_codex_editorial_agenda($1,$2,$3) as r',[run,agenda,'completed'])
  assert.equal(partial.rows[0].r.status,'partial'); assertions++
  await expectCode(()=>submit(blocked),'22023')
  // El cierre parcial real es terminal; deshacer esta prueba aislada antes de continuar.
  await db.exec('rollback')
  await expectCode(()=>db.query('select save_codex_editorial_agenda($1,$2,$3)',[run,[{opportunities:Array(21).fill({})}],'in_progress']),'22023')
  for(let i=0;i<4;i++) { const item=candidate(); await generation(item); await submit(item) }
  assert.equal((await db.query('select save_codex_editorial_agenda($1,$2,$3) as r',[run,agenda,'completed'])).rows[0].r.status,'completed'); assertions++
  await db.query('select get_codex_editorial_context($1)',[randomUUID()])
  await expectCode(()=>db.query('select get_codex_editorial_context($1)',[randomUUID()]),'54000')
  await db.exec('set role anon')
  await expectCode(()=>submit(candidate()),'42501')
  await db.exec('reset role')
  console.log(`SQL integrado: ${assertions} comprobaciones pasan; migración y trigger ejecutados en PostgreSQL WASM.`)
} finally { await db.close() }
