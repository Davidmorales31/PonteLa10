-- HU-TR-19: nationality is public only when an operator has recorded its source
-- and verification timestamp. No table-level/public write privilege is added.
alter table public.sports_players
  add column nationality_source_url text,
  add column nationality_verified_at timestamptz,
  add constraint sports_players_nationality_evidence_pair check (
    (nationality_source_url is null and nationality_verified_at is null)
    or (
      country_code is not null
      and nationality_source_url is not null
      and nationality_source_url ~ '^https://[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*(/[A-Za-z0-9._~!$&()*+,;=:@%/-]*)?$'
      and char_length(nationality_source_url) <= 2048
      and nationality_verified_at is not null
    )
  );

comment on column public.sports_players.nationality_source_url is
  'Fuente HTTPS revisada para la nacionalidad; poblarla solo tras verificación editorial.';
comment on column public.sports_players.nationality_verified_at is
  'Fecha de revisión humana de la fuente de nacionalidad.';

-- The source remains internal to curation; only its verification timestamp is public.
grant select (nationality_verified_at)
  on public.sports_players to anon, authenticated;
