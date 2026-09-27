-- Corresponds to remote migration 20260926160308.
begin;

do $$
declare
  v_definition text;
  v_old text := 'public.digest(';
  v_new text := 'extensions.digest(';
begin
  select pg_get_functiondef(
    'public.submit_codex_editorial_proposal(jsonb)'::regprocedure
  ) into v_definition;

  if position(v_old in v_definition) = 0
    or position(v_old in substring(v_definition from position(v_old in v_definition) + length(v_old))) > 0 then
    raise exception 'No se encontró exactamente una llamada a digest para corregir.';
  end if;

  execute replace(v_definition, v_old, v_new);
end;
$$;

commit;
