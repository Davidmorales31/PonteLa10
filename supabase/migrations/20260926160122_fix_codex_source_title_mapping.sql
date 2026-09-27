-- Corresponds to remote migration 20260926160122.
begin;

do $$
declare
  v_definition text;
  v_old text := 'source ->> ''title'',';
  v_new text := 'source ->> ''titulo'',';
begin
  select pg_get_functiondef(
    'public.submit_codex_editorial_proposal(jsonb)'::regprocedure
  ) into v_definition;

  if position(v_old in v_definition) = 0
    or position(v_old in substring(v_definition from position(v_old in v_definition) + length(v_old))) > 0 then
    raise exception 'No se encontró exactamente una asignación de título de fuente para corregir.';
  end if;

  execute replace(v_definition, v_old, v_new);
end;
$$;

commit;
