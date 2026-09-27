begin;

alter table public.editorial_publication_slot_policy
  drop constraint if exists editorial_publication_slot_policy_interval_minutes_check;
alter table public.editorial_publication_slot_policy
  add constraint editorial_publication_slot_policy_interval_minutes_check
  check (interval_minutes between 15 and 1440);

update public.editorial_publication_slot_policy
set interval_minutes = 15, updated_at = now()
where policy_key = 'default';

-- Conserva intactas las comprobaciones de permisos/MFA/transición de HU-ED-12;
-- solo reduce el límite que el procedimiento valida al reservar el siguiente slot.
do $$
declare
  v_function text := pg_catalog.pg_get_functiondef(
    'public.approve_and_schedule_editorial_article(uuid, integer, boolean)'::regprocedure
  );
  v_guard text := 'v_interval < 30 or v_interval > 1440';
begin
  if pg_catalog.strpos(v_function, v_guard) = 0 then
    raise exception 'No se encontró el guard de intervalo esperado en HU-ED-12.';
  end if;
  execute pg_catalog.replace(v_function, v_guard, 'v_interval < 15 or v_interval > 1440');
end;
$$;

commit;
