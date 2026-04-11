-- At most one row per Google place id within the same city + category (same venue may repeat
-- across categories, e.g. cultural + evenimente).
-- Replaces places_google_place_id_unique when present.

drop index if exists public.places_google_place_id_unique;

create unique index if not exists places_google_city_category_unique
  on public.places (google_place_id, city_slug, category_slug)
  where google_place_id is not null and btrim(google_place_id) <> '';
