begin;

-- Los endpoints públicos usan exclusivamente el rol anon, sin cookies editoriales.
-- Los gestores conservan lectura y escritura mediante la policy FOR ALL con MFA.
drop policy if exists "broadcast managers can read all options with mfa"
  on public.colombian_match_broadcast_options;
drop policy if exists "public can read confirmed match broadcast options"
  on public.colombian_match_broadcast_options;
create policy "public can read confirmed match broadcast options"
  on public.colombian_match_broadcast_options for select to anon
  using (
    status = 'confirmed'
    and verified_at is not null
    and exists (
      select 1
      from public.colombian_league_fixtures as fixture
      where fixture.competition_slug = colombian_match_broadcast_options.fixture_competition_slug
        and fixture.season = colombian_match_broadcast_options.fixture_season
        and fixture.provider = colombian_match_broadcast_options.fixture_provider
        and fixture.provider_fixture_id = colombian_match_broadcast_options.provider_fixture_id
        and fixture.is_public
        and fixture.publication_rights_confirmed
    )
  );

create index if not exists colombian_match_broadcast_fixture_idx
  on public.colombian_match_broadcast_options (
    fixture_competition_slug, fixture_season, fixture_provider, provider_fixture_id
  );
create index if not exists colombian_match_broadcast_verified_by_idx
  on public.colombian_match_broadcast_options (verified_by);

commit;
