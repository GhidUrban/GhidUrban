-- Populate new tables from existing places data.

insert into public.place_google_data (
    place_id, city_slug, category_slug,
    google_place_id, google_match_status, google_match_score,
    google_maps_uri, google_photo_uri, google_photo_name,
    google_hours_raw, google_hours_text, synced_at
)
select
    place_id, city_slug, category_slug,
    google_place_id, google_match_status, google_match_score,
    google_maps_uri, google_photo_uri, google_photo_name,
    google_hours_raw, google_hours_text, now()
from public.places
on conflict (place_id, city_slug, category_slug) do nothing;

insert into public.place_listings (
    place_id, city_slug, category_slug,
    plan_type, plan_expires_at, featured, featured_until,
    external_source, external_place_id
)
select
    place_id, city_slug, category_slug,
    coalesce(plan_type, 'free'), plan_expires_at,
    coalesce(featured, false), featured_until,
    external_source, external_place_id
from public.places
on conflict (place_id, city_slug, category_slug) do nothing;
