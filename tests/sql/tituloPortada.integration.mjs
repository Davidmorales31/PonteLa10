// npm install --prefix .codex/validacion-automatizacion --no-save --package-lock=false @electric-sql/pglite@0.5.15
// node tests/sql/tituloPortada.integration.mjs
// Ejecuta la migración del titular de portada en PostgreSQL WASM contra las
// definiciones reales vigentes de las funciones públicas y de aprobación IA.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'

const require = createRequire(resolve('.codex/validacion-automatizacion/package.json'))
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()

const leer = ruta => readFile(ruta, 'utf8')
const fixture = await leer('tests/sql/codexAuto.fixture.sql')
const aprobacionIa = await leer('supabase/migrations/20261105033000_codex_aprobacion_ia_programacion.sql')
const separacion = await leer('supabase/migrations/20260926085214_hu_ed_12_aprobar_programar_siguiente_slot.sql')
const hued23 = await leer('supabase/migrations/20261007111822_hu_ed23_actualizaciones_editoriales.sql')
const destacada = await leer('supabase/migrations/20260922122414_noticia_destacada_y_reescritura_ia.sql')
const migracion = await leer('supabase/migrations/20261115150000_titular_portada_articulos.sql')

function definicion(texto, nombre) {
  const inicio = texto.lastIndexOf(`create or replace function public.${nombre}(`)
  assert.ok(inicio >= 0, `No se encontró ${nombre}`)
  // Algunas definiciones usan $function$ en lugar de $$ como delimitador.
  const delimitador = /as (\$[a-z_]*\$)/.exec(texto.slice(inicio))
  assert.ok(delimitador, `Sin cuerpo para ${nombre}`)
  const cuerpo = inicio + delimitador.index + delimitador[0].length
  const fin = texto.indexOf(`${delimitador[1]};`, cuerpo)
  return texto.slice(inicio, fin + delimitador[1].length + 1)
}

let comprobaciones = 0
async function esperarError(fn, prueba) {
  await assert.rejects(fn, prueba)
  comprobaciones++
}

try {
  await db.exec(fixture)
  await db.exec(separacion.slice(
    separacion.indexOf('create or replace function public.enforce_editorial_publication_spacing'),
    separacion.indexOf('create or replace function public.approve_and_schedule_editorial_article')
  ))
  await db.exec(aprobacionIa)

  // Columnas y tablas mínimas que leen las funciones públicas reales.
  await db.exec(`
    alter table public.articles
      add column title text,
      add column lock_version integer not null default 1,
      add column published_at timestamptz,
      add column modified_at timestamptz;
    alter table public.categories add column slug text, add column name text;
    alter table public.media_files
      add column bucket text, add column path text, add column alt text,
      add column caption text, add column credit text, add column source_url text;
    create table public.article_versions(id uuid primary key default gen_random_uuid(), article_id uuid, status text, snapshot jsonb);
    create table public.user_profiles(id uuid primary key, display_name text);
    create function public.editorial_reading_minutes(jsonb) returns integer language sql as $$ select 1 $$;
    create schema editorial_private;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    -- Doble de permiso: edita quien tenga sesión simulada.
    create function public.can_edit_article(uuid) returns boolean language sql as $$ select auth.uid() is not null $$;
    -- Doble del guardado vigente: misma firma, control de bloqueo y mensaje de conflicto.
    create function public.save_editorial_article_with_correction(
      target_article_id uuid, expected_lock_version integer, next_slug text, next_title text,
      next_summary text, next_body text, next_body_json jsonb, next_category_id uuid,
      next_cover_media_id uuid, next_content_type text, next_source_url text, next_source_name text,
      next_source_author text, next_credits text, next_seo_title text, next_seo_description text,
      next_social_brief text, next_tag_ids uuid[], next_label_ids uuid[], next_change_note text,
      next_correction_note text
    ) returns jsonb language plpgsql as $$
    declare v_lock integer;
    begin
      update public.articles set title = next_title, lock_version = lock_version + 1
        where id = target_article_id and lock_version = expected_lock_version
        returning lock_version into v_lock;
      if v_lock is null then raise exception 'El contenido cambió en otra sesión. Recarga antes de guardar.'; end if;
      return jsonb_build_object('id', target_article_id, 'lockVersion', v_lock);
    end $$;
  `)

  // Definiciones públicas reales vigentes (el cuerpo se valida al ejecutarlas).
  await db.exec('set check_function_bodies = off')
  for (const nombre of [
    'get_public_editorial_article',
    'list_public_editorial_articles',
    'list_public_editorial_articles_filtered',
    'list_public_editorial_articles_for_entity',
    'get_public_editorial_latest_article_with_cover'
  ]) {
    await db.exec(definicion(hued23, nombre))
  }
  await db.exec(definicion(destacada, 'get_public_editorial_home_feature'))

  // El fixture no reproduce todos los objetos que usan los listados filtrados y
  // por entidad; sus cuerpos se validan en Supabase. Aquí se comprueba el texto
  // reemplazado y se ejecutan de verdad la ficha y el listado general.
  await db.exec(migracion)
  // Reaplicar no debe duplicar el campo ni fallar.
  await db.exec(migracion)
  await db.exec('reset check_function_bodies')

  for (const firma of [
    'public.get_public_editorial_article(text)',
    'public.list_public_editorial_articles(integer,integer)',
    'public.list_public_editorial_articles_filtered(integer,integer,text,text[],text,text)',
    'public.list_public_editorial_articles_for_entity(text,text,integer,integer)',
    'public.get_public_editorial_latest_article_with_cover()',
    'public.get_public_editorial_home_feature()'
  ]) {
    const def = (await db.query('select pg_get_functiondef($1::regprocedure) as d', [firma])).rows[0].d
    const veces = def.split("'tituloPortada'").length - 1
    assert.ok(veces >= 1, `${firma} no expone tituloPortada`)
    assert.equal(veces, 1, `${firma} duplicó tituloPortada`)
    comprobaciones += 2
  }

  // Lectura pública con y sin titular de portada.
  const categoria = randomUUID()
  await db.query("insert into public.categories(id,is_active,slug,name) values($1,true,'futbol','Fútbol')", [categoria])
  async function publicar(slug, titular) {
    const articulo = (await db.query(
      "insert into public.articles(status,title,published_at,cover_headline) values('published',$1,now(),$2) returning id",
      [`Título ${slug}`, titular]
    )).rows[0].id
    const version = (await db.query(
      "insert into public.article_versions(article_id,status,snapshot) values($1,'published',$2) returning id",
      [articulo, { slug, title: `Título ${slug}`, summary: 'Resumen', content_type: 'noticia', body_json: { type: 'doc', content: [] }, category_id: categoria, cover_headline: titular }]
    )).rows[0].id
    await db.query('update public.articles set published_version_id=$1 where id=$2', [version, articulo])
    return articulo
  }
  await publicar('con-titular', 'Nacional llega líder y arranca en Manizales')
  await publicar('sin-titular', null)
  const con = (await db.query("select public.get_public_editorial_article('con-titular') as r")).rows[0].r
  const sin = (await db.query("select public.get_public_editorial_article('sin-titular') as r")).rows[0].r
  assert.equal(con.tituloPortada, 'Nacional llega líder y arranca en Manizales')
  assert.equal(con.titulo, 'Título con-titular')
  assert.equal(sin.tituloPortada, '')
  comprobaciones += 3
  const lista = (await db.query('select public.list_public_editorial_articles(10,0) as r')).rows[0].r
  assert.deepEqual(lista.map(item => item.tituloPortada).sort(), ['', 'Nacional llega líder y arranca en Manizales'])
  comprobaciones++

  // Guardado del editor: normaliza, valida, respeta el bloqueo y es atómico.
  await db.exec(`select set_config('test.uid', '${randomUUID()}', false)`)
  const borrador = (await db.query("insert into public.articles(status,title) values('draft','Borrador inicial') returning id")).rows[0].id
  const guardar = (bloqueo, titular) => db.query(
    `select public.save_editorial_article_with_cover_headline(
      $1,$2,'slug','Título nuevo','Resumen','Cuerpo','{}'::jsonb,null,null,'noticia',
      '','','','','','','',array[]::uuid[],array[]::uuid[],'',null,$3) as r`,
    [borrador, bloqueo, titular]
  )
  const guardado = (await guardar(1, '  Nacional llega líder  ')).rows[0].r
  let fila = (await db.query('select cover_headline,lock_version,title from public.articles where id=$1', [borrador])).rows[0]
  assert.equal(fila.cover_headline, 'Nacional llega líder')
  assert.equal(fila.lock_version, 2)
  assert.equal(guardado.lockVersion, 2)
  comprobaciones += 3
  await esperarError(() => guardar(1, 'Otro titular que no debe quedar'), error => /cambió en otra sesión/.test(error.message))
  fila = (await db.query('select cover_headline,lock_version from public.articles where id=$1', [borrador])).rows[0]
  assert.equal(fila.cover_headline, 'Nacional llega líder')
  assert.equal(fila.lock_version, 2)
  comprobaciones += 2
  await esperarError(() => guardar(2, 'Corto'), error => error.code === '22023')
  // NULL conserva el titular (cliente que no envía el campo).
  await guardar(2, null)
  fila = (await db.query('select cover_headline,lock_version from public.articles where id=$1', [borrador])).rows[0]
  assert.equal(fila.cover_headline, 'Nacional llega líder')
  assert.equal(fila.lock_version, 3)
  comprobaciones += 2
  // Cadena vacía lo quita.
  await guardar(3, '   ')
  fila = (await db.query('select cover_headline,lock_version from public.articles where id=$1', [borrador])).rows[0]
  assert.equal(fila.cover_headline, null)
  assert.equal(fila.lock_version, 4)
  comprobaciones += 2
  // Sin sesión no se escribe el titular.
  await db.exec(`select set_config('test.uid', '', false)`)
  await esperarError(() => guardar(4, 'Titular sin permiso de edición'), error => /No tienes permiso/.test(error.message))
  await db.exec(`select set_config('test.uid', '${randomUUID()}', false)`)
  // Un estado no editable no recibe el titular aunque la versión coincida.
  await db.query("update public.articles set status='review' where id=$1", [borrador])
  await db.query("select editorial_private.set_article_cover_headline($1,4,'Titular en revisión no editable')", [borrador])
  assert.equal((await db.query('select cover_headline from public.articles where id=$1', [borrador])).rows[0].cover_headline, null)
  comprobaciones++

  // Regla de formato en la tabla.
  await esperarError(() => db.query("update public.articles set cover_headline='Corto' where id=$1", [borrador]), error => error.code === '23514')
  await esperarError(() => db.query("update public.articles set cover_headline=' Con espacio inicial' where id=$1", [borrador]), error => error.code === '23514')

  // Permisos: solo authenticated ejecuta el guardado nuevo.
  const firmaGuardado = 'public.save_editorial_article_with_cover_headline(uuid,integer,text,text,text,text,jsonb,uuid,uuid,text,text,text,text,text,text,text,text,uuid[],uuid[],text,text,text)'
  const permisos = (await db.query(
    `select has_function_privilege('authenticated',$1,'execute') as aut,
            has_function_privilege('anon',$1,'execute') as anonimo,
            has_column_privilege('authenticated','public.articles','cover_headline','update') as columna,
            has_function_privilege('anon','editorial_private.set_article_cover_headline(uuid,integer,text)','execute') as estrechaAnon`,
    [firmaGuardado]
  )).rows[0]
  assert.equal(permisos.aut, true)
  assert.equal(permisos.anonimo, false)
  assert.equal(permisos.columna, false)
  assert.equal(permisos.estrechaanon, false)
  comprobaciones += 4

  // Aprobación automática real: fija el titular antes de aprobar y programar.
  await db.exec("select set_config('test.role','service_role',false)")
  const imagen = randomUUID(), corrida = randomUUID(), cat = randomUUID()
  await db.query('insert into public.categories(id,is_active) values($1,true)', [cat])
  await db.query('insert into public.media_files(id,width,height) values($1,1200,800)', [imagen])
  await db.query('select public.get_codex_editorial_context($1)', [corrida])
  async function aprobar(titular) {
    const clave = randomUUID()
    const input = {
      idempotencyKey: clave, runId: corrida, categoryId: cat, coverMediaId: imagen, tagIds: [], newTopics: [],
      storyFingerprint: createHash('sha256').update(clave).digest('hex'),
      sources: [{ url: 'https://example.com/reporte' }], editorialFlags: ['credited_photo_cover'],
      ...(titular === undefined ? {} : { coverHeadline: titular })
    }
    const brief = { editorialDifferentiator: 'Explica la consecuencia concreta del cambio deportivo.' }
    const review = { model: 'prueba', categoryId: cat, coverMediaId: imagen, tagIds: [], newTopicNames: [], categoryMatches: true, topicsMatch: true, imagePresent: true, titleFaithful: true, notes: 'Se revisaron la portada, la taxonomía y el título del artículo.' }
    await db.query('insert into public.editorial_codex_draft_generations values($1,$2,$3,$4,$5,$6)',
      [clave, corrida, cat, input.storyFingerprint, 'completed', { proveedor: 'deepseek', briefSeo: brief }])
    const recibo = (await db.query('select public.submit_and_schedule_codex_proposal($1,$2,$3) as r', [input, brief, review])).rows[0].r
    return (await db.query('select cover_headline,status from public.articles where id=$1', [recibo.articleId])).rows[0]
  }
  const conTitular = await aprobar('¡Nacional llega líder y arranca en Manizales!')
  assert.equal(conTitular.cover_headline, '¡Nacional llega líder y arranca en Manizales!')
  assert.equal(conTitular.status, 'scheduled')
  const sinTitular = await aprobar(undefined)
  assert.equal(sinTitular.cover_headline, null)
  assert.equal(sinTitular.status, 'scheduled')
  comprobaciones += 4
  const defAprobacion = (await db.query("select pg_get_functiondef('public.submit_and_schedule_codex_proposal(jsonb,jsonb,jsonb)'::regprocedure) as d")).rows[0].d
  assert.equal(defAprobacion.split('cover_headline=').length - 1, 1, 'La aprobación duplicó el ajuste del titular')
  comprobaciones++

  console.log(`SQL integrado (titular de portada): ${comprobaciones} comprobaciones pasan en PostgreSQL WASM.`)
} finally {
  await db.close()
}
