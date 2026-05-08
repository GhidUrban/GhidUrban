-- Gallery images (Supabase Storage public URLs). Cover also mirrored on places.image_storage_path[0].

create table if not exists public.place_photos (
    place_id       text not null,
    city_slug      text not null,
    category_slug  text not null,
    sort_order     smallint not null,
    storage_path   text not null,
    created_at     timestamptz default now(),
    primary key (place_id, city_slug, category_slug, sort_order),
    foreign key (place_id, city_slug, category_slug)
        references public.places(place_id, city_slug, category_slug)
        on delete cascade,
    constraint place_photos_sort_order_range check (sort_order >= 0 and sort_order <= 2)
);

create index if not exists place_photos_place_key_idx
    on public.place_photos (place_id, city_slug, category_slug);

alter table public.place_photos enable row level security;

create policy "place_photos_select_public"
    on public.place_photos for select using (true);
create policy "place_photos_insert_authenticated"
    on public.place_photos for insert to authenticated with check (true);
create policy "place_photos_update_authenticated"
    on public.place_photos for update to authenticated using (true) with check (true);
create policy "place_photos_delete_authenticated"
    on public.place_photos for delete to authenticated using (true);
