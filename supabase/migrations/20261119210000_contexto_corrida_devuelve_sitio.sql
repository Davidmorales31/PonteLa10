begin;

-- El contexto de la corrida devuelve su sitio: así el servidor responde con la política del
-- sitio correcto también al reanudar una corrida existente.
do $$
declare
  v_def text;
  v_ancla constant text := $a$'runDate', v_run.run_date,$a$;
  v_veces integer;
begin
  v_def := pg_catalog.pg_get_functiondef('public.get_codex_editorial_context(uuid,text)'::regprocedure);
  if pg_catalog.strpos(v_def, $m$'site', v_run.site$m$) > 0 then
    return;
  end if;
  v_veces := (pg_catalog.length(v_def) - pg_catalog.length(pg_catalog.replace(v_def, v_ancla, ''))) / pg_catalog.length(v_ancla);
  if v_veces <> 1 then
    raise exception 'Ancla de runDate no encontrada o repetida: revisar contrato vigente.';
  end if;
  execute pg_catalog.replace(v_def, v_ancla, v_ancla || $n$ 'site', v_run.site,$n$);
end;
$$;

commit;
