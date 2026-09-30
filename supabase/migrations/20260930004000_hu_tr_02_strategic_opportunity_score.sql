-- HU-TR-02: amplía el candidato JSON sin crear un motor de agenda paralelo.
begin;

do $migration$
declare
  definicion text;
  funcion_oid oid := 'public.save_codex_editorial_agenda(uuid, jsonb, text)'::regprocedure;
  ancla text := 'or (select count(*) from jsonb_object_keys(v_opportunity -> ''scores'')) <> 4';
  validaciones text := $$
or (select count(*) from jsonb_object_keys(v_opportunity -> 'scores')) <> 10
        or coalesce(v_opportunity ->> 'contentIntent', '') not in ('search_utility', 'breaking', 'explainer', 'evergreen', 'data_story', 'special', 'opinion', 'game_support', 'social_first', 'update')
        or coalesce(v_opportunity ->> 'strategicScoreVersion', '') <> 'v1'
        or coalesce(v_opportunity ->> 'strategicScore', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity ->> 'strategicScore')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'searchDemand', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'searchDemand')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'lifespan', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'lifespan')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'socialPotential', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'socialPotential')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'interactivePotential', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'interactivePotential')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'firstPartyData', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'firstPartyData')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'competitionOpportunity', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'competitionOpportunity')::integer not between 0 and 100$$;
begin
  select pg_catalog.pg_get_functiondef(funcion_oid) into definicion;
  if definicion is null or position(ancla in definicion) = 0 then
    raise exception 'La función de agenda no coincide con el contrato esperado.';
  end if;
  definicion := replace(definicion, ancla, validaciones);
  if position('jsonb_object_keys(v_opportunity -> ''scores'')) <> 10' in definicion) = 0
    or position('v_opportunity ->> ''strategicScore''' in definicion) = 0 then
    raise exception 'No se pudo extender la validación del score estratégico.';
  end if;
  execute definicion;
end;
$migration$;

commit;
