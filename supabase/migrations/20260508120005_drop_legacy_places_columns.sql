-- Remove listing + Google fields from public.places after app reads merge
-- place_listings + place_google_data (deploy app merges first; ensure backfill ran).

drop index if exists public.places_google_city_category_unique;

alter table public.places
    drop constraint if exists places_plan_type_check;

alter table public.places
    drop column if exists featured,
    drop column if exists featured_until,
    drop column if exists plan_type,
    drop column if exists plan_expires_at,
    drop column if exists external_source,
    drop column if exists external_place_id,
    drop column if exists google_place_id,
    drop column if exists google_match_status,
    drop column if exists google_match_score,
    drop column if exists google_maps_uri,
    drop column if exists google_photo_uri,
    drop column if exists google_photo_name,
    drop column if exists google_hours_raw,
    drop column if exists google_hours_text;
