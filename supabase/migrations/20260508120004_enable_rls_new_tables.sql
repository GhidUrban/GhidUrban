-- RLS on new tables: public read, authenticated write.

alter table public.place_google_data enable row level security;
alter table public.place_listings enable row level security;

create policy "place_google_data_select_public"
    on public.place_google_data for select using (true);
create policy "place_google_data_insert_authenticated"
    on public.place_google_data for insert to authenticated with check (true);
create policy "place_google_data_update_authenticated"
    on public.place_google_data for update to authenticated using (true) with check (true);
create policy "place_google_data_delete_authenticated"
    on public.place_google_data for delete to authenticated using (true);

create policy "place_listings_select_public"
    on public.place_listings for select using (true);
create policy "place_listings_insert_authenticated"
    on public.place_listings for insert to authenticated with check (true);
create policy "place_listings_update_authenticated"
    on public.place_listings for update to authenticated using (true) with check (true);
create policy "place_listings_delete_authenticated"
    on public.place_listings for delete to authenticated using (true);
