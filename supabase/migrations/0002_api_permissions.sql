grant usage on schema public to anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant select on public.media_files to anon, authenticated;
grant select on public.special_modules to anon, authenticated;

grant select, insert, update, delete on public.user_profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.media_files to authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant select, insert, update, delete on public.social_publications to authenticated;
grant select, insert, update, delete on public.special_modules to authenticated;

grant execute on function public.has_role(text) to anon, authenticated;
grant execute on function public.can_edit_content() to anon, authenticated;
