create index if not exists editorial_search_console_reports_imported_by_idx
  on public.editorial_search_console_reports (imported_by);

create index if not exists editorial_search_console_triage_updated_by_idx
  on public.editorial_search_console_triage (updated_by);
