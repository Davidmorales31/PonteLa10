-- Añade índices de soporte para las claves foráneas señaladas por Database Advisors.
create index if not exists football_fixtures_fixture_id_idx
  on public.football_fixtures_today (fixture_id);

create index if not exists football_standings_competition_id_idx
  on public.football_standings_today (competition_id);
