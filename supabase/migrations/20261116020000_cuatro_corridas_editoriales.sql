begin;

-- Dos agentes publican con el enfoque de fútbol colombiano: Codex a las 08:00 y
-- 15:00, Claude a las 11:30 y 19:30 (America/Bogota). Cada activación reserva
-- una identidad de corrida, así que el tope diario pasa de dos a cuatro.
-- Ajuste acotado sobre la definición vigente; abortar si cambió el contrato.
do $$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('public.get_codex_editorial_context(uuid)'::regprocedure);
  if strpos(v_def, 'v_runs_today >= 4') > 0 then
    return;
  end if;
  if strpos(v_def, 'v_runs_today >= 2') = 0 then
    raise exception 'Revisar límite de corridas vigente.';
  end if;
  execute replace(replace(v_def, 'v_runs_today >= 2', 'v_runs_today >= 4'), 'dos corridas', 'cuatro corridas');
end;
$$;

commit;
