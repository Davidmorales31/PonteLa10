-- Sube el máximo de programaciones por 24 horas de una llave de agentes de redes de 50 a 200 (decisión del responsable,
-- 2026-11-22: quiere poder programar 100 publicaciones al día o más). La cuota se cuenta en el registro de auditoría
-- `social.agent.scheduled` de las últimas 24 horas (incluye las programaciones canceladas), por eso se deja margen.
-- Reversible: volver a `between 0 and 50` (antes, bajar las llaves que superen 50) y restaurar la cuota de la llave.
alter table public.social_agent_keys drop constraint if exists social_agent_keys_max_schedules_per_day_check;
alter table public.social_agent_keys add constraint social_agent_keys_max_schedules_per_day_check
  check (max_schedules_per_day between 0 and 200);

-- La llave operativa de las corridas editoriales («Sin limites») estaba en el tope anterior.
update public.social_agent_keys
  set max_schedules_per_day = 200
  where name = 'Sin limites' and revoked_at is null and max_schedules_per_day = 50;
