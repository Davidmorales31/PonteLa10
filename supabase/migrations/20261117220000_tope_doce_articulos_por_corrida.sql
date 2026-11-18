begin;

-- Con la redacción por agentes (writer = 'agent') ya no hay una generación
-- DeepSeek por pieza, así que el servidor limita cuántos artículos puede aprobar
-- y programar una misma corrida. La meta editorial es de 8 a 12 por corrida.
-- Se parchea la definición vigente con un ancla exacta (aborta si cambió el
-- contrato) y es idempotente. El conteo ocurre después de bloquear la fila de la
-- corrida (`for update`), así que dos envíos simultáneos no pueden saltarse el tope.
-- Los reenvíos idempotentes de una clave ya aprobada se resuelven antes y no cuentan.

do $$
declare
  v_def text;
  v_ancla constant text := $a$if not found then raise exception 'La corrida no está activa para hoy.' using errcode='22023'; end if;$a$;
  v_veces integer;
begin
  v_def := pg_get_functiondef('public.submit_and_schedule_codex_proposal(jsonb,jsonb,jsonb)'::regprocedure);
  if strpos(v_def, 'máximo de 12 artículos') > 0 then
    return;
  end if;
  v_veces := (length(v_def) - length(replace(v_def, v_ancla, ''))) / length(v_ancla);
  if v_veces <> 1 then
    raise exception 'Ancla de corrida activa no encontrada o repetida: revisar contrato vigente.';
  end if;
  execute replace(v_def, v_ancla, v_ancla || $n$
  if (select count(*) from public.editorial_codex_ai_approvals where run_id = v_run) >= 12 then
    raise exception 'La corrida alcanzó el máximo de 12 artículos aprobados.' using errcode='22023';
  end if;$n$);
end;
$$;

commit;
