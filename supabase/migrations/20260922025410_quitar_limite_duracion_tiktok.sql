begin;

create or replace function private.validate_evidence_payload(payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  duration_seconds numeric;
begin
  if jsonb_typeof(payload) <> 'object'
    or payload ->> 'versionContrato' <> '1'
    or jsonb_typeof(payload -> 'metadatos') <> 'object'
    or payload #>> '{metadatos,plataforma}' <> 'tiktok'
    or jsonb_typeof(payload #> '{metadatos,duracionSegundos}') <> 'number'
    or jsonb_typeof(payload -> 'original') <> 'object'
    or payload #>> '{original,motor}' <> 'faster-whisper'
    or payload #>> '{original,idioma}' not in ('es', 'en')
    or jsonb_typeof(payload #> '{original,segmentos}') <> 'array'
    or jsonb_typeof(payload #> '{verificacion,fuentesIndependientes}') <> 'array'
    or jsonb_typeof(payload -> 'advertencias') <> 'array' then
    return false;
  end if;

  duration_seconds := (payload #>> '{metadatos,duracionSegundos}')::numeric;

  return duration_seconds > 0
    and jsonb_array_length(payload #> '{original,segmentos}') between 1 and 2000
    and (
      (payload #>> '{original,idioma}' = 'es' and payload -> 'traduccion' = 'null'::jsonb)
      or (
        payload #>> '{original,idioma}' = 'en'
        and jsonb_typeof(payload -> 'traduccion') = 'object'
        and payload #>> '{traduccion,idioma}' = 'es'
        and payload #>> '{traduccion,proveedor}' = 'deepseek'
        and jsonb_typeof(payload #> '{traduccion,segmentos}') = 'array'
        and jsonb_array_length(payload #> '{traduccion,segmentos}') =
            jsonb_array_length(payload #> '{original,segmentos}')
      )
    )
    and payload #>> '{verificacion,estado}' = 'pendiente'
    and jsonb_array_length(payload #> '{verificacion,fuentesIndependientes}') = 0
    and payload #>> '{limpieza,completada}' = 'true'
    and payload #>> '{limpieza,archivosTemporalesRestantes}' = '0';
exception
  when others then
    return false;
end;
$$;

commit;
