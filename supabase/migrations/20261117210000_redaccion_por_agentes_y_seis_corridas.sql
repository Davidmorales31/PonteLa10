begin;

-- Decisión del responsable (2026-11-17):
--   1. Los agentes (Claude y Codex) pueden redactar el cuerpo ellos mismos; se
--      retira la obligación de una generación DeepSeek completada. La revisión
--      declara `writer` = 'agent' y la auditoría registra quién redactó.
--   2. El tope de corridas editoriales por día pasa de cuatro a seis.
-- Se parchea la definición vigente con anclas exactas (mismo estilo que
-- 20261116020000_cuatro_corridas_editoriales): si el contrato cambió, aborta.

create or replace function pg_temp.parchear_una_vez(p_def text, p_ancla text, p_nuevo text)
returns text language plpgsql as $$
declare
  v_veces integer;
begin
  v_veces := (length(p_def) - length(replace(p_def, p_ancla, ''))) / length(p_ancla);
  if v_veces <> 1 then
    raise exception 'Ancla no encontrada o repetida (%): revisar contrato vigente.', left(p_ancla, 60);
  end if;
  return replace(p_def, p_ancla, p_nuevo);
end;
$$;

do $$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('public.submit_and_schedule_codex_proposal(jsonb,jsonb,jsonb)'::regprocedure);
  if strpos(v_def, $m$'writer'$m$) = 0 then
    v_def := pg_temp.parchear_una_vez(v_def,
      $a$or char_length(coalesce(p_review ->> 'notes','')) not between 30 and 1000$a$,
      $a$or char_length(coalesce(p_review ->> 'notes','')) not between 30 and 1000
    or coalesce(p_review ->> 'writer','deepseek') not in ('deepseek','agent')$a$);
    v_def := pg_temp.parchear_una_vez(v_def,
      $a$if not found or v_generation.status <> 'completed'$a$,
      $a$if coalesce(p_review ->> 'writer','deepseek') = 'deepseek' and (not found or v_generation.status <> 'completed'$a$);
    v_def := pg_temp.parchear_una_vez(v_def,
      $a$or v_generation.result -> 'briefSeo' is distinct from p_brief then$a$,
      $a$or v_generation.result -> 'briefSeo' is distinct from p_brief) then$a$);
    v_def := pg_temp.parchear_una_vez(v_def,
      $a$'writerProvider','deepseek'$a$,
      $a$'writerProvider',coalesce(p_review ->> 'writer','deepseek')$a$);
    execute v_def;
  end if;
end;
$$;

do $$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('public.get_codex_editorial_context(uuid)'::regprocedure);
  if strpos(v_def, 'v_runs_today >= 6') > 0 then
    return;
  end if;
  if strpos(v_def, 'v_runs_today >= 4') = 0 then
    raise exception 'Revisar límite de corridas vigente.';
  end if;
  execute replace(replace(v_def, 'v_runs_today >= 4', 'v_runs_today >= 6'), 'cuatro corridas', 'seis corridas');
end;
$$;

commit;
