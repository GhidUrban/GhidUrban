-- place_google_data: all Google-related sync data, 1:1 with places.

create table if not exists public.place_google_data (
    place_id       text not null,
    city_slug      text not null,
    category_slug  text not null,
    google_place_id    text,
    google_match_status text,
    google_match_score  double precision,
    google_maps_uri    text,
    google_photo_uri   text,
    google_photo_name  text,
    google_hours_raw   jsonb,
    google_hours_text  text,
    synced_at      timestamptz,
    primary key (place_id, city_slug, category_slug),
    foreign key (place_id, city_slug, category_slug)
        references public.places(place_id, city_slug, category_slug)
        on delete cascade
);

create unique index if not exists place_google_data_gid_city_cat_unique
    on public.place_google_data (google_place_id, city_slug, category_slug)
    where google_place_id is not null and btrim(google_place_id) <> '';
