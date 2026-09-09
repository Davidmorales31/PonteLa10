-- Borrador editorial: orden cronologico de las peliculas del MCU.
-- Ejecutar desde el SQL Editor de Supabase y revisar en el nuevo flujo.

do $$
declare
  articulo_id uuid;
  autor_id constant uuid := '127758f0-f1ec-4bd4-a4d1-683ca6c4d6e2';
  categoria_id uuid;
  documento jsonb := $documento$
  {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "Ver todas las películas del Universo Cinematográfico de Marvel en orden cronológico ya no consiste solo en empezar con Iron Man. La historia salta de la Segunda Guerra Mundial al espacio, atraviesa el Blip y termina abriendo varias ramas del multiverso. Esta guía organiza las 38 películas estrenadas hasta Spider-Man: Brand New Day y explica dónde encaja cada una sin mezclar series ni antiguas sagas ajenas al MCU."
        }]
      },
      {
        "type": "blockquote",
        "content": [{
          "type": "paragraph",
          "content": [{
            "type": "text",
            "text": "Actualizada al 5 de agosto de 2026. La base es la línea temporal oficial de Disney+ publicada por Marvel; las películas de Spider-Man coproducidas con Sony se incorporan por continuidad narrativa y los relatos de universos alternos se señalan por separado."
          }]
        }]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Antes de empezar: cronología no es lo mismo que estreno" }]
      },
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "El orden de estreno conserva las revelaciones tal como llegaron al cine desde 2008. El orden cronológico intenta seguir el momento principal en el que sucede cada historia dentro del universo. Por eso Captain America: The First Avenger abre el recorrido aunque se estrenó después de Iron Man, y Black Widow aparece inmediatamente después de Civil War pese a haber llegado a salas en 2021. Para una primera vez, el orden de estreno sigue siendo el más natural; para una segunda maratón, esta cronología permite ver causas y consecuencias con otra perspectiva."
        }]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Orden cronológico completo: las 38 películas del MCU" }]
      },
      {
        "type": "orderedList",
        "content": [
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Captain America: The First Avenger (estreno: 2011). Su historia principal ocurre entre 1943 y 1945 y presenta el Teseracto, Hydra y el origen de Steve Rogers; su cierre salta al presente." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Captain Marvel (2019). Ambientada principalmente en 1995, introduce a Carol Danvers, a los Skrull, a los Kree y el primer encuentro de Nick Fury con una heroína de escala cósmica." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Iron Man (2008). Tony Stark construye su primera armadura y abre la etapa moderna del MCU. La escena posterior a los créditos pone sobre la mesa la Iniciativa Vengadores." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Iron Man 2 (2010). Continúa la exposición pública de Tony, desarrolla el legado de Howard Stark y presenta formalmente a Natasha Romanoff y a War Machine." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "The Incredible Hulk (2008). El conflicto de Bruce Banner con Emil Blonsky sucede en el mismo gran periodo de Iron Man 2 y Thor; su reparto vuelve a ser relevante muchos años después." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Thor (2011). El destierro del dios del trueno conecta Asgard con la Tierra y convierte a Loki en la pieza que conduce directamente a la primera reunión de los Vengadores." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "The Avengers (2012). La batalla de Nueva York une por primera vez a Iron Man, Captain America, Thor, Hulk, Black Widow y Hawkeye frente a Loki y los Chitauri." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Thor: The Dark World (2013). Ocurre después de Nueva York, presenta el Éter como una Piedra del Infinito y profundiza la relación entre Thor y Loki." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Iron Man 3 (2013). Tony afronta las secuelas emocionales de The Avengers y cierra una parte de su dependencia de las armaduras sin abandonar su papel en el equipo." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Captain America: The Winter Soldier (2014). La caída de SHIELD cambia el tablero político del MCU y devuelve a Bucky Barnes como pieza central de la historia de Steve Rogers." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Guardians of the Galaxy (2014). Peter Quill forma a los Guardianes, aparece la Piedra del Poder y la amenaza de Thanos deja de ser solo una insinuación." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Guardians of the Galaxy Vol. 2 (2017). Aunque se estrenó tres años después, transcurre pocos meses después de la primera aventura y revela el origen celestial de Peter Quill." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Avengers: Age of Ultron (2015). La creación de Ultron rompe al equipo, presenta a Wanda Maximoff y Vision, y deja lista la nueva formación de los Vengadores." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Ant-Man (2015). Scott Lang hereda la tecnología de Hank Pym. El Reino Cuántico aparece por primera vez y luego será esencial para resolver la Saga del Infinito." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Captain America: Civil War (2016). Los Acuerdos de Sokovia dividen a los Vengadores, presentan a Black Panther y Spider-Man, y dejan al equipo fracturado antes de la llegada de Thanos." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Black Widow (2021). Su historia principal ocurre justo después de Civil War. Natasha enfrenta la Sala Roja y se reencuentra con Yelena Belova; la escena poscréditos sucede después de Endgame." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Black Panther (2018). T'Challa asume el trono de Wakanda poco después de Civil War y decide cambiar la relación de su país con el resto del mundo." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Spider-Man: Homecoming (2017). Peter Parker vuelve a Queens tras Civil War, intenta demostrar que puede ser un Vengador y se enfrenta al tráfico de tecnología Chitauri." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Doctor Strange (2016). La transformación de Stephen Strange se extiende durante varios meses y abre el lado místico del MCU, incluida la Piedra del Tiempo." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Thor: Ragnarok (2017). La destrucción de Asgard conduce directamente a Infinity War. Hulk regresa tras desaparecer al final de Age of Ultron." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Ant-Man and the Wasp (2018). Scott cumple arresto domiciliario por Civil War mientras la familia Pym intenta rescatar a Janet. Su escena poscréditos coincide con el chasquido de Thanos." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Avengers: Infinity War (2018). Thanos reúne las Piedras del Infinito y derrota a los héroes. Termina con la desaparición de la mitad de la vida del universo." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Avengers: Endgame (2019). Comienza semanas después del chasquido, salta cinco años y cierra el arco central de Tony Stark, Steve Rogers y Natasha Romanoff." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Shang-Chi and the Legend of the Ten Rings (2021). Ya en el mundo posterior al Blip, Shang-Chi enfrenta el legado de Wenwu y conecta los Diez Anillos con la nueva etapa del MCU." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Spider-Man: Far From Home (2019). Peter intenta retomar su vida después de Endgame, mientras el mundo procesa la ausencia de Iron Man. Su final enlaza de inmediato con No Way Home." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Eternals (2021). La mayor parte sucede en el presente posterior a Endgame, aunque intercala miles de años de historia para explicar la presencia de los Eternos y los Celestiales en la Tierra." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Spider-Man: No Way Home (2021). Arranca exactamente donde termina Far From Home. El hechizo de Doctor Strange rompe las fronteras del multiverso y deja a Peter Parker borrado de la memoria colectiva." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Doctor Strange in the Multiverse of Madness (2022). Retoma las consecuencias del multiverso y el arco de Wanda Maximoff. Conviene haber visto WandaVision, aunque esta guía se limita a películas." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Black Panther: Wakanda Forever (2022). Wakanda afronta la muerte de T'Challa, la presión internacional por el vibranium y la aparición de Namor y Talokan." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Thor: Love and Thunder (2022). Thor busca un nuevo propósito, Jane Foster empuña Mjolnir y los dioses quedan bajo la amenaza de Gorr." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Ant-Man and the Wasp: Quantumania (2023). La familia Lang-Pym queda atrapada en el Reino Cuántico y se enfrenta a Kang, ampliando el conflicto multiversal." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Guardians of the Galaxy Vol. 3 (2023). Después del especial navideño, Rocket enfrenta a su creador y la alineación original de los Guardianes llega al final de su recorrido conjunto." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "The Marvels (2023). Carol Danvers, Monica Rambeau y Kamala Khan intercambian lugares cada vez que usan sus poderes y sus historias cósmicas quedan conectadas." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Deadpool & Wolverine (2024). Es una aventura multiversal vinculada a la TVA y al universo heredado de las películas de X-Men. Disney+ la ubica después de The Marvels, pero no funciona como un capítulo lineal de la Tierra principal." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Captain America: Brave New World (2025). Sam Wilson ya ejerce como Captain America y queda atrapado en una crisis internacional ligada al presidente Thaddeus Ross y a cabos abiertos de The Incredible Hulk." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Thunderbolts* / The New Avengers (2025). Yelena, Bucky, Red Guardian, Ghost, John Walker y otros personajes forman una alianza incómoda después de caer en una trampa de Valentina Allegra de Fontaine." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "The Fantastic Four: First Steps (2025). Sucede en Earth-828, una dimensión alternativa de estética retrofuturista inspirada en los años sesenta. Se incluye aquí al final de la cronología oficial, pero no comparte una fecha lineal con la Tierra principal." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Spider-Man: Brand New Day (2026). La película más reciente de esta guía se estrenó el 31 de julio de 2026. Marvel confirma que han pasado cuatro años desde No Way Home: Peter vive solo, combate el crimen a tiempo completo y Nueva York ya no recuerda su identidad. Su ubicación exacta todavía no ha sido añadida a la cronología oficial de Disney+." }] }] }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Las seis etapas para organizar la maratón" }]
      },
      {
        "type": "bulletList",
        "content": [
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Los orígenes: de Captain America: The First Avenger a The Avengers. Presenta héroes, SHIELD, Asgard y el primer gran equipo." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Las consecuencias de Nueva York: de Thor: The Dark World a Ant-Man. El universo se expande hacia la política, el espacio y el Reino Cuántico." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "La fractura y Thanos: de Civil War a Endgame. Es el tramo más conectado y conviene verlo sin grandes pausas." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "El mundo después del Blip: de Shang-Chi a Wakanda Forever. Los héroes intentan reconstruir una Tierra sin su equipo original." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "La apertura del multiverso: de No Way Home a Deadpool & Wolverine. Las fronteras entre realidades dejan de ser teóricas." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "La nueva alineación: Brave New World, Thunderbolts*, First Steps y Brand New Day preparan el terreno para Avengers: Doomsday." }] }] }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Tres excepciones que evitan confusiones" }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Las escenas poscréditos no siempre respetan el momento principal" }]
      },
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "Black Widow es el ejemplo más claro: la película pertenece al periodo posterior a Civil War, pero su escena final ocurre años después. Captain Marvel también termina en 1995 y luego usa sus créditos para enlazar con Endgame. La posición de esta guía responde al cuerpo principal de cada historia."
        }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "El multiverso no cabe en una sola línea" }]
      },
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "Deadpool & Wolverine opera entre realidades y The Fantastic Four: First Steps sucede expresamente en Earth-828. Colocarlas cerca del final sirve para ordenar la experiencia de visionado y respetar la lista de Disney+, no para afirmar que todos sus acontecimientos pasan en la misma Tierra o en el mismo calendario."
        }]
      },
      {
        "type": "heading",
        "attrs": { "level": 3 },
        "content": [{ "type": "text", "text": "Spider-Man: Brand New Day es el punto más reciente, no una coordenada oficial definitiva" }]
      },
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "La sinopsis oficial fija un dato importante: transcurren cuatro años desde No Way Home. Eso la sitúa claramente después de la trilogía anterior de Peter Parker. Sin embargo, la guía cronológica de Marvel publicada en marzo de 2026 es anterior a su estreno y todavía no la incorpora. Por eso aparece al final con esta advertencia en lugar de inventarle una posición exacta frente a otras historias de 2025 y 2026."
        }]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "¿Hace falta ver las series?" }]
      },
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "No para completar esta lista de películas, pero algunas series mejoran mucho la continuidad. WandaVision prepara Doctor Strange in the Multiverse of Madness; The Falcon and the Winter Soldier explica el camino de Sam Wilson antes de Brave New World; Ms. Marvel presenta a Kamala antes de The Marvels; Loki desarrolla la TVA y el multiverso que después usa Deadpool & Wolverine; y el especial navideño de los Guardianes ocurre antes de Vol. 3."
        }]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "La ruta corta si no tienes tiempo para 38 películas" }]
      },
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "Una maratón esencial puede reducirse a 15 títulos sin perder la columna vertebral: Captain America: The First Avenger, Iron Man, The Avengers, Captain America: The Winter Soldier, Guardians of the Galaxy, Avengers: Age of Ultron, Captain America: Civil War, Thor: Ragnarok, Avengers: Infinity War, Avengers: Endgame, Spider-Man: Far From Home, Spider-Man: No Way Home, Doctor Strange in the Multiverse of Madness, Thunderbolts* y Spider-Man: Brand New Day. Añade Black Panther, Shang-Chi y The Fantastic Four: First Steps si quieres cubrir mejor a la nueva generación."
        }]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "¿Qué viene después de Brand New Day?" }]
      },
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "El calendario oficial de Marvel muestra Avengers: Doomsday para el 18 de diciembre de 2026 y Avengers: Secret Wars para el 17 de diciembre de 2027. Esos estrenos pueden cambiar la posición de varias historias multiversales, así que esta guía debe revisarse cuando Marvel y Disney+ actualicen su cronología."
        }]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Fuentes y criterio editorial" }]
      },
      {
        "type": "bulletList",
        "content": [
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Marvel.com, See the Complete MCU Timeline on Disney+, publicada el 26 de marzo de 2026." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Marvel.com y Sony Pictures, fichas oficiales y sinopsis de Spider-Man: Brand New Day, estrenada el 31 de julio de 2026." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Marvel.com, ficha y materiales de The Fantastic Four: First Steps, que confirman Earth-828 como universo alternativo." }] }] },
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Marvel.com, catálogo oficial de películas del MCU para comprobar estrenos y próximos títulos." }] }] }
        ]
      },
      {
        "type": "paragraph",
        "content": [{
          "type": "text",
          "text": "Esta guía se actualizará cuando exista una nueva línea temporal oficial. Guárdala antes de empezar la maratón y vuelve después de cada estreno: en el MCU, el orden también cambia la forma de entender la historia."
        }]
      }
    ]
  }
  $documento$::jsonb;
begin
  if not exists (select 1 from auth.users where id = autor_id) then
    raise exception 'No existe el usuario administrador %.', autor_id;
  end if;

  select id
    into categoria_id
  from public.categories
  where slug = 'tendencias'
    and is_active = true
  limit 1;

  if categoria_id is null then
    raise exception 'No existe la categoria activa tendencias.';
  end if;

  insert into public.articles (
    id, slug, title, summary, body, body_json, status, category_id,
    author_id, content_type, source_origin, source_url, source_name,
    source_author, credits, seo_title, seo_description, social_brief,
    last_saved_by
  ) values (
    '1b7bcd0d-ca63-4900-b187-61b7f9524374',
    'orden-cronologico-peliculas-marvel-mcu-brand-new-day',
    'Orden cronológico de todas las películas de Marvel hasta Spider-Man: Brand New Day',
    'Guía actualizada con las 38 películas del MCU en orden cronológico, desde Captain America: The First Avenger hasta Spider-Man: Brand New Day, con las excepciones del multiverso y una ruta corta para maratón.',
    'Guía completa del orden cronológico de las 38 películas del MCU hasta Spider-Man: Brand New Day.',
    documento,
    'draft', categoria_id, autor_id, 'especial', 'asistenteIa',
    'https://www.marvel.com/articles/movies/mcu-timeline-order-disney-plus',
    'Marvel.com y Sony Pictures', 'Marvel',
    'Fuentes primarias consultadas el 5 de agosto de 2026: cronología oficial de Disney+, catálogo de películas de Marvel, ficha oficial de Brand New Day en Marvel.com y Sony Pictures, y ficha de The Fantastic Four: First Steps.',
    'Orden cronológico de las 38 películas del MCU',
    'Todas las películas del MCU en orden cronológico hasta Spider-Man: Brand New Day, con fases, multiverso y ruta rápida de maratón.',
    '¿En qué orden se ven las películas de Marvel? Esta guía organiza las 38 entregas del MCU, explica el multiverso y llega hasta Spider-Man: Brand New Day.',
    autor_id
  )
  on conflict (slug) do update
  set
    title = excluded.title,
    summary = excluded.summary,
    body = excluded.body,
    body_json = excluded.body_json,
    status = 'draft',
    category_id = excluded.category_id,
    author_id = excluded.author_id,
    content_type = excluded.content_type,
    source_origin = excluded.source_origin,
    source_url = excluded.source_url,
    source_name = excluded.source_name,
    source_author = excluded.source_author,
    credits = excluded.credits,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    social_brief = excluded.social_brief,
    last_saved_by = excluded.last_saved_by,
    updated_at = now()
  returning id into articulo_id;

  insert into public.editorial_tags (slug, name, description)
  values
    ('marvel', 'Marvel', 'Películas, personajes y novedades de Marvel.'),
    ('mcu', 'MCU', 'Universo Cinematográfico de Marvel.'),
    ('cine', 'Cine', 'Estrenos, guías y cultura cinematográfica.'),
    ('spider-man', 'Spider-Man', 'Historias y películas de Spider-Man.')
  on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      is_active = true,
      updated_at = now();

  delete from public.article_tags where article_id = articulo_id;

  insert into public.article_tags (article_id, tag_id, created_by)
  select articulo_id, id, autor_id
  from public.editorial_tags
  where slug in ('marvel', 'mcu', 'cine', 'spider-man');

  update public.article_versions
  set
    snapshot = snapshot || jsonb_build_object(
      'tagIds', (
        select coalesce(jsonb_agg(id), '[]'::jsonb)
        from public.editorial_tags
        where slug in ('marvel', 'mcu', 'cine', 'spider-man')
      ),
      'labelIds', '[]'::jsonb
    ),
    change_note = 'Borrador investigado y estructurado para el nuevo flujo editorial.'
  where id = (
    select id
    from public.article_versions
    where article_id = articulo_id
    order by version_number desc
    limit 1
  );

  raise notice 'Borrador creado: %', articulo_id;
end;
$$;
