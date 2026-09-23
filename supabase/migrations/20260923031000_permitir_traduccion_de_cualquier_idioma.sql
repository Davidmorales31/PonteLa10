begin;

-- El transcriptor puede identificar más idiomas que español e inglés. La
-- evidencia siempre termina en español: cualquier idioma distinto de "es"
-- debe incluir su traducción estructurada de DeepSeek.
alter table public.editorial_ingestions
  drop constraint if exists editorial_ingestions_source_language_check;

alter table public.editorial_ingestions
  add constraint editorial_ingestions_source_language_check
  check (source_language is null or source_language ~ '^[a-z]{2,3}(-[A-Z]{2})?$');

create or replace function private.validate_evidence_payload(payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  duration_seconds numeric;
  source_language text;
begin
  source_language := payload #>> '{original,idioma}';

  if jsonb_typeof(payload) <> 'object'
    or payload ->> 'versionContrato' <> '1'
    or jsonb_typeof(payload -> 'metadatos') <> 'object'
    or payload #>> '{metadatos,plataforma}' <> 'tiktok'
    or jsonb_typeof(payload #> '{metadatos,duracionSegundos}') <> 'number'
    or jsonb_typeof(payload -> 'original') <> 'object'
    or payload #>> '{original,motor}' <> 'faster-whisper'
    or source_language !~ '^[a-z]{2,3}(-[A-Z]{2})?$'
    or jsonb_typeof(payload #> '{original,segmentos}') <> 'array'
    or jsonb_typeof(payload #> '{verificacion,fuentesIndependientes}') <> 'array'
    or jsonb_typeof(payload -> 'advertencias') <> 'array' then
    return false;
  end if;

  duration_seconds := (payload #>> '{metadatos,duracionSegundos}')::numeric;

  return duration_seconds > 0
    and jsonb_array_length(payload #> '{original,segmentos}') between 1 and 2000
    and (
      (source_language = 'es' and payload -> 'traduccion' = 'null'::jsonb)
      or (
        source_language <> 'es'
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
